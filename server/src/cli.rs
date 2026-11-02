use std::io::{self, IsTerminal, Write};

use crate::config::Config;
use crate::repositories::auth as auth_repo;
use crate::services::auth::hash_password;

const MIN_PASSWORD_CHARS: usize = 8;
const MAX_USERNAME_CHARS: usize = 64;

/// Handle credential subcommands before the server starts.
/// Returns `true` when a command ran, so `main` can exit.
pub async fn run() -> bool {
    match std::env::args().nth(1).as_deref() {
        Some("set-user") => {
            if let Err(message) = set_user().await {
                eprintln!("错误: {message}");
                std::process::exit(1);
            }
            true
        }
        Some("show-user") => {
            if let Err(message) = show_user().await {
                eprintln!("错误: {message}");
                std::process::exit(1);
            }
            true
        }
        _ => false,
    }
}

async fn set_user() -> Result<(), String> {
    let config = Config::load_base();
    let pool = crate::db::init(&config.data.db_path).await;
    let existing = auth_repo::get(&pool)
        .await
        .map_err(|e| e.to_string())?;

    let username = match existing.as_ref() {
        Some(user) => {
            let input = read_line(&format!("用户名 [{}]: ", user.username))?;
            if input.is_empty() {
                user.username.clone()
            } else {
                input
            }
        }
        None => read_line("用户名: ")?,
    };

    let username = username.trim().to_string();
    if username.is_empty() {
        return Err("用户名不能为空".into());
    }
    if username.chars().count() > MAX_USERNAME_CHARS {
        return Err(format!("用户名不能超过 {MAX_USERNAME_CHARS} 个字符"));
    }

    let password = read_password("密码: ")?;
    if password.chars().count() < MIN_PASSWORD_CHARS {
        return Err(format!("密码至少需要 {MIN_PASSWORD_CHARS} 个字符"));
    }
    if password.len() > 256 {
        return Err("密码不能超过 256 个字节".into());
    }

    let confirm = read_password("再输入一次: ")?;
    if password != confirm {
        return Err("两次输入的密码不一致".into());
    }

    let hash = hash_password(&password).map_err(|e| e.to_string())?;
    auth_repo::set(&pool, &username, &hash)
        .await
        .map_err(|e| e.to_string())?;

    println!("已保存登录账号：{username}");
    println!("重启服务后生效；重启会使所有已登录设备退出。");
    Ok(())
}

async fn show_user() -> Result<(), String> {
    let config = Config::load_base();
    let pool = crate::db::init(&config.data.db_path).await;
    match auth_repo::get(&pool).await.map_err(|e| e.to_string())? {
        Some(user) => println!("当前用户名：{}", user.username),
        None => println!("尚未设置登录账号，请先运行：server set-user"),
    }
    Ok(())
}

fn read_line(prompt: &str) -> Result<String, String> {
    print!("{prompt}");
    io::stdout().flush().map_err(|e| e.to_string())?;
    let mut input = String::new();
    io::stdin()
        .read_line(&mut input)
        .map_err(|e| e.to_string())?;
    Ok(input.trim_end_matches(['\r', '\n']).to_string())
}

fn read_password(prompt: &str) -> Result<String, String> {
    if io::stdin().is_terminal() {
        rpassword::prompt_password(prompt).map_err(|e| e.to_string())
    } else {
        // Allow scripting/CI: read one line per password prompt.
        eprint!("{prompt}");
        io::stderr().flush().map_err(|e| e.to_string())?;
        let mut input = String::new();
        io::stdin()
            .read_line(&mut input)
            .map_err(|e| e.to_string())?;
        Ok(input.trim_end_matches(['\r', '\n']).to_string())
    }
}
