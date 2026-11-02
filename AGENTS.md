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

# Frontend build / typecheck (build runs vite first — it regenerates routeTree.gen.ts)
cd web && pnpm exec tsc -b
cd web && pnpm build

# Login credentials (single user; restart the server after set-user)
cargo run -p server -- set-user
cargo run -p server -- show-user

# Tests (none exist yet; server/tests/ is empty)
cargo test -p server
```

- **Must run the server from the repo root** — it serves `web/dist` and `data/` via relative paths.
- Single-binary deploy: `pnpm build` in `web/`, then `cargo run -p server` serves the SPA as fallback.
- There is no lint/format config, no CI, no pre-commit. `tsc -b` is the only frontend gate (`strict`, `noUnusedLocals`, `noUnusedParameters`).
- No `rust-toolchain` pin; edition 2021.

## Config

Optional `config.toml` (or `CONFIG_PATH` env). If missing, defaults apply — no setup required. Fields: `[server] host/port`, `[data] db_path/image_dir`, `[upload] max_file_size` (e.g. `"10MB"`). See `server/src/config.rs`.

## Auth (single user)

- Credentials live in the `auth_user` table (one row, Argon2id PHC hash — never plaintext). No config file involved.
- CLI: `server set-user` (prompted interactively; hidden password input, confirmation, min 8 chars) sets/updates username+password; `server show-user` prints the current username. Changes apply **after a server restart** (the gate is decided at startup).
- **No user configured → no auth at all** (everything open). Once configured, a session cookie (`wms_session`, HttpOnly, in-memory, 14-day TTL) gates every route except `/login`, `/assets/*`, favicons, and `POST /api/v1/auth/login`. HTML requests redirect to `/login`; API requests get 401 JSON.
- Restarting the server logs every device out (sessions are memory-only). Failed logins sleep 400ms and always run the hash check (anti-timing-oracle).
- Frontend: `web/src/routes/login.tsx` (full-page, no sidebar), `useMe`/`useLogin`/`useLogout` in `web/src/hooks/useAuth.ts`; `api.ts` redirects the SPA to `/login` on any 401 outside `/auth/*`.

## Database & migrations

- SQLite via `sqlx::sqlite`; `server/migrations/*.sql` are embedded with `sqlx::migrate!` and run **automatically on startup** — no separate migrate command. Schema changes = new migration file + rebuild.
- IDs are UUID strings. Timestamps are TEXT (`datetime('now')`).
- `data/` is gitignored (DB + images). `sqlx` queries are runtime (`query_as`), not compile-time checked — no `DATABASE_URL` / offline cache needed.

## Search (non-obvious)

- FTS5 table `items_fts` with **`tokenize = 'trigram'`** (CJK support). Index fields: item name/description/location-note, tag names, container label, and full container/category paths.
- FTS is **explicitly synced in code** (`services/search_index.rs`), not by triggers:
  - item create/update → `sync_item`; item delete → row delete from `items_fts`
  - full `sync_all` on every server start
  - tag/container/category rename & delete → `sync_tag` / `sync_container_tree` / `sync_category_tree` (or `sync_items` after delete), so renames don't leave stale index entries
  - `sync_item` indexes the **full container and category paths** (root → leaf), so searching a parent container/category finds nested items
- Queries with **&lt; 3 characters fall back to `LIKE`** (trigram needs ≥3); it matches item fields, label, and ancestor container/category names. FTS path wraps the query as a quoted phrase (`"q"`), doubling embedded `"`. See `repositories/search.rs`.
- Search results include container breadcrumb path and `<mark>` highlight snippets; the LIKE path builds highlights in Rust, and all snippets are HTML-escaped before the SPA injects them with `dangerouslySetInnerHTML`.

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

<!-- OPENWIKI:START -->

## OpenWiki

This repository has a generated `openwiki/` evidence index. It is optional just-in-time context, not required startup reading.

- Do not enumerate, preload, or search wikis at task start. Use retrieval when the user asks for it, when unfamiliar architecture or dependency behavior materially affects the task, or when source inspection leaves an important uncertainty. Stop once the question is grounded.
- When those conditions apply and OpenWiki retrieval tools are available, use `openwiki_search` for just-in-time context and `openwiki_read` for the relevant complete sections. If search returns `workspace_required`, ask which listed workspace to use and retry with its ID.
- Use `openwiki_list_workspaces` or `openwiki_list_wikis` when workspace membership itself needs to be discovered.
- If the retrieval tools are unavailable, read `openwiki/quickstart.md` and follow its links to the relevant pages.
- Treat source code and tests as authoritative. A brief's unknowns and review items are verification gaps, not automatic requirements.
- Prefer the narrowest quiet validation that proves the changed behavior. Preserve complete failure output.

The scheduled OpenWiki GitHub Actions workflow refreshes the repository wiki. Do not hand-edit generated OpenWiki pages unless explicitly asked; prefer updating source code/docs and letting OpenWiki regenerate.

<!-- OPENWIKI:END -->
