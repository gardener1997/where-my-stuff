ALTER TABLE items ADD COLUMN location_note TEXT;

-- Rebuild FTS index to include location_note (sync_all repopulates on next startup)
DROP TABLE items_fts;
CREATE VIRTUAL TABLE items_fts USING fts5(
    item_id UNINDEXED,
    name,
    description,
    location_note,
    tags,
    container_name,
    container_label,
    category_name,
    tokenize = 'trigram'
);
