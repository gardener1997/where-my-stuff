use axum::{extract::DefaultBodyLimit, middleware, Extension, Router};
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;
use tower_http::trace::TraceLayer;
use tracing_subscriber::EnvFilter;

mod cli;
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
    // Credential subcommands (`set-user`, `show-user`) exit before any server setup.
    if cli::run().await {
        return;
    }

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

    // Auth: sessions are in-memory; a session is only required once
    // credentials exist in the DB (set via `server set-user`).
    let sessions = Arc::new(services::auth::Sessions::new());
    let auth_required = repositories::auth::get(&pool)
        .await
        .expect("failed to read auth settings")
        .is_some();
    if !auth_required {
        tracing::warn!("未设置登录账号，所有访问无需登录。运行 `server set-user` 可启用登录。");
    }
    let gate = Arc::new(services::auth::AuthGate {
        sessions: sessions.clone(),
        required: auth_required,
    });

    // Serve uploaded images at a fixed URL: /images/{subdir}/{filename}
    // DB stores relative paths like "items/uuid.png"
    let app = Router::new()
        .nest("/api/v1", routes::api_routes(pool.clone()))
        .nest_service("/images", ServeDir::new(image_dir))
        .nest_service("/docs", ServeDir::new(docs_dir))
        // Serve embedded frontend (web/dist baked into binary at compile time)
        .fallback(static_files::handler)
        .layer(middleware::from_fn_with_state(
            gate,
            services::auth::require_auth,
        ))
        .layer(Extension(sessions))
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
