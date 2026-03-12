-- 0001_content_schema.sql
-- Foundational schema for normalized chapter source + compiled output snapshots.

CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  status TEXT NOT NULL,
  chapter_type TEXT NOT NULL,
  visibility_json TEXT NOT NULL,
  theme_json TEXT NOT NULL,
  source_import_json TEXT NOT NULL,
  normalized_document_json TEXT NOT NULL,
  compiled_output_json TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chapter_versions (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL,
  status TEXT NOT NULL,
  normalized_snapshot_json TEXT NOT NULL,
  compiled_snapshot_json TEXT NOT NULL,
  published_at TEXT,
  rollback_eligible INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (chapter_id) REFERENCES chapters(id)
);

CREATE INDEX IF NOT EXISTS idx_chapter_versions_chapter_id
  ON chapter_versions(chapter_id);
