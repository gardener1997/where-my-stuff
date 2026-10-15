use axum::{
    extract::{Multipart, Path, Query, State},
    Json,
};
use sqlx::SqlitePool;

use crate::error::{AppError, AppResult};
use crate::models::{
    CreateItem, ItemDetail, ItemDocument, ItemImage, ListItemsQuery, PaginatedItems, UpdateItem,
};
use crate::repositories::item;
use crate::services::image;

pub async fn list(
    State(pool): State<SqlitePool>,
    Query(q): Query<ListItemsQuery>,
) -> AppResult<Json<PaginatedItems>> {
    Ok(Json(item::list(&pool, &q).await?))
}

pub async fn get(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> AppResult<Json<ItemDetail>> {
    Ok(Json(item::get(&pool, &id).await?))
}

pub async fn create(
    State(pool): State<SqlitePool>,
    Json(input): Json<CreateItem>,
) -> AppResult<Json<ItemDetail>> {
    let detail = item::create(&pool, &input).await?;
    crate::services::search_index::sync_item(&pool, &detail.item.id).await?;
    Ok(Json(detail))
}

pub async fn update(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
    Json(input): Json<UpdateItem>,
) -> AppResult<Json<ItemDetail>> {
    let detail = item::update(&pool, &id, &input).await?;
    crate::services::search_index::sync_item(&pool, &id).await?;
    Ok(Json(detail))
}

pub async fn delete(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> AppResult<Json<serde_json::Value>> {
    let config = crate::config::Config::load();
    item::delete(&pool, &id, &config.data.image_dir).await?;
    sqlx::query("DELETE FROM items_fts WHERE item_id = ?")
        .bind(&id)
        .execute(&pool)
        .await?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

pub async fn upload_image(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
    mut multipart: Multipart,
) -> AppResult<Json<ItemImage>> {
    let _ = item::get(&pool, &id).await?;

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
                "items",
                config.max_file_size_bytes(),
            )?;

            let img = item::add_image(&pool, &id, &saved.file_path, &saved.thumb_path).await?;
            return Ok(Json(img));
        }
    }

    Err(AppError::bad_request("no file field found in multipart"))
}

pub async fn delete_image(
    State(pool): State<SqlitePool>,
    Path((id, image_id)): Path<(String, String)>,
) -> AppResult<Json<serde_json::Value>> {
    let config = crate::config::Config::load();
    item::remove_image(&pool, &id, &image_id, &config.data.image_dir).await?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

pub async fn upload_document(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
    mut multipart: Multipart,
) -> AppResult<Json<ItemDocument>> {
    let _ = item::get(&pool, &id).await?;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::bad_request(format!("multipart error: {e}")))?
    {
        if field.name() == Some("file") {
            let filename = field
                .file_name()
                .map(|s| s.to_string())
                .unwrap_or_else(|| "document.pdf".into());

            let ext = std::path::Path::new(&filename)
                .extension()
                .and_then(|e| e.to_str())
                .map(|e| e.to_lowercase())
                .unwrap_or_default();

            if ext != "pdf" {
                return Err(AppError::bad_request("只支持 PDF 文件"));
            }

            let data = field
                .bytes()
                .await
                .map_err(|e| AppError::bad_request(format!("failed to read file: {e}")))?;

            let config = crate::config::Config::load();
            let max_size = config.max_doc_size_bytes();
            if data.len() > max_size {
                return Err(AppError::bad_request(format!(
                    "文件过大: {:.1}MB (最大 {:.0}MB)",
                    data.len() as f64 / 1024.0 / 1024.0,
                    max_size as f64 / 1024.0 / 1024.0,
                )));
            }
            let docs_dir = &config.data.docs_dir;

            // Save file
            let file_id = uuid::Uuid::new_v4().to_string();
            let rel_path = format!("{}.pdf", file_id);
            let dir = std::path::Path::new(docs_dir).join("pdf");
            std::fs::create_dir_all(&dir)?;
            std::fs::write(dir.join(&rel_path), &data)?;

            let doc =
                item::add_document(&pool, &id, &rel_path, &filename, "pdf").await?;
            return Ok(Json(doc));
        }
    }

    Err(AppError::bad_request("no file field found in multipart"))
}

pub async fn delete_document(
    State(pool): State<SqlitePool>,
    Path((id, doc_id)): Path<(String, String)>,
) -> AppResult<Json<serde_json::Value>> {
    let config = crate::config::Config::load();
    item::remove_document(&pool, &id, &doc_id, &config.data.docs_dir).await?;
    Ok(Json(serde_json::json!({ "ok": true })))
}
