use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use sqlx::SqlitePool;

use crate::error::AppResult;
use crate::models::{CreateTag, Tag, UpdateTag};
use crate::repositories::tag;

pub async fn list(State(pool): State<SqlitePool>) -> AppResult<Json<Vec<Tag>>> {
    Ok(Json(tag::list(&pool).await?))
}

pub async fn create(
    State(pool): State<SqlitePool>,
    Json(input): Json<CreateTag>,
) -> AppResult<Json<Tag>> {
    Ok(Json(tag::create(&pool, &input).await?))
}

pub async fn update(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
    Json(input): Json<UpdateTag>,
) -> AppResult<Json<Tag>> {
    Ok(Json(tag::update(&pool, &id, &input).await?))
}

pub async fn delete(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> AppResult<Json<serde_json::Value>> {
    tag::delete(&pool, &id).await?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

#[derive(Deserialize)]
pub struct AutocompleteQuery {
    pub q: String,
}

pub async fn autocomplete(
    State(pool): State<SqlitePool>,
    Query(q): Query<AutocompleteQuery>,
) -> AppResult<Json<Vec<Tag>>> {
    Ok(Json(tag::autocomplete(&pool, &q.q, 10).await?))
}
