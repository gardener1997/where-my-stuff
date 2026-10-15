# AGENTS.md

Personal inventory app ("东西在哪"): find where a thing is stored. Full stack lives in this repo.

Design/product spec: `docs/design.md` (API shapes, ER model, page map). It is partly aspirational — trust the code for what is implemented.

## Layout

- `server/` — Rust (Axum + sqlx + SQLite) API, binary name `server`
- `web/` — Vite + React 19 + TanStack Router/Query + Tailwind v4 (pnpm)
- `data/` — runtime SQLite DB + uploaded images (gitignored)
- Root `Cargo.toml` is a workspace with a single member: `server`

Server layering (keep this boundary): `routes.rs` → `handlers/` (HTTP only) → `services/` (images, FTS sync) → `repositories/` (SQL) → `models/` (DTOs).

## Commands

Run from repo root unless noted.

```bash
# Backend (defaults: 127.0.0.1:3000, data/wheremystuff.db, data/images)
cargo run -p server

# Frontend dev (proxies /api → http://127.0.0.1:3000)
cd web && pnpm dev

# Frontend typecheck / build (build = tsc -b && vite build)
cd web && pnpm exec tsc -b
cd web && pnpm build

# Tests (none exist yet; server/tests/ is empty)
cargo test -p server
```

- **Must run the server from the repo root** — it serves `web/dist` and `data/` via relative paths.
- Single-binary deploy: `pnpm build` in `web/`, then `cargo run -p server` serves the SPA as fallback.
- There is no lint/format config, no CI, no pre-commit. `tsc -b` is the only frontend gate (`strict`, `noUnusedLocals`, `noUnusedParameters`).
- No `rust-toolchain` pin; edition 2021.

## Config

Optional `config.toml` (or `CONFIG_PATH` env). If missing, defaults apply — no setup required. Fields: `[server] host/port`, `[data] db_path/image_dir`, `[upload] max_file_size` (e.g. `"10MB"`). See `server/src/config.rs`.

## Database & migrations

- SQLite via `sqlx::sqlite`; `server/migrations/*.sql` are embedded with `sqlx::migrate!` and run **automatically on startup** — no separate migrate command. Schema changes = new migration file + rebuild.
- IDs are UUID strings. Timestamps are TEXT (`datetime('now')`).
- `data/` is gitignored (DB + images). `sqlx` queries are runtime (`query_as`), not compile-time checked — no `DATABASE_URL` / offline cache needed.

## Search (non-obvious)

- FTS5 table `items_fts` with **`tokenize = 'trigram'`** (CJK support). Index fields: item name/description, tag names, container name/label, category name.
- FTS is **explicitly synced in code** (`services/search_index.rs`), not by triggers:
  - item create/update → `sync_item`; item delete → row delete from `items_fts`
  - full `sync_all` on every server start
  - **renames of tags/containers/categories do not resync affected items** — search can lag until restart. If you touch those writes, consider calling `sync_item` for linked items.
- Queries with **&lt; 3 characters fall back to `LIKE`** (trigram needs ≥3). FTS path wraps the query as a quoted phrase (`"q"`). See `repositories/search.rs`.
- Search results include container breadcrumb path and `<mark>` highlight snippets.

## Images

- Uploads: multipart field `file`. Allowed: `jpg/jpeg/png/webp`. Default max 10MB. `jpeg` is normalized to `jpg` on disk.
- Layout: `data/images/items/{uuid}.{ext}` + `{uuid}_thumb.{ext}` (300px thumb); containers use `data/images/containers/` and a single `image_path` column.
- API returns filesystem-relative paths (`data/images/...`). The SPA renders them as `/{path}` (e.g. `src={`/${item.thumb_path}`}`).
- `main.rs` serves `image_dir` at that same URL prefix via `nest_service` (default `/data/images`) — only the image dir is exposed, not the SQLite DB. Vite proxies `/data/images` to the backend in dev.

## Web notes

- Path alias `@/*` → `web/src/*`. API client: `web/src/lib/api.ts` (`/api/v1` prefix). Mirror Rust DTOs in `web/src/types/index.ts` when the API changes.
- `web/src/routeTree.gen.ts` is **generated** by `@tanstack/router-plugin` — never hand-edit; it updates when routes under `web/src/routes/` change (file-based routing).
- UI text is Chinese. `components/ui/` is empty scaffolding (shadcn-style deps are present but unused).
- `docs/design.md` lists files that do not exist yet (`App.tsx`, many `components/*`, README). Do not create them just because the doc names them.

## API

REST under `/api/v1` (categories, containers, items, tags, search, stats). Route table in `server/src/routes.rs`. CORS is permissive. Errors are JSON `{ "error": string }` via `error::AppError`.
