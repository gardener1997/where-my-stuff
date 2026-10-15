use axum::{
    routing::{delete, get, post, put},
    Router,
};
use sqlx::SqlitePool;

use crate::handlers;

pub fn api_routes(pool: SqlitePool) -> Router {
    Router::new()
        // Categories
        .route("/categories", get(handlers::category::list))
        .route("/categories/tree", get(handlers::category::list_tree))
        .route("/categories", post(handlers::category::create))
        .route("/categories/{id}", put(handlers::category::update))
        .route("/categories/{id}", delete(handlers::category::delete))
        // Containers
        .route("/containers", get(handlers::container::list))
        .route("/containers/tree", get(handlers::container::list_tree))
        .route("/containers/{id}", get(handlers::container::detail))
        .route("/containers", post(handlers::container::create))
        .route("/containers/{id}", put(handlers::container::update))
        .route("/containers/{id}", delete(handlers::container::delete))
        .route(
            "/containers/{id}/image",
            post(handlers::container::upload_image),
        )
        // Items
        .route("/items", get(handlers::item::list))
        .route("/items/{id}", get(handlers::item::get))
        .route("/items", post(handlers::item::create))
        .route("/items/{id}", put(handlers::item::update))
        .route("/items/{id}", delete(handlers::item::delete))
        .route("/items/{id}/images", post(handlers::item::upload_image))
        .route(
            "/items/{id}/images/{image_id}",
            delete(handlers::item::delete_image),
        )
        // Documents
        .route("/items/{id}/documents", post(handlers::item::upload_document))
        .route(
            "/items/{id}/documents/{doc_id}",
            delete(handlers::item::delete_document),
        )
        // Tags
        .route("/tags", get(handlers::tag::list))
        .route("/tags", post(handlers::tag::create))
        .route("/tags/{id}", put(handlers::tag::update))
        .route("/tags/{id}", delete(handlers::tag::delete))
        .route("/tags/autocomplete", get(handlers::tag::autocomplete))
        // Search
        .route("/search", get(handlers::search::search))
        // Stats
        .route("/stats", get(handlers::stats::get))
        .with_state(pool)
}
