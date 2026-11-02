use sqlx::SqlitePool;

use crate::error::AppResult;
use crate::models::AuthUser;

pub async fn get(pool: &SqlitePool) -> AppResult<Option<AuthUser>> {
    let user = sqlx::query_as::<_, AuthUser>(
        "SELECT username, password_hash FROM auth_user WHERE id = 1",
    )
    .fetch_optional(pool)
    .await?;
    Ok(user)
}

pub async fn set(pool: &SqlitePool, username: &str, password_hash: &str) -> AppResult<()> {
    sqlx::query(
        "INSERT INTO auth_user (id, username, password_hash, updated_at)
         VALUES (1, ?, ?, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
             username = excluded.username,
             password_hash = excluded.password_hash,
             updated_at = datetime('now')",
    )
    .bind(username)
    .bind(password_hash)
    .execute(pool)
    .await?;
    Ok(())
}
