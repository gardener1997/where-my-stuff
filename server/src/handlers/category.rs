use axum::{
    extract::{Path, State},
    Json,
};
use sqlx::SqlitePool;

use crate::error::AppResult;
use crate::models::{Category, CategoryNode, CreateCategory, UpdateCategory};
use crate::repositories::category;

pub async fn list(State(pool): State<SqlitePool>) -> AppResult<Json<Vec<Category>>> {
    Ok(Json(category::list(&pool).await?))
}

pub async fn list_tree(State(pool): State<SqlitePool>) -> AppResult<Json<Vec<CategoryNode>>> {
    Ok(Json(category::list_tree(&pool).await?))
}

pub async fn create(
    State(pool): State<SqlitePool>,
    Json(input): Json<CreateCategory>,
) -> AppResult<Json<Category>> {
    Ok(Json(category::create(&pool, &input).await?))
}

pub async fn update(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
    Json(input): Json<UpdateCategory>,
) -> AppResult<Json<Category>> {
    let category = category::update(&pool, &id, &input).await?;
    // The category name/path is part of the search index for every item inside it.
    crate::services::search_index::sync_category_tree(&pool, &id).await?;
    Ok(Json(category))
}

pub async fn delete(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> AppResult<Json<serde_json::Value>> {
    // Capture affected items before the delete: afterwards their category link is gone.
    let item_ids = crate::services::search_index::item_ids_for_category(&pool, &id).await?;
    category::delete(&pool, &id).await?;
    crate::services::search_index::sync_items(&pool, &item_ids).await?;
    Ok(Json(serde_json::json!({ "ok": true })))
}
