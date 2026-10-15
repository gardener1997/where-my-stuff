use sqlx::SqlitePool;

use crate::error::{AppError, AppResult};
use crate::models::{CreateTag, Tag, UpdateTag};

pub async fn list(pool: &SqlitePool) -> AppResult<Vec<Tag>> {
    let rows = sqlx::query_as::<_, Tag>("SELECT id, name, created_at FROM tags ORDER BY name")
        .fetch_all(pool)
        .await?;
    Ok(rows)
}

pub async fn get(pool: &SqlitePool, id: &str) -> AppResult<Tag> {
    sqlx::query_as::<_, Tag>("SELECT id, name, created_at FROM tags WHERE id = ?")
        .bind(id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::not_found(format!("tag {id} not found")))
}

pub async fn create(pool: &SqlitePool, input: &CreateTag) -> AppResult<Tag> {
    // Return existing if already exists
    if let Some(existing) =
        sqlx::query_as::<_, Tag>("SELECT id, name, created_at FROM tags WHERE name = ?")
            .bind(&input.name)
            .fetch_optional(pool)
            .await?
    {
        return Ok(existing);
    }

    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO tags (id, name) VALUES (?, ?)")
        .bind(&id)
        .bind(&input.name)
        .execute(pool)
        .await?;
    get(pool, &id).await
}

pub async fn update(pool: &SqlitePool, id: &str, input: &UpdateTag) -> AppResult<Tag> {
    sqlx::query("UPDATE tags SET name = ? WHERE id = ?")
        .bind(&input.name)
        .bind(id)
        .execute(pool)
        .await?;
    get(pool, id).await
}

pub async fn delete(pool: &SqlitePool, id: &str) -> AppResult<()> {
    sqlx::query("DELETE FROM tags WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn autocomplete(pool: &SqlitePool, q: &str, limit: i64) -> AppResult<Vec<Tag>> {
    let rows = sqlx::query_as::<_, Tag>(
        "SELECT id, name, created_at FROM tags WHERE name LIKE ? ORDER BY name LIMIT ?",
    )
    .bind(format!("{q}%"))
    .bind(limit)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}
