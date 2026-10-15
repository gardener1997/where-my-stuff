use sqlx::SqlitePool;

use crate::error::AppResult;
use crate::models::{
    item::ItemSummary,
    search::{SearchHit, SearchQuery, SearchResult, Stats},
};

pub async fn search(pool: &SqlitePool, query: &SearchQuery) -> AppResult<SearchResult> {
    let page = query.page.unwrap_or(1).max(1);
    let size = query.size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * size;

    let q = query.q.trim();
    let use_like = q.chars().count() < 3;

    let (total, rows) = if use_like {
        search_like(pool, q, query, size, offset).await?
    } else {
        search_fts(pool, q, query, size, offset).await?
    };

    let mut items = vec![];
    for row in rows {
        let container_path = match &row.container_id {
            Some(cid) => super::container::get_path(pool, cid).await?,
            None => vec![],
        };

        let highlight = {
            let mut parts = vec![];
            if let Some(ref s) = row.name_snippet {
                if s.contains("<mark>") {
                    parts.push(s.clone());
                }
            }
            if let Some(ref s) = row.desc_snippet {
                if s.contains("<mark>") {
                    parts.push(s.clone());
                }
            }
            if parts.is_empty() {
                row.description.clone().map(|d| {
                    if d.chars().count() > 80 {
                        d.chars().take(80).collect::<String>() + "…"
                    } else {
                        d
                    }
                })
            } else {
                Some(parts.join(" … "))
            }
        };

        items.push(SearchHit {
            item: ItemSummary {
                id: row.id,
                name: row.name,
                description: row.description,
                source_type: row.source_type,
                category_id: row.category_id,
                category_name: row.category_name,
                container_id: row.container_id,
                container_path,
                thumb_path: row.thumb_path,
                created_at: row.created_at,
            },
            highlight,
        });
    }

    Ok(SearchResult {
        items,
        total,
        page,
        size,
    })
}

fn extra_where(query: &SearchQuery) -> String {
    let mut conditions = vec!["1=1".to_string()];
    if query.category_id.is_some() {
        conditions.push("i.category_id = ?".into());
    }
    if query.container_id.is_some() {
        conditions.push("i.container_id = ?".into());
    }
    if query.source_type.is_some() {
        conditions.push("i.source_type = ?".into());
    }
    conditions.join(" AND ")
}

async fn search_like(
    pool: &SqlitePool,
    q: &str,
    query: &SearchQuery,
    size: i64,
    offset: i64,
) -> AppResult<(i64, Vec<SearchRow>)> {
    let like = format!("%{q}%");
    let where_clause = extra_where(query);

    let count_sql = format!(
        "SELECT COUNT(*) FROM items i
         LEFT JOIN containers ct ON ct.id = i.container_id
         LEFT JOIN categories c ON c.id = i.category_id
         WHERE (i.name LIKE ? OR i.description LIKE ? OR ct.name LIKE ? OR ct.label LIKE ? OR c.name LIKE ?)
         AND {where_clause}"
    );
    let mut count_q = sqlx::query_scalar::<_, i64>(&count_sql);
    for _ in 0..5 {
        count_q = count_q.bind(&like);
    }
    if let Some(ref cid) = query.category_id {
        count_q = count_q.bind(cid);
    }
    if let Some(ref cid) = query.container_id {
        count_q = count_q.bind(cid);
    }
    if let Some(ref st) = query.source_type {
        count_q = count_q.bind(st);
    }
    let total = count_q.fetch_one(pool).await?;

    let list_sql = format!(
        "SELECT i.id, i.name, i.description, i.source_type,
                i.category_id, c.name as category_name,
                i.container_id,
                (SELECT thumb_path FROM item_images WHERE item_id = i.id ORDER BY sort_order LIMIT 1) as thumb_path,
                i.created_at,
                NULL as name_snippet, NULL as desc_snippet
         FROM items i
         LEFT JOIN containers ct ON ct.id = i.container_id
         LEFT JOIN categories c ON c.id = i.category_id
         WHERE (i.name LIKE ? OR i.description LIKE ? OR ct.name LIKE ? OR ct.label LIKE ? OR c.name LIKE ?)
         AND {where_clause}
         ORDER BY i.created_at DESC
         LIMIT ? OFFSET ?"
    );
    let mut list_q = sqlx::query_as::<_, SearchRow>(&list_sql);
    for _ in 0..5 {
        list_q = list_q.bind(&like);
    }
    if let Some(ref cid) = query.category_id {
        list_q = list_q.bind(cid);
    }
    if let Some(ref cid) = query.container_id {
        list_q = list_q.bind(cid);
    }
    if let Some(ref st) = query.source_type {
        list_q = list_q.bind(st);
    }
    let rows = list_q.bind(size).bind(offset).fetch_all(pool).await?;

    Ok((total, rows))
}

async fn search_fts(
    pool: &SqlitePool,
    q: &str,
    query: &SearchQuery,
    size: i64,
    offset: i64,
) -> AppResult<(i64, Vec<SearchRow>)> {
    let fts_query = format!("\"{q}\"");
    let where_clause = extra_where(query);

    let count_sql = format!(
        "SELECT COUNT(*) FROM items_fts f
         JOIN items i ON i.id = f.item_id
         WHERE items_fts MATCH ? AND {where_clause}"
    );
    let mut count_q = sqlx::query_scalar::<_, i64>(&count_sql);
    count_q = count_q.bind(&fts_query);
    if let Some(ref cid) = query.category_id {
        count_q = count_q.bind(cid);
    }
    if let Some(ref cid) = query.container_id {
        count_q = count_q.bind(cid);
    }
    if let Some(ref st) = query.source_type {
        count_q = count_q.bind(st);
    }
    let total = count_q.fetch_one(pool).await?;

    let list_sql = format!(
        "SELECT i.id, i.name, i.description, i.source_type,
                i.category_id, c.name as category_name,
                i.container_id,
                (SELECT thumb_path FROM item_images WHERE item_id = i.id ORDER BY sort_order LIMIT 1) as thumb_path,
                i.created_at,
                snippet(items_fts, 1, '<mark>', '</mark>', '…', 20) as name_snippet,
                snippet(items_fts, 2, '<mark>', '</mark>', '…', 32) as desc_snippet
         FROM items_fts f
         JOIN items i ON i.id = f.item_id
         LEFT JOIN categories c ON c.id = i.category_id
         WHERE items_fts MATCH ? AND {where_clause}
         ORDER BY rank
         LIMIT ? OFFSET ?"
    );
    let mut list_q = sqlx::query_as::<_, SearchRow>(&list_sql);
    list_q = list_q.bind(&fts_query);
    if let Some(ref cid) = query.category_id {
        list_q = list_q.bind(cid);
    }
    if let Some(ref cid) = query.container_id {
        list_q = list_q.bind(cid);
    }
    if let Some(ref st) = query.source_type {
        list_q = list_q.bind(st);
    }
    let rows = list_q.bind(size).bind(offset).fetch_all(pool).await?;

    Ok((total, rows))
}

#[derive(sqlx::FromRow)]
struct SearchRow {
    id: String,
    name: String,
    description: Option<String>,
    source_type: String,
    category_id: Option<String>,
    category_name: Option<String>,
    container_id: Option<String>,
    thumb_path: Option<String>,
    created_at: String,
    name_snippet: Option<String>,
    desc_snippet: Option<String>,
}

pub async fn stats(pool: &SqlitePool) -> AppResult<Stats> {
    let total_items = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM items")
        .fetch_one(pool)
        .await?;
    let total_containers = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM containers")
        .fetch_one(pool)
        .await?;
    let total_categories = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM categories")
        .fetch_one(pool)
        .await?;
    let total_tags = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM tags")
        .fetch_one(pool)
        .await?;

    Ok(Stats {
        total_items,
        total_containers,
        total_categories,
        total_tags,
    })
}
