use argon2::{
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use axum::{
    extract::{Request, State},
    http::{header, HeaderMap, StatusCode},
    middleware::Next,
    response::{IntoResponse, Redirect, Response},
    Json,
};
use serde_json::json;
use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    time::{Duration, SystemTime},
};

use crate::error::{AppError, AppResult};

pub const COOKIE_NAME: &str = "wms_session";
const SESSION_TTL: Duration = Duration::from_secs(14 * 24 * 60 * 60);

/// One-time password hashing for the `set-user` command.
pub fn hash_password(password: &str) -> AppResult<String> {
    // A UUIDv4 gives 122 bits of entropy for the salt; no extra RNG dependency.
    let salt = SaltString::encode_b64(uuid::Uuid::new_v4().as_bytes())
        .map_err(|e| AppError::Internal(format!("failed to create password salt: {e}")))?;

    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|e| AppError::Internal(format!("failed to hash password: {e}")))
}

pub fn verify_password(password: &str, hash: &str) -> bool {
    let Ok(parsed) = PasswordHash::new(hash) else {
        return false;
    };
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .is_ok()
}

struct Session {
    username: String,
    expires_at: SystemTime,
}

/// In-memory sessions. Restarting the server logs every device out, which is a
/// reasonable trade-off for a single-user local app.
pub struct Sessions {
    inner: Mutex<HashMap<String, Session>>,
}

impl Default for Sessions {
    fn default() -> Self {
        Self::new()
    }
}

impl Sessions {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(HashMap::new()),
        }
    }

    pub fn create(&self, username: &str) -> String {
        // Two UUIDs = 244 bits of random session id.
        let token = format!(
            "{}{}",
            uuid::Uuid::new_v4().simple(),
            uuid::Uuid::new_v4().simple()
        );
        let mut sessions = self.inner.lock().unwrap();
        remove_expired(&mut sessions);
        sessions.insert(
            token.clone(),
            Session {
                username: username.to_string(),
                expires_at: SystemTime::now() + SESSION_TTL,
            },
        );
        token
    }

    pub fn validate(&self, token: &str) -> Option<String> {
        let mut sessions = self.inner.lock().unwrap();
        remove_expired(&mut sessions);
        sessions.get(token).map(|session| session.username.clone())
    }

    pub fn remove(&self, token: &str) {
        self.inner.lock().unwrap().remove(token);
    }
}

fn remove_expired(sessions: &mut HashMap<String, Session>) {
    let now = SystemTime::now();
    sessions.retain(|_, session| session.expires_at > now);
}

#[derive(Debug, Clone)]
pub struct SessionUser(pub String);

pub fn token_from_headers(headers: &HeaderMap) -> Option<String> {
    headers
        .get(header::COOKIE)?
        .to_str()
        .ok()?
        .split(';')
        .find_map(|part| {
            let (name, value) = part.trim().split_once('=')?;
            (name == COOKIE_NAME).then(|| value.to_string())
        })
}

pub fn session_cookie(token: &str, secure: bool) -> String {
    let mut cookie = format!(
        "{COOKIE_NAME}={token}; Path=/; HttpOnly; SameSite=Lax; Max-Age={}",
        SESSION_TTL.as_secs()
    );
    if secure {
        cookie.push_str("; Secure");
    }
    cookie
}

pub fn clear_cookie(secure: bool) -> String {
    let mut cookie =
        format!("{COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
    if secure {
        cookie.push_str("; Secure");
    }
    cookie
}

pub fn request_is_secure(headers: &HeaderMap) -> bool {
    headers
        .get("x-forwarded-proto")
        .and_then(|value| value.to_str().ok())
        .map(|value| value.split(',').any(|part| part.trim() == "https"))
        .unwrap_or(false)
}

fn is_public_path(path: &str) -> bool {
    matches!(
        path,
        "/login"
            | "/login/"
            | "/favicon.svg"
            | "/favicon-32.png"
            | "/apple-touch-icon.png"
            | "/api/v1/auth/login"
    ) || path.starts_with("/assets/")
}

fn unauthorized_response(path: &str) -> Response {
    if path.starts_with("/api/")
        || path.starts_with("/images")
        || path.starts_with("/docs")
    {
        (
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "未登录" })),
        )
            .into_response()
    } else {
        Redirect::to("/login").into_response()
    }
}

/// Everything the auth middleware needs: the session store, plus whether any
/// credentials are configured at all — when none are, every request is public.
pub struct AuthGate {
    pub sessions: Arc<Sessions>,
    pub required: bool,
}

/// Global gate: everything except the login page, its assets, and the login
/// endpoint requires a valid session cookie. Images and documents are covered
/// too, so knowing a file URL is not enough to read it. When no credentials
/// have been configured (`server set-user`), the gate stays open.
pub async fn require_auth(
    State(gate): State<Arc<AuthGate>>,
    mut request: Request,
    next: Next,
) -> Response {
    let path = request.uri().path().to_string();
    if !gate.required || is_public_path(&path) {
        return next.run(request).await;
    }

    if let Some(token) = token_from_headers(request.headers()) {
        if let Some(username) = gate.sessions.validate(&token) {
            request.extensions_mut().insert(SessionUser(username));
            return next.run(request).await;
        }
    }

    unauthorized_response(&path)
}
