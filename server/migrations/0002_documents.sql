CREATE TABLE item_documents (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    filename TEXT NOT NULL,
    doc_type TEXT NOT NULL DEFAULT 'pdf',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_item_documents_item ON item_documents(item_id);