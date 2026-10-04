-- D1 数据库 Schema
-- 执行: wrangler d1 execute heng --file=./src/db/schema.sql

CREATE TABLE IF NOT EXISTS entries (
  id         TEXT PRIMARY KEY,
  author     TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  resolved_at TEXT DEFAULT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC);
