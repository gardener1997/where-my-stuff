# wheremystuff

[English](README.en.md) | 简体中文

个人物品管理与查找工具 — 「我有个东西，放哪儿了？」

## 技术栈

 | 层   | 技术                                                                   |
 |------|------------------------------------------------------------------------|
 | 后端 | Rust + Axum + SQLite (FTS5) + sqlx                                     |
 | 前端 | Vite + React 19 + TypeScript + TanStack Router/Query + Tailwind CSS v4 |
 | 图片 | 本地磁盘存储 + 缩略图 (300px)                                          |
 | 部署 | 单二进制 / Podman 容器 / nginx 反向代理                                |

## 环境要求

- Rust 1.75+（含 cargo）
- Node.js 20+
- pnpm 8+
- [just](https://github.com/casey/just)
- [Podman](https://podman.io/)（可选，容器部署）

```bash
# Arch Linux
sudo pacman -S rust nodejs just podman
npm install -g pnpm
cargo install just    # 如果发行版仓库没有
```

## 开发

### 安装开发依赖

```bash
just deps
```

### 启动开发服务

```bash
just dev    # 后端 + 前端并行
```

- 后端 API：`http://127.0.0.1:3000`
- 前端：`http://127.0.0.1:5173`（Vite HMR，`/api` 和 `/data/images` 自动代理到后端）

也可以分别启动：`just dev-server` / `just dev-web`

## 构建

```bash
just build    # 前端打包进二进制 + 后端编译 → target/release/server（单文件）
```

## 部署

### 方式一：直接安装到系统

```bash
just install
```

默认安装到 `~/.local/bin/wheremystuff`，可指定路径：

```bash
PREFIX=/usr/local just install
```

安装后直接运行（单文件，前端已打包进二进制）：

```bash
wheremystuff
```

运行时会在当前目录创建 `data/`（数据库 + 图片）。可选 `config.toml` 配置路径。

#### systemd 服务

```bash
sudo cp deploy/systemd/wheremystuff.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now wheremystuff
```

> 修改 service 文件中的 `ExecStart` 路径和 `WorkingDirectory`（数据目录位置）。

### 方式二：Podman 容器

```bash
just container-build   # 构建镜像（多阶段：Node 前端 + Rust 后端）
just container-run     # 启动容器（-p 3000:3000，数据挂载到 ./data）
```

数据持久化在宿主机 `./data/` 目录。其他命令：

```bash
just container-logs    # 查看日志
just container-clean   # 停止并删除容器
```

### 方式三：nginx 反向代理

适用于上述任一部署方式。配置示例：`deploy/nginx/wheremystuff.conf`

```bash
sudo cp deploy/nginx/wheremystuff.conf /etc/nginx/conf.d/
# 修改 server_name 为你的域名或 IP
sudo nginx -t && sudo nginx -s reload
```

关键配置点：
- `proxy_pass http://127.0.0.1:3000` → 转发到后端
- `client_max_body_size 20M` → 图片上传大小限制
- 可选：`location /data/images/` 用 nginx 直接服务静态图片

## 配置

可选 `config.toml`（或 `CONFIG_PATH` 环境变量指定路径），不存在则用默认值：

```toml
[server]
host = "127.0.0.1"
port = 3000

[data]
db_path = "data/wheremystuff.db"
image_dir = "data/images"

[upload]
max_file_size = "10MB"
```

运行时数据存储在 `$XDG_DATA_HOME/wheremystuff/`（默认 `~/.local/share/wheremystuff/`）：

```
~/.local/share/wheremystuff/
├── wheremystuff.db    # SQLite 数据库
└── images/            # 上传图片
```

可在 `config.toml` 中自定义路径。

### 数据库

SQLite，迁移在 `server/migrations/`，**启动时自动执行**。schema 变更 = 新增迁移文件 + 重新编译。

## 测试 & 代码检查

```bash
just test     # 运行测试
just fmt      # 格式化（rustfmt + prettier）
just lint     # 检查（clippy + prettier + tsc）
just check    # fmt + lint + test
```

## 命令速查

 | 命令                   | 说明                              |
 |------------------------|-----------------------------------|
 | `just deps`            | 安装开发依赖（pnpm install）      |
 | `just dev`             | 开发模式（前后端一起）            |
 | `just build`           | 构建前端 + 编译后端 release       |
 | `just install`         | 安装到系统（默认 `~/.local/bin`） |
 | `just uninstall`       | 卸载系统安装                      |
 | `just run`             | 构建并运行（仓库根目录）          |
 | `just container-build` | 构建 Podman 镜像                  |
 | `just container-run`   | 运行容器                          |
 | `just container-logs`  | 容器日志                          |
 | `just container-clean` | 停止并删除容器                    |
 | `just test`            | 运行测试                          |
 | `just fmt`             | 格式化代码                        |
 | `just lint`            | 代码检查                          |
 | `just check`           | 格式化 + 检查 + 测试              |
 | `just clean`           | 清理构建产物                      |
 | `just reset-db`        | 清空数据库和图片（慎用）          |

## 项目结构

```
wheremystuff/
├── server/                # Rust 后端
│   ├── migrations/        # sqlx 数据库迁移（启动自动执行）
│   └── src/
│       ├── main.rs        # 入口：配置、路由、静态文件、图片服务
│       ├── config.rs      # 配置加载（config.toml / 环境变量）
│       ├── db.rs          # SQLite 连接池 + 迁移
│       ├── handlers/      # HTTP 处理器
│       ├── models/        # 数据模型 / DTO
│       ├── repositories/  # SQL 查询层
│       └── services/      # 业务逻辑（图片处理、FTS 同步）
├── web/                   # React 前端
│   ├── src/
│   │   ├── routes/        # TanStack Router 文件路由
│   │   ├── hooks/         # React Query 数据 hooks
│   │   ├── components/    # 通用组件（Select、ImageUpload、Skeleton 等）
│   │   ├── lib/           # API 客户端、工具函数
│   │   └── types/         # TypeScript 类型
│   └── dist/              # 构建产物（后端静态服务）
├── deploy/
│   ├── Containerfile      # Podman 多阶段构建
│   ├── nginx/             # nginx 反向代理配置
│   └── systemd/           # systemd 服务文件
├── data/                  # 运行时数据（gitignore）
│   ├── wheremystuff.db    # SQLite 数据库
│   └── images/            # 上传图片
├── justfile               # 任务管理
└── Cargo.toml             # Rust workspace
```

## API 概览

REST 风格，前缀 `/api/v1`：

- `GET/POST/PUT/DELETE /categories/*` — 分类管理
- `GET/POST/PUT/DELETE /containers/*` — 容器（树形层级）
- `GET/POST/PUT/DELETE /items/*` — 物品（含图片上传）
- `GET/POST/PUT/DELETE /tags/*` — 标签
- `GET /search?q=` — FTS5 全文搜索（trigram 分词，支持中文）
- `GET /stats` — 统计概览

## License

[MIT](LICENSE)
