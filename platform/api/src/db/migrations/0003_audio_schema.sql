-- 0003_audio_schema.sql
-- Production persistence for admin-uploaded audio assets and block-based cues.

CREATE TABLE IF NOT EXISTS audio_assets (
  id TEXT PRIMARY KEY,
  asset_type TEXT NOT NULL,
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  duration_seconds REAL NOT NULL,
  default_volume REAL NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audio_cues (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  cue_layer TEXT NOT NULL,
  start_anchor_json TEXT NOT NULL,
  end_anchor_json TEXT NOT NULL,
  volume REAL NOT NULL,
  fade_in_ms INTEGER NOT NULL,
  fade_out_ms INTEGER NOT NULL,
  loop INTEGER NOT NULL,
  overlap_mode TEXT NOT NULL,
  status TEXT NOT NULL,
  validation_issues_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (chapter_id) REFERENCES chapters(id),
  FOREIGN KEY (asset_id) REFERENCES audio_assets(id)
);

CREATE INDEX IF NOT EXISTS idx_audio_cues_chapter_id
  ON audio_cues(chapter_id);
