-- 0005_import_staging_schema.sql
-- Durable DOCX import jobs and staged drafts for Author Studio.

CREATE TABLE IF NOT EXISTS import_jobs (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  status TEXT NOT NULL,
  warnings_json TEXT NOT NULL,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS staged_chapter_drafts (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  normalized_document_json TEXT NOT NULL,
  compiled_preview_json TEXT NOT NULL,
  status TEXT NOT NULL,
  validation_errors_json TEXT NOT NULL,
  rejection_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES import_jobs(id)
);

CREATE INDEX IF NOT EXISTS idx_staged_chapter_drafts_status
  ON staged_chapter_drafts(status);

CREATE INDEX IF NOT EXISTS idx_staged_chapter_drafts_created_at
  ON staged_chapter_drafts(created_at);
