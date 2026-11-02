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
    let row: Option<(String, String, Option<String>, Option<String>)> =
        sqlx::query_as("SELECT i.id, i.name, i.description, i.location_note FROM items i WHERE i.id = ?")
            .bind(item_id)
            .fetch_optional(pool)
            .await?;

    let Some((id, name, description, location_note)) = row else {
        return Ok(()); // item deleted
    };

    // Collect tags
    let tags: Vec<String> = sqlx::query_scalar(
        "SELECT t.name FROM tags t JOIN item_tags it ON it.tag_id = t.id WHERE it.item_id = ?",
    )
    .bind(item_id)
    .fetch_all(pool)
    .await?;

    // Container path (root → leaf), so searching a parent container finds items in nested ones.
    // `depth = 0` is the direct container; its label is indexed separately.
    let container_rows: Vec<(String, Option<String>, i64)> = sqlx::query_as(
        "WITH RECURSIVE anc(id, name, label, parent_id, depth) AS (
             SELECT c.id, c.name, c.label, c.parent_id, 0
               FROM containers c
               JOIN items i ON i.container_id = c.id
              WHERE i.id = ?
             UNION ALL
             SELECT c.id, c.name, c.label, c.parent_id, anc.depth + 1
               FROM containers c
               JOIN anc ON anc.parent_id = c.id
         )
         SELECT name, label, depth FROM anc ORDER BY depth DESC",
    )
    .bind(item_id)
    .fetch_all(pool)
    .await?;

    let mut container_names = Vec::with_capacity(container_rows.len());
    let mut container_label = String::new();
    for (name, label, depth) in container_rows {
        container_names.push(name);
        if depth == 0 {
            container_label = label.unwrap_or_default();
        }
    }

    // Category path (root → leaf), same idea as containers.
    let category_names: Vec<String> = sqlx::query_scalar(
        "WITH RECURSIVE anc(id, name, parent_id, depth) AS (
             SELECT c.id, c.name, c.parent_id, 0
               FROM categories c
               JOIN items i ON i.category_id = c.id
              WHERE i.id = ?
             UNION ALL
             SELECT c.id, c.name, c.parent_id, anc.depth + 1
               FROM categories c
               JOIN anc ON anc.parent_id = c.id
         )
         SELECT name FROM anc ORDER BY depth DESC",
    )
    .bind(item_id)
    .fetch_all(pool)
    .await?;

    sqlx::query(
        "INSERT INTO items_fts (item_id, name, description, location_note, tags, container_name, container_label, category_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&name)
    .bind(description.unwrap_or_default())
    .bind(location_note.unwrap_or_default())
    .bind(tags.join(" "))
    .bind(container_names.join(" "))
    .bind(container_label)
    .bind(category_names.join(" "))
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

/// Re-sync a list of items by id.
pub async fn sync_items(pool: &SqlitePool, item_ids: &[String]) -> AppResult<()> {
    for id in item_ids {
        sync_item(pool, id).await?;
    }
    Ok(())
}

/// Ids of items stored in `container_id` or any of its descendants.
pub async fn item_ids_for_container(
    pool: &SqlitePool,
    container_id: &str,
) -> AppResult<Vec<String>> {
    let ids = sqlx::query_scalar(
        "WITH RECURSIVE sub(id) AS (
             SELECT ?
             UNION ALL
             SELECT c.id FROM containers c JOIN sub ON c.parent_id = sub.id
         )
         SELECT i.id FROM items i WHERE i.container_id IN (SELECT id FROM sub)",
    )
    .bind(container_id)
    .fetch_all(pool)
    .await?;
    Ok(ids)
}

/// Re-sync items in a container and its descendants (container renamed / re-parented / deleted).
pub async fn sync_container_tree(pool: &SqlitePool, container_id: &str) -> AppResult<()> {
    let ids = item_ids_for_container(pool, container_id).await?;
    sync_items(pool, &ids).await
}

/// Ids of items in `category_id` or any of its descendant categories.
pub async fn item_ids_for_category(
    pool: &SqlitePool,
    category_id: &str,
) -> AppResult<Vec<String>> {
    let ids = sqlx::query_scalar(
        "WITH RECURSIVE sub(id) AS (
             SELECT ?
             UNION ALL
             SELECT c.id FROM categories c JOIN sub ON c.parent_id = sub.id
         )
         SELECT i.id FROM items i WHERE i.category_id IN (SELECT id FROM sub)",
    )
    .bind(category_id)
    .fetch_all(pool)
    .await?;
    Ok(ids)
}

/// Re-sync items in a category and its descendants (category renamed / re-parented / deleted).
pub async fn sync_category_tree(pool: &SqlitePool, category_id: &str) -> AppResult<()> {
    let ids = item_ids_for_category(pool, category_id).await?;
    sync_items(pool, &ids).await
}

/// Ids of items tagged with `tag_id`.
pub async fn item_ids_for_tag(pool: &SqlitePool, tag_id: &str) -> AppResult<Vec<String>> {
    let ids = sqlx::query_scalar("SELECT item_id FROM item_tags WHERE tag_id = ?")
        .bind(tag_id)
        .fetch_all(pool)
        .await?;
    Ok(ids)
}

/// Re-sync items tagged with `tag_id` (tag renamed / deleted).
pub async fn sync_tag(pool: &SqlitePool, tag_id: &str) -> AppResult<()> {
    let ids = item_ids_for_tag(pool, tag_id).await?;
    sync_items(pool, &ids).await
}
