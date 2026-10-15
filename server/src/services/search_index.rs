use sqlx::SqlitePool;

use crate::error::AppResult;

/// Sync FTS index for a specific item.
/// Called after create/update/delete of an item, or when tags/containers/categories change.
pub async fn sync_item(pool: &SqlitePool, item_id: &str) -> AppResult<()> {
    // Remove old entry
    sqlx::query("DELETE FROM items_fts WHERE item_id = ?")
        .bind(item_id)
        .execute(pool)
        .await?;

    // Gather searchable fields
    let row: Option<(String, String, Option<String>)> =
        sqlx::query_as("SELECT i.id, i.name, i.description FROM items i WHERE i.id = ?")
            .bind(item_id)
            .fetch_optional(pool)
            .await?;

    let Some((id, name, description)) = row else {
        return Ok(()); // item deleted
    };

    // Collect tags
    let tags: Vec<String> = sqlx::query_scalar(
        "SELECT t.name FROM tags t JOIN item_tags it ON it.tag_id = t.id WHERE it.item_id = ?",
    )
    .bind(item_id)
    .fetch_all(pool)
    .await?;

    // Container name + label
    let container_info: Option<(Option<String>, Option<String>)> = sqlx::query_as(
        "SELECT c.name, c.label FROM containers c
         JOIN items i ON i.container_id = c.id WHERE i.id = ?",
    )
    .bind(item_id)
    .fetch_optional(pool)
    .await?;

    // Category name
    let category_name: Option<String> = sqlx::query_scalar(
        "SELECT c.name FROM categories c
         JOIN items i ON i.category_id = c.id WHERE i.id = ?",
    )
    .bind(item_id)
    .fetch_optional(pool)
    .await?;

    let (container_name, container_label) = container_info
        .map(|(n, l)| (n.unwrap_or_default(), l.unwrap_or_default()))
        .unwrap_or_default();

    sqlx::query(
        "INSERT INTO items_fts (item_id, name, description, tags, container_name, container_label, category_name)
         VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&name)
    .bind(description.unwrap_or_default())
    .bind(tags.join(" "))
    .bind(&container_name)
    .bind(&container_label)
    .bind(category_name.unwrap_or_default())
    .execute(pool)
    .await?;

    Ok(())
}

/// Re-sync all items in the FTS index. Useful for bulk operations.
pub async fn sync_all(pool: &SqlitePool) -> AppResult<()> {
    sqlx::query("DELETE FROM items_fts").execute(pool).await?;

    let item_ids: Vec<String> = sqlx::query_scalar("SELECT id FROM items")
        .fetch_all(pool)
        .await?;

    for id in &item_ids {
        sync_item(pool, id).await?;
    }

    Ok(())
}
