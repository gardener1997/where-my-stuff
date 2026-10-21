# wheremystuff

English | [简体中文](README.md)

A personal inventory and lookup tool — "I have this thing, where did I put it?"

## Tech Stack

| Layer        | Technology                                                               |
|--------------|--------------------------------------------------------------------------|
| Backend      | Rust + Axum + SQLite (FTS5) + sqlx                                       |
| Frontend     | Vite + React 19 + TypeScript + TanStack Router/Query + Tailwind CSS v4   |
| Images       | Local disk storage + thumbnails (300px)                                  |
| Deployment   | Single binary / Podman container / nginx reverse proxy                   |

## Requirements

- Rust 1.75+ (with cargo)
- Node.js 20+
- pnpm 8+
- [just](https://github.com/casey/just)
- [Podman](https://podman.io/) (optional, for container deployment)

```bash
# Arch Linux
sudo pacman -S rust nodejs just podman
npm install -g pnpm
cargo install just    # if not in your distro repos
```

## Development

### Install dev dependencies

```bash
just deps
```

### Start the dev servers

```bash
just dev    # backend + frontend in parallel
```

- Backend API: `http://127.0.0.1:3000`
- Frontend: `http://127.0.0.1:5173` (Vite HMR; `/api` and `/data/images` are proxied to the backend)

You can also start them separately: `just dev-server` / `just dev-web`

## Build

```bash
just build    # bundle frontend into the binary + build backend → target/release/server (single file)
```

## Deployment

### Option 1: Install directly to the system

```bash
just install
```

Installs to `~/.local/bin/wheremystuff` by default; override with `PREFIX`:

```bash
PREFIX=/usr/local just install
```

Run it directly afterwards (single file, frontend is embedded in the binary):

```bash
wheremystuff
```

At runtime it creates a `data/` directory in the current working directory (database + images). An optional `config.toml` can override paths.

#### systemd service

```bash
sudo cp deploy/systemd/wheremystuff.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now wheremystuff
```

> Adjust `ExecStart` and `WorkingDirectory` (data directory location) in the service file.

### Option 2: Podman container

```bash
just container-build   # build the image (multi-stage: Node frontend + Rust backend)
just container-run     # start the container (-p 3000:3000, data mounted at ./data)
```

Data persists on the host under `./data/`. Other commands:

```bash
just container-logs    # view logs
just container-clean   # stop and remove the container
```

### Option 3: nginx reverse proxy

Works with either deployment method above. Example config: `deploy/nginx/wheremystuff.conf`

```bash
sudo cp deploy/nginx/wheremystuff.conf /etc/nginx/conf.d/
# set server_name to your domain or IP
sudo nginx -t && sudo nginx -s reload
```

Key points:
- `proxy_pass http://127.0.0.1:3000` → forward to the backend
- `client_max_body_size 20M` → image upload size limit
- Optional: `location /data/images/` to serve static images directly from nginx

## Configuration

Optional `config.toml` (or point to it with the `CONFIG_PATH` env var). If absent, defaults apply:

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

Runtime data is stored under `$XDG_DATA_HOME/wheremystuff/` (default `~/.local/share/wheremystuff/`):

```
~/.local/share/wheremystuff/
├── wheremystuff.db    # SQLite database
└── images/            # uploaded images
```

Paths can be customized in `config.toml`.

### Database

SQLite, migrations live in `server/migrations/` and run **automatically on startup**. Schema changes = new migration file + rebuild.

## Tests & Linting

```bash
just test     # run tests
just fmt      # format (rustfmt + prettier)
just lint     # check (clippy + prettier + tsc)
just check    # fmt + lint + test
```

## Command Reference

| Command                | Description                                  |
|------------------------|----------------------------------------------|
| `just deps`            | Install dev dependencies (pnpm install)      |
| `just dev`             | Dev mode (frontend + backend)                |
| `just build`           | Build frontend + release backend             |
| `just install`         | Install to system (default `~/.local/bin`)   |
| `just uninstall`       | Uninstall from system                        |
| `just run`             | Build and run (from repo root)               |
| `just container-build` | Build the Podman image                       |
| `just container-run`   | Run the container                            |
| `just container-logs`  | Container logs                               |
| `just container-clean` | Stop and remove the container                |
| `just test`            | Run tests                                    |
| `just fmt`             | Format code                                  |
| `just lint`            | Lint / type-check                            |
| `just check`           | Format + lint + test                         |
| `just clean`           | Clean build artifacts                        |
| `just reset-db`        | Wipe database and images (use with care)     |

## Project Structure

```
wheremystuff/
├── server/                # Rust backend
│   ├── migrations/        # sqlx migrations (run on startup)
│   └── src/
│       ├── main.rs        # entry: config, routes, static files, image serving
│       ├── config.rs      # config loading (config.toml / env vars)
│       ├── db.rs          # SQLite pool + migrations
│       ├── handlers/      # HTTP handlers
│       ├── models/        # data models / DTOs
│       ├── repositories/  # SQL query layer
│       └── services/      # business logic (image processing, FTS sync)
├── web/                   # React frontend
│   ├── src/
│   │   ├── routes/        # TanStack Router file-based routes
│   │   ├── hooks/         # React Query data hooks
│   │   ├── components/    # shared components (Select, ImageUpload, Skeleton, …)
│   │   ├── lib/           # API client, utilities
│   │   └── types/         # TypeScript types
│   └── dist/              # build output (served by the backend)
├── deploy/
│   ├── Containerfile      # Podman multi-stage build
│   ├── nginx/             # nginx reverse-proxy config
│   └── systemd/           # systemd unit file
├── data/                  # runtime data (gitignored)
│   ├── wheremystuff.db    # SQLite database
│   └── images/            # uploaded images
├── justfile               # task runner
└── Cargo.toml             # Rust workspace
```

## API Overview

REST-style, under `/api/v1`:

- `GET/POST/PUT/DELETE /categories/*` — category management
- `GET/POST/PUT/DELETE /containers/*` — containers (tree hierarchy)
- `GET/POST/PUT/DELETE /items/*` — items (with image upload)
- `GET/POST/PUT/DELETE /tags/*` — tags
- `GET /search?q=` — FTS5 full-text search (trigram tokenizer, CJK-friendly)
- `GET /stats` — statistics overview

## License

[MIT](LICENSE)
