use serde::Deserialize;
use std::path::PathBuf;

fn data_dir() -> PathBuf {
    if let Ok(xdg) = std::env::var("XDG_DATA_HOME") {
        PathBuf::from(xdg).join("wheremystuff")
    } else if let Ok(home) = std::env::var("HOME") {
        PathBuf::from(home).join(".local/share/wheremystuff")
    } else {
        PathBuf::from("data") // fallback（开发环境）
    }
}

#[derive(Debug, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    pub data: DataConfig,
    pub upload: UploadConfig,
}

#[derive(Debug, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
}

#[derive(Debug, Deserialize)]
pub struct DataConfig {
    pub db_path: String,
    pub image_dir: String,
    pub docs_dir: String,
}

#[derive(Debug, Deserialize)]
pub struct UploadConfig {
    pub max_file_size: String,
    #[serde(default = "default_max_doc_size")]
    pub max_doc_size: String,
}

fn default_max_doc_size() -> String {
    "50MB".into()
}

impl Config {
    pub fn load() -> Self {
        let config_path = std::env::var("CONFIG_PATH").unwrap_or_else(|_| "config.toml".into());
        let mut config = if PathBuf::from(&config_path).exists() {
            let content =
                std::fs::read_to_string(&config_path).expect("failed to read config.toml");
            toml::from_str(&content).expect("failed to parse config.toml")
        } else {
            Self::default()
        };

        // CLI overrides: --port <N>, --host <addr>, --help / -h
        let args: Vec<String> = std::env::args().collect();
        let mut i = 1;
        while i < args.len() {
            match args[i].as_str() {
                "--port" => {
                    i += 1;
                    if let Some(val) = args.get(i) {
                        config.server.port = val.parse().expect("invalid --port value");
                    } else {
                        eprintln!("--port requires a value");
                        std::process::exit(1);
                    }
                }
                "--host" => {
                    i += 1;
                    if let Some(val) = args.get(i) {
                        config.server.host = val.clone();
                    } else {
                        eprintln!("--host requires a value");
                        std::process::exit(1);
                    }
                }
                "--help" | "-h" => {
                    println!("用法: wheremystuff [选项]\n");
                    println!("选项:");
                    println!("  --port <N>    监听端口 (默认: {})", Self::default().server.port);
                    println!("  --host <addr> 监听地址 (默认: {})", Self::default().server.host);
                    println!("  -h, --help    显示帮助");
                    std::process::exit(0);
                }
                other => {
                    eprintln!("未知参数: {other}");
                    eprintln!("使用 --help 查看可用选项");
                    std::process::exit(1);
                }
            }
            i += 1;
        }

        config
    }

    pub fn max_file_size_bytes(&self) -> usize {
        parse_size(&self.upload.max_file_size)
    }

    pub fn max_doc_size_bytes(&self) -> usize {
        parse_size(&self.upload.max_doc_size)
    }
}

fn parse_size(s: &str) -> usize {
    let (num, unit) = s.split_at(s.find(|c: char| !c.is_ascii_digit()).unwrap_or(s.len()));
    let n: usize = num.parse().unwrap_or(10);
    match unit.trim().to_uppercase().as_str() {
        "KB" => n * 1024,
        "MB" => n * 1024 * 1024,
        "GB" => n * 1024 * 1024 * 1024,
        _ => n * 1024 * 1024,
    }
}

impl Default for Config {
    fn default() -> Self {
        let dir = data_dir();
        Self {
            server: ServerConfig {
                host: "127.0.0.1".into(),
                port: 3000,
            },
            data: DataConfig {
                db_path: dir.join("wheremystuff.db").to_string_lossy().into(),
                image_dir: dir.join("images").to_string_lossy().into(),
                docs_dir: dir.join("docs").to_string_lossy().into(),
            },
            upload: UploadConfig {
                max_file_size: "10MB".into(),
                max_doc_size: default_max_doc_size(),
            },
        }
    }
}
