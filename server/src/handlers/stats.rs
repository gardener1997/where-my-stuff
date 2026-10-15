use axum::{extract::State, Json};
use sqlx::SqlitePool;

use crate::error::AppResult;
use crate::models::Stats;
use crate::repositories::search;

pub async fn get(State(pool): State<SqlitePool>) -> AppResult<Json<Stats>> {
    Ok(Json(search::stats(&pool).await?))
}
