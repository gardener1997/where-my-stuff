use axum::{
    extract::{Multipart, Path, Query, State},
    Json,
};
use serde::Deserialize;
use sqlx::SqlitePool;

use crate::error::{AppError, AppResult};
use crate::models::{Container, ContainerDetail, ContainerNode, CreateContainer, UpdateContainer};
use crate::repositories::{container, item};
use crate::services::image;

#[derive(Deserialize)]
pub struct ListQuery {
    pub parent_id: Option<String>,
}

pub async fn list(
    State(pool): State<SqlitePool>,
    Query(q): Query<ListQuery>,
) -> AppResult<Json<Vec<Container>>> {
    Ok(Json(container::list(&pool, q.parent_id.as_deref()).await?))
}

pub async fn list_tree(State(pool): State<SqlitePool>) -> AppResult<Json<Vec<ContainerNode>>> {
    Ok(Json(container::list_tree(&pool).await?))
}

pub async fn detail(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> AppResult<Json<ContainerDetail>> {
    let c = container::get(&pool, &id).await?;
    let path = container::get_path(&pool, &id).await?;
    let children = container::list(&pool, Some(&id)).await?;

    let items_page = item::list(
        &pool,
        &crate::models::ListItemsQuery {
            category_id: None,
            container_id: Some(id.clone()),
            source_type: None,
            tag_id: None,
            page: Some(1),
            size: Some(100),
        },
    )
    .await?;

    Ok(Json(ContainerDetail {
        container: c,
        path,
        children,
        items: items_page.items,
    }))
}

pub async fn create(
    State(pool): State<SqlitePool>,
    Json(input): Json<CreateContainer>,
) -> AppResult<Json<Container>> {
    Ok(Json(container::create(&pool, &input).await?))
}

pub async fn update(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
    Json(input): Json<UpdateContainer>,
) -> AppResult<Json<Container>> {
    Ok(Json(container::update(&pool, &id, &input).await?))
}

pub async fn delete(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> AppResult<Json<serde_json::Value>> {
    container::delete(&pool, &id).await?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

pub async fn upload_image(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
    mut multipart: Multipart,
) -> AppResult<Json<serde_json::Value>> {
    let _ = container::get(&pool, &id).await?;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::bad_request(format!("multipart error: {e}")))?
    {
        if field.name() == Some("file") {
            let filename = field
                .file_name()
                .map(|s| s.to_string())
                .unwrap_or_else(|| "image.jpg".into());
            let data = field
                .bytes()
                .await
                .map_err(|e| AppError::bad_request(format!("failed to read file: {e}")))?;

            let config = crate::config::Config::load();
            let saved = image::save_image(
                &data,
                &filename,
                &config.data.image_dir,
                "containers",
                config.max_file_size_bytes(),
            )?;

            container::set_image(&pool, &id, &saved.file_path).await?;
            return Ok(Json(serde_json::json!({
                "ok": true,
                "image_path": saved.file_path
            })));
        }
    }

    Err(AppError::bad_request("no file field found in multipart"))
}
