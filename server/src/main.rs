use axum::{extract::DefaultBodyLimit, Router};
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;
use tower_http::trace::TraceLayer;
use tracing_subscriber::EnvFilter;

mod config;
mod db;
mod error;
mod handlers;
mod models;
mod repositories;
mod routes;
mod services;
mod static_files;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| "info,tower_http=debug".into()),
        )
        .init();

    let config = config::Config::load();

    // Ensure image directories exist
    let image_dir = &config.data.image_dir;
    std::fs::create_dir_all(format!("{image_dir}/items")).expect("create items image dir");
    std::fs::create_dir_all(format!("{image_dir}/containers"))
        .expect("create containers image dir");

    let pool = db::init(&config.data.db_path).await;

    // Sync FTS index on startup (in case of stale index)
    if let Err(e) = services::search_index::sync_all(&pool).await {
        tracing::warn!("FTS sync on startup failed: {e}");
    }

    let docs_dir = &config.data.docs_dir;
    std::fs::create_dir_all(format!("{docs_dir}/pdf")).expect("create pdf docs dir");

    // Serve uploaded images at a fixed URL: /images/{subdir}/{filename}
    // DB stores relative paths like "items/uuid.png"
    let app = Router::new()
        .nest("/api/v1", routes::api_routes(pool.clone()))
        .nest_service("/images", ServeDir::new(image_dir))
        .nest_service("/docs", ServeDir::new(docs_dir))
        // Serve embedded frontend (web/dist baked into binary at compile time)
        .fallback(static_files::handler)
        .layer(DefaultBodyLimit::max(100 * 1024 * 1024)) // 100MB for PDF uploads
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http());

    let addr = format!("{}:{}", config.server.host, config.server.port);
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("failed to bind");
    tracing::info!("listening on {addr}");

    axum::serve(listener, app).await.expect("server error");
}
