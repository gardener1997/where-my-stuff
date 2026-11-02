use sqlx::SqlitePool;

use crate::error::AppResult;
use crate::models::{
    container::PathSegment,
    item::ItemSummary,
    search::{SearchHit, SearchQuery, SearchResult, Stats},
};

/// Matches a LIKE pattern against the item's container and all of its ancestors.
const CONTAINER_PATH_LIKE: &str = "EXISTS (
    WITH RECURSIVE anc(id, name, parent_id) AS (
        SELECT c.id, c.name, c.parent_id
          FROM containers c
         WHERE c.id = i.container_id
        UNION ALL
        SELECT c.id, c.name, c.parent_id
          FROM containers c
          JOIN anc ON anc.parent_id = c.id
    )
    SELECT 1 FROM anc WHERE anc.name LIKE ? ESCAPE '\\'
)";

/// Matches a LIKE pattern against the item's category and all of its ancestors.
const CATEGORY_PATH_LIKE: &str = "EXISTS (
    WITH RECURSIVE anc(id, name, parent_id) AS (
        SELECT c.id, c.name, c.parent_id
          FROM categories c
         WHERE c.id = i.category_id
        UNION ALL
        SELECT c.id, c.name, c.parent_id
          FROM categories c
          JOIN anc ON anc.parent_id = c.id
    )
    SELECT 1 FROM anc WHERE anc.name LIKE ? ESCAPE '\\'
)";

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

        let highlight = build_highlight(&row, q, &container_path);

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
    let like = format!("%{}%", escape_like(q));
    let where_clause = extra_where(query);

    let filter = format!(
        "WHERE (i.name LIKE ? ESCAPE '\\'
            OR i.description LIKE ? ESCAPE '\\'
            OR i.location_note LIKE ? ESCAPE '\\'
            OR ct.label LIKE ? ESCAPE '\\'
            OR {CONTAINER_PATH_LIKE}
            OR {CATEGORY_PATH_LIKE})
         AND {where_clause}"
    );

    let count_sql = format!(
        "SELECT COUNT(*) FROM items i
         LEFT JOIN containers ct ON ct.id = i.container_id
         LEFT JOIN categories c ON c.id = i.category_id
         {filter}"
    );
    let mut count_q = sqlx::query_scalar::<_, i64>(&count_sql);
    for _ in 0..LIKE_BIND_COUNT {
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
                i.created_at, i.location_note,
                (WITH RECURSIVE anc(id, name, parent_id, depth) AS (
                     SELECT cc.id, cc.name, cc.parent_id, 0
                       FROM categories cc
                      WHERE cc.id = i.category_id
                     UNION ALL
                     SELECT cc.id, cc.name, cc.parent_id, anc.depth + 1
                       FROM categories cc
                       JOIN anc ON anc.parent_id = cc.id
                 )
                 SELECT group_concat(name, ' ') FROM (SELECT name FROM anc ORDER BY depth DESC)) as category_path,
                NULL as name_snippet, NULL as desc_snippet, NULL as note_snippet
         FROM items i
         LEFT JOIN containers ct ON ct.id = i.container_id
         LEFT JOIN categories c ON c.id = i.category_id
         {filter}
         ORDER BY i.created_at DESC
         LIMIT ? OFFSET ?"
    );
    let mut list_q = sqlx::query_as::<_, SearchRow>(&list_sql);
    for _ in 0..LIKE_BIND_COUNT {
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

/// Number of `?` placeholders fed by the LIKE pattern in `search_like`.
const LIKE_BIND_COUNT: usize = 6;

async fn search_fts(
    pool: &SqlitePool,
    q: &str,
    query: &SearchQuery,
    size: i64,
    offset: i64,
) -> AppResult<(i64, Vec<SearchRow>)> {
    // FTS5 string literals are double-quoted; an embedded `"` must be doubled,
    // otherwise the query syntax is invalid and SQLite returns an error.
    let fts_query = format!("\"{}\"", q.replace('"', "\"\""));
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
                i.created_at, i.location_note,
                (WITH RECURSIVE anc(id, name, parent_id, depth) AS (
                     SELECT cc.id, cc.name, cc.parent_id, 0
                       FROM categories cc
                      WHERE cc.id = i.category_id
                     UNION ALL
                     SELECT cc.id, cc.name, cc.parent_id, anc.depth + 1
                       FROM categories cc
                       JOIN anc ON anc.parent_id = cc.id
                 )
                 SELECT group_concat(name, ' ') FROM (SELECT name FROM anc ORDER BY depth DESC)) as category_path,
                snippet(items_fts, 1, '<mark>', '</mark>', '…', 20) as name_snippet,
                snippet(items_fts, 2, '<mark>', '</mark>', '…', 32) as desc_snippet,
                snippet(items_fts, 3, '<mark>', '</mark>', '…', 32) as note_snippet
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

/// Highlight shown under a search result. FTS hits come with `snippet()` output;
/// LIKE hits (queries shorter than 3 chars) are highlighted here instead.
fn build_highlight(row: &SearchRow, q: &str, container_path: &[PathSegment]) -> Option<String> {
    let mut parts = vec![];
    for snippet in [&row.name_snippet, &row.desc_snippet, &row.note_snippet] {
        if let Some(s) = snippet {
            if s.contains("<mark>") {
                parts.push(escape_snippet(s));
            }
        }
    }
    if !parts.is_empty() {
        return Some(parts.join(" … "));
    }

    if let Some(hit) = marked_snippet(&row.name, q) {
        return Some(hit);
    }
    for text in [&row.description, &row.location_note] {
        if let Some(hit) = text.as_deref().and_then(|t| marked_snippet(t, q)) {
            return Some(hit);
        }
    }
    let path = container_path
        .iter()
        .map(|segment| segment.name.as_str())
        .collect::<Vec<_>>()
        .join(" ");
    if let Some(hit) = marked_snippet(&path, q) {
        return Some(hit);
    }
    let category = row.category_path.as_deref().or(row.category_name.as_deref());
    if let Some(hit) = category.and_then(|name| marked_snippet(name, q)) {
        return Some(hit);
    }

    row.description.as_deref().map(|d| truncate_text(d, 80))
}

/// Build a `<mark>`-wrapped excerpt around the first match of `needle` in `text`.
fn marked_snippet(text: &str, needle: &str) -> Option<String> {
    const BEFORE: usize = 16;
    const AFTER: usize = 48;

    if needle.is_empty() {
        return None;
    }
    let start = find_ci(text, needle)?;
    let end = start + needle.len();

    let head = &text[..start];
    let tail = &text[end..];
    let head_truncated = head.chars().count() > BEFORE;
    let tail_truncated = tail.chars().count() > AFTER;

    let before: String = head
        .chars()
        .rev()
        .take(BEFORE)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect();
    let after: String = tail.chars().take(AFTER).collect();

    let mut out = String::new();
    if head_truncated {
        out.push('…');
    }
    out.push_str(&escape_html(&before));
    out.push_str("<mark>");
    out.push_str(&escape_html(&text[start..end]));
    out.push_str("</mark>");
    out.push_str(&escape_html(&after));
    if tail_truncated {
        out.push('…');
    }
    Some(out)
}

fn truncate_text(text: &str, max: usize) -> String {
    if text.chars().count() > max {
        text.chars().take(max).collect::<String>() + "…"
    } else {
        text.to_string()
    }
}

/// Case-insensitive byte offset of `needle` in `haystack`.
fn find_ci(haystack: &str, needle: &str) -> Option<usize> {
    let lower_haystack = haystack.to_lowercase();
    let lower_needle = needle.to_lowercase();
    // Only trust the lowercased offsets when the byte length is unchanged,
    // otherwise the offset would not line up with the original string.
    if lower_haystack.len() == haystack.len() && lower_needle.len() == needle.len() {
        if let Some(pos) = lower_haystack.find(&lower_needle) {
            return Some(pos);
        }
    }
    haystack.find(needle)
}

/// Escape user text but keep the `<mark>` tokens produced by `snippet()`.
fn escape_snippet(snippet: &str) -> String {
    let mut out = String::with_capacity(snippet.len());
    let mut rest = snippet;
    while !rest.is_empty() {
        if let Some(r) = rest.strip_prefix("<mark>") {
            out.push_str("<mark>");
            rest = r;
        } else if let Some(r) = rest.strip_prefix("</mark>") {
            out.push_str("</mark>");
            rest = r;
        } else {
            let end = [rest.find("<mark>"), rest.find("</mark>")]
                .into_iter()
                .flatten()
                .min()
                .unwrap_or(rest.len());
            out.push_str(&escape_html(&rest[..end]));
            rest = &rest[end..];
        }
    }
    out
}

fn escape_html(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    for c in text.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\'' => out.push_str("&#39;"),
            _ => out.push(c),
        }
    }
    out
}

fn escape_like(q: &str) -> String {
    q.replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_")
}

#[derive(sqlx::FromRow)]
struct SearchRow {
    id: String,
    name: String,
    description: Option<String>,
    location_note: Option<String>,
    source_type: String,
    category_id: Option<String>,
    category_name: Option<String>,
    /// Full category path (root → leaf), used for highlighting only.
    category_path: Option<String>,
    container_id: Option<String>,
    thumb_path: Option<String>,
    created_at: String,
    name_snippet: Option<String>,
    desc_snippet: Option<String>,
    note_snippet: Option<String>,
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
