use axum::{
    extract::State,
    http::{header, HeaderMap, HeaderValue},
    response::{IntoResponse, Response},
    Extension, Json,
};
use serde_json::json;
use sqlx::SqlitePool;
use std::sync::Arc;
use std::time::Duration;

use crate::error::{AppError, AppResult};
use crate::models::{AuthInfo, LoginRequest};
use crate::repositories::auth as auth_repo;
use crate::services::auth::{
    clear_cookie, request_is_secure, session_cookie, token_from_headers, verify_password,
    SessionUser, Sessions,
};

pub async fn login(
    State(pool): State<SqlitePool>,
    Extension(sessions): Extension<Arc<Sessions>>,
    headers: HeaderMap,
    Json(input): Json<LoginRequest>,
) -> AppResult<Response> {
    if input.username.is_empty()
        || input.username.len() > 128
        || input.password.is_empty()
        || input.password.len() > 256
    {
        return Err(AppError::unauthorized("用户名或密码不正确"));
    }

    let Some(user) = auth_repo::get(&pool).await? else {
        tokio::time::sleep(Duration::from_millis(400)).await;
        return Err(AppError::unauthorized("用户名或密码不正确"));
    };

    // Always run the (expensive) hash verification, even when the username is
    // wrong, so response time does not reveal which half was incorrect.
    let password_ok = verify_password(
        &input.password,
        &user.password_hash,
    );
    let username_ok = user.username == input.username;

    if !(username_ok && password_ok) {
        tokio::time::sleep(Duration::from_millis(400)).await;
        return Err(AppError::unauthorized("用户名或密码不正确"));
    }

    // Rotate the session on every login.
    if let Some(old_token) = token_from_headers(&headers) {
        sessions.remove(&old_token);
    }

    let token = sessions.create(&user.username);
    let cookie = session_cookie(&token, request_is_secure(&headers));

    let mut response = Json(AuthInfo {
        username: user.username,
    })
    .into_response();
    response.headers_mut().insert(
        header::SET_COOKIE,
        HeaderValue::from_str(&cookie).expect("valid session cookie"),
    );
    response.headers_mut().insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("no-store"),
    );
    Ok(response)
}

pub async fn logout(
    Extension(sessions): Extension<Arc<Sessions>>,
    headers: HeaderMap,
) -> Response {
    if let Some(token) = token_from_headers(&headers) {
        sessions.remove(&token);
    }

    let mut response = Json(json!({ "ok": true })).into_response();
    response.headers_mut().insert(
        header::SET_COOKIE,
        HeaderValue::from_str(&clear_cookie(request_is_secure(&headers)))
            .expect("valid clear-cookie header"),
    );
    response.headers_mut().insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("no-store"),
    );
    response
}

pub async fn me(user: Option<Extension<SessionUser>>) -> AppResult<Json<AuthInfo>> {
    match user {
        Some(Extension(user)) => Ok(Json(AuthInfo { username: user.0 })),
        None => Err(AppError::unauthorized("未登录")),
    }
}
