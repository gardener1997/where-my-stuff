CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    icon TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE containers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    label TEXT,
    description TEXT,
    container_type TEXT NOT NULL DEFAULT 'other',
    parent_id TEXT REFERENCES containers(id) ON DELETE SET NULL,
    image_path TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    source_type TEXT NOT NULL DEFAULT 'handmade',
    purchased_at TEXT,
    bought_from TEXT,
    price REAL,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    container_id TEXT REFERENCES containers(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE item_images (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    thumb_path TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE item_tags (
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, tag_id)
);

CREATE INDEX idx_items_category ON items(category_id);
CREATE INDEX idx_items_container ON items(container_id);
CREATE INDEX idx_items_source_type ON items(source_type);
CREATE INDEX idx_containers_parent ON containers(parent_id);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_item_images_item ON item_images(item_id);
CREATE INDEX idx_item_tags_item ON item_tags(item_id);
CREATE INDEX idx_item_tags_tag ON item_tags(tag_id);

-- FTS5 full-text search index (trigram tokenizer for CJK support)
CREATE VIRTUAL TABLE items_fts USING fts5(
    item_id UNINDEXED,
    name,
    description,
    tags,
    container_name,
    container_label,
    category_name,
    tokenize = 'trigram'
);
