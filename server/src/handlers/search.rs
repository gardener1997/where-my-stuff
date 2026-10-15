use axum::{extract::Query, extract::State, Json};
use sqlx::SqlitePool;

use crate::error::AppResult;
use crate::models::search::SearchQuery;
use crate::models::search::SearchResult;
use crate::repositories::search;

pub async fn search(
    State(pool): State<SqlitePool>,
    Query(q): Query<SearchQuery>,
) -> AppResult<Json<SearchResult>> {
    Ok(Json(search::search(&pool, &q).await?))
}
