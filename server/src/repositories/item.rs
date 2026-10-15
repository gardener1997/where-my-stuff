use sqlx::SqlitePool;

use crate::error::{AppError, AppResult};
use crate::models::{
    CreateItem, Item, ItemDetail, ItemDocument, ItemImage, ItemSummary, ListItemsQuery,
    PaginatedItems, Tag, UpdateItem,
};

pub async fn list(pool: &SqlitePool, query: &ListItemsQuery) -> AppResult<PaginatedItems> {
    let page = query.page.unwrap_or(1).max(1);
    let size = query.size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * size;

    // Build filter conditions
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
    if query.tag_id.is_some() {
        conditions.push(
            "EXISTS (SELECT 1 FROM item_tags it WHERE it.item_id = i.id AND it.tag_id = ?)".into(),
        );
    }
    let where_clause = conditions.join(" AND ");

    // Count total
    let count_sql = format!("SELECT COUNT(*) FROM items i WHERE {where_clause}");
    let mut count_q = sqlx::query_scalar::<_, i64>(&count_sql);
    if let Some(ref cid) = query.category_id {
        count_q = count_q.bind(cid);
    }
    if let Some(ref cid) = query.container_id {
        count_q = count_q.bind(cid);
    }
    if let Some(ref st) = query.source_type {
        count_q = count_q.bind(st);
    }
    if let Some(ref tid) = query.tag_id {
        count_q = count_q.bind(tid);
    }
    let total = count_q.fetch_one(pool).await?;

    // Fetch page
    let list_sql = format!(
        "SELECT i.id, i.name, i.description, i.source_type,
                i.category_id, c.name as category_name,
                i.container_id,
                (SELECT thumb_path FROM item_images WHERE item_id = i.id ORDER BY sort_order LIMIT 1) as thumb_path,
                i.created_at
         FROM items i
         LEFT JOIN categories c ON c.id = i.category_id
         WHERE {where_clause}
         ORDER BY i.created_at DESC
         LIMIT ? OFFSET ?"
    );
    let mut list_q = sqlx::query_as::<_, ItemRow>(&list_sql);
    if let Some(ref cid) = query.category_id {
        list_q = list_q.bind(cid);
    }
    if let Some(ref cid) = query.container_id {
        list_q = list_q.bind(cid);
    }
    if let Some(ref st) = query.source_type {
        list_q = list_q.bind(st);
    }
    if let Some(ref tid) = query.tag_id {
        list_q = list_q.bind(tid);
    }
    let rows = list_q.bind(size).bind(offset).fetch_all(pool).await?;

    let mut items = vec![];
    for row in rows {
        let container_path = match &row.container_id {
            Some(cid) => super::container::get_path(pool, cid).await?,
            None => vec![],
        };
        items.push(ItemSummary {
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
        });
    }

    Ok(PaginatedItems {
        items,
        total,
        page,
        size,
    })
}

pub async fn get(pool: &SqlitePool, id: &str) -> AppResult<ItemDetail> {
    let item = sqlx::query_as::<_, Item>(
        "SELECT id, name, description, source_type, purchased_at, bought_from, price,
                category_id, container_id, created_at, updated_at
         FROM items WHERE id = ?",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::not_found(format!("item {id} not found")))?;

    let category_name = match &item.category_id {
        Some(cid) => {
            sqlx::query_scalar::<_, String>("SELECT name FROM categories WHERE id = ?")
                .bind(cid)
                .fetch_optional(pool)
                .await?
        }
        None => None,
    };

    let container_path = match &item.container_id {
        Some(cid) => super::container::get_path(pool, cid).await?,
        None => vec![],
    };

    let images = sqlx::query_as::<_, ItemImage>(
        "SELECT id, item_id, file_path, thumb_path, sort_order, created_at
         FROM item_images WHERE item_id = ? ORDER BY sort_order",
    )
    .bind(id)
    .fetch_all(pool)
    .await?;

    let tags = sqlx::query_as::<_, Tag>(
        "SELECT t.id, t.name, t.created_at
         FROM tags t JOIN item_tags it ON it.tag_id = t.id
         WHERE it.item_id = ? ORDER BY t.name",
    )
    .bind(id)
    .fetch_all(pool)
    .await?;

    let documents = sqlx::query_as::<_, ItemDocument>(
        "SELECT id, item_id, file_path, filename, doc_type, created_at
         FROM item_documents WHERE item_id = ? ORDER BY created_at",
    )
    .bind(id)
    .fetch_all(pool)
    .await?;

    Ok(ItemDetail {
        item,
        category_name,
        container_path,
        images,
        tags,
        documents,
    })
}

pub async fn create(pool: &SqlitePool, input: &CreateItem) -> AppResult<ItemDetail> {
    let id = uuid::Uuid::new_v4().to_string();
    let source_type = input.source_type.as_deref().unwrap_or("handmade");
    sqlx::query(
        "INSERT INTO items (id, name, description, source_type, purchased_at, bought_from, price, category_id, container_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&input.name)
    .bind(&input.description)
    .bind(source_type)
    .bind(&input.purchased_at)
    .bind(&input.bought_from)
    .bind(input.price)
    .bind(&input.category_id)
    .bind(&input.container_id)
    .execute(pool)
    .await?;

    if let Some(ref tag_ids) = input.tag_ids {
        set_tags(pool, &id, tag_ids).await?;
    }

    get(pool, &id).await
}

pub async fn update(pool: &SqlitePool, id: &str, input: &UpdateItem) -> AppResult<ItemDetail> {
    let existing = get(pool, id).await?;
    let item = existing.item;

    sqlx::query(
        "UPDATE items SET name = ?, description = ?, source_type = ?, purchased_at = ?,
         bought_from = ?, price = ?, category_id = ?, container_id = ?, updated_at = datetime('now')
         WHERE id = ?",
    )
    .bind(input.name.as_deref().unwrap_or(&item.name))
    .bind(input.description.as_deref())
    .bind(input.source_type.as_deref().unwrap_or(&item.source_type))
    .bind(input.purchased_at.as_deref())
    .bind(input.bought_from.as_deref())
    .bind(input.price)
    .bind(input.category_id.as_deref())
    .bind(input.container_id.as_deref())
    .bind(id)
    .execute(pool)
    .await?;

    if let Some(ref tag_ids) = input.tag_ids {
        set_tags(pool, id, tag_ids).await?;
    }

    get(pool, id).await
}

pub async fn delete(pool: &SqlitePool, id: &str, image_dir: &str) -> AppResult<()> {
    // Collect image paths for cleanup
    let images = sqlx::query_as::<_, ItemImage>(
        "SELECT id, item_id, file_path, thumb_path, sort_order, created_at
         FROM item_images WHERE item_id = ?",
    )
    .bind(id)
    .fetch_all(pool)
    .await?;

    sqlx::query("DELETE FROM items WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;

    // Delete image files
    for img in images {
        crate::services::image::delete_image(image_dir, &img.file_path, &img.thumb_path);
    }

    Ok(())
}

pub async fn set_tags(pool: &SqlitePool, item_id: &str, tag_ids: &[String]) -> AppResult<()> {
    sqlx::query("DELETE FROM item_tags WHERE item_id = ?")
        .bind(item_id)
        .execute(pool)
        .await?;
    for tid in tag_ids {
        sqlx::query("INSERT INTO item_tags (item_id, tag_id) VALUES (?, ?)")
            .bind(item_id)
            .bind(tid)
            .execute(pool)
            .await?;
    }
    Ok(())
}

pub async fn add_image(
    pool: &SqlitePool,
    item_id: &str,
    file_path: &str,
    thumb_path: &str,
) -> AppResult<ItemImage> {
    let id = uuid::Uuid::new_v4().to_string();
    let sort_order = sqlx::query_scalar::<_, i64>(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM item_images WHERE item_id = ?",
    )
    .bind(item_id)
    .fetch_one(pool)
    .await?;

    sqlx::query(
        "INSERT INTO item_images (id, item_id, file_path, thumb_path, sort_order)
         VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(item_id)
    .bind(file_path)
    .bind(thumb_path)
    .bind(sort_order as i32)
    .execute(pool)
    .await?;

    sqlx::query_as::<_, ItemImage>(
        "SELECT id, item_id, file_path, thumb_path, sort_order, created_at
         FROM item_images WHERE id = ?",
    )
    .bind(&id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::Internal("failed to fetch created image".into()))
}

pub async fn remove_image(
    pool: &SqlitePool,
    item_id: &str,
    image_id: &str,
    image_dir: &str,
) -> AppResult<()> {
    let img = sqlx::query_as::<_, ItemImage>(
        "SELECT id, item_id, file_path, thumb_path, sort_order, created_at
         FROM item_images WHERE id = ? AND item_id = ?",
    )
    .bind(image_id)
    .bind(item_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::not_found("image not found"))?;

    sqlx::query("DELETE FROM item_images WHERE id = ?")
        .bind(image_id)
        .execute(pool)
        .await?;

    crate::services::image::delete_image(image_dir, &img.file_path, &img.thumb_path);
    Ok(())
}

pub async fn add_document(
    pool: &SqlitePool,
    item_id: &str,
    file_path: &str,
    filename: &str,
    doc_type: &str,
) -> AppResult<ItemDocument> {
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO item_documents (id, item_id, file_path, filename, doc_type)
         VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(item_id)
    .bind(file_path)
    .bind(filename)
    .bind(doc_type)
    .execute(pool)
    .await?;

    sqlx::query_as::<_, ItemDocument>(
        "SELECT id, item_id, file_path, filename, doc_type, created_at
         FROM item_documents WHERE id = ?",
    )
    .bind(&id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::Internal("failed to fetch created document".into()))
}

pub async fn remove_document(
    pool: &SqlitePool,
    item_id: &str,
    doc_id: &str,
    docs_dir: &str,
) -> AppResult<()> {
    let doc = sqlx::query_as::<_, ItemDocument>(
        "SELECT id, item_id, file_path, filename, doc_type, created_at
         FROM item_documents WHERE id = ? AND item_id = ?",
    )
    .bind(doc_id)
    .bind(item_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::not_found("document not found"))?;

    sqlx::query("DELETE FROM item_documents WHERE id = ?")
        .bind(doc_id)
        .execute(pool)
        .await?;

    let full_path = std::path::Path::new(docs_dir).join(&doc.file_path);
    let _ = std::fs::remove_file(full_path);
    Ok(())
}

// Internal row type for list queries
#[derive(sqlx::FromRow)]
struct ItemRow {
    id: String,
    name: String,
    description: Option<String>,
    source_type: String,
    category_id: Option<String>,
    category_name: Option<String>,
    container_id: Option<String>,
    thumb_path: Option<String>,
    created_at: String,
}
