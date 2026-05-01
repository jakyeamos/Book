-- 0004_reader_state_ops_schema.sql
-- Reader-owned state plus operational analytics/audit events.

CREATE TABLE IF NOT EXISTS reader_state (
  user_id TEXT PRIMARY KEY,
  progress_json TEXT NOT NULL,
  highlights_json TEXT NOT NULL,
  notes_json TEXT NOT NULL,
  preferences_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS app_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  actor_user_id TEXT,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_app_events_event_type
  ON app_events(event_type);

CREATE INDEX IF NOT EXISTS idx_app_events_created_at
  ON app_events(created_at);
