-- Single-user credentials. The password is stored as an Argon2id PHC string,
-- never in plaintext. The CHECK constraint keeps the table to exactly one row.
CREATE TABLE auth_user (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
