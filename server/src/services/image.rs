use axum::body::Bytes;
use image::ImageFormat;
use std::path::{Path, PathBuf};

use crate::error::{AppError, AppResult};

const THUMB_WIDTH: u32 = 300;
const ALLOWED_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "webp", "avif"];

pub struct SavedImage {
    pub file_path: String,
    pub thumb_path: String,
}

/// Save an uploaded image and generate a thumbnail.
pub fn save_image(
    data: &Bytes,
    filename: &str,
    image_dir: &str,
    subdir: &str,
    max_size: usize,
) -> AppResult<SavedImage> {
    if data.len() > max_size {
        return Err(AppError::bad_request(format!(
            "file too large: {} bytes (max {max_size})",
            data.len()
        )));
    }

    // Validate extension
    let ext = Path::new(filename)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();

    if !ALLOWED_EXTENSIONS.contains(&ext.as_str()) {
        return Err(AppError::bad_request(format!(
            "unsupported file type: {ext}"
        )));
    }

    // Build paths — store relative to image_dir (e.g. "items/uuid.png")
    let id = uuid::Uuid::new_v4().to_string();
    let dir = PathBuf::from(image_dir).join(subdir);
    std::fs::create_dir_all(&dir)?;

    let file_name = format!("{id}.{ext}");
    let file_path = dir.join(&file_name);

    // Save original as-is
    std::fs::write(&file_path, data)?;

    // Return paths relative to image_dir
    let rel_file = format!("{subdir}/{file_name}");

    // Generate thumbnail (AVIF skipped — no decode support without system libdav1d)
    if ext == "avif" {
        return Ok(SavedImage {
            file_path: rel_file.clone(),
            thumb_path: rel_file,
        });
    }

    // Validate it's actually an image and generate thumbnail
    let img = image::load_from_memory(data)
        .map_err(|e| AppError::bad_request(format!("invalid image: {e}")))?;

    let thumb_ext = match ext.as_str() {
        "jpeg" => "jpg".to_string(),
        e => e.to_string(),
    };
    let thumb_name = format!("{id}_thumb.{thumb_ext}");
    let thumb_path = dir.join(&thumb_name);
    let rel_thumb = format!("{subdir}/{thumb_name}");

    let thumb = img.thumbnail(THUMB_WIDTH, THUMB_HEIGHT);
    let format = match thumb_ext.as_str() {
        "jpg" => ImageFormat::Jpeg,
        "png" => ImageFormat::Png,
        "webp" => ImageFormat::WebP,
        _ => ImageFormat::Jpeg,
    };
    thumb
        .save_with_format(&thumb_path, format)
        .map_err(|e| AppError::Internal(format!("failed to save thumbnail: {e}")))?;

    Ok(SavedImage {
        file_path: rel_file,
        thumb_path: rel_thumb,
    })
}

const THUMB_HEIGHT: u32 = 300;

/// Delete an image file and its thumbnail (paths are relative to image_dir).
pub fn delete_image(image_dir: &str, file_path: &str, thumb_path: &str) {
    let _ = std::fs::remove_file(std::path::Path::new(image_dir).join(file_path));
    let _ = std::fs::remove_file(std::path::Path::new(image_dir).join(thumb_path));
}
