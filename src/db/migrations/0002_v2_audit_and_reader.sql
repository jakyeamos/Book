CREATE TABLE IF NOT EXISTS v2_audit_events (
  id BIGSERIAL PRIMARY KEY,
  actor_id TEXT,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v2_reader_progress (
  user_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL REFERENCES v2_chapters(id) ON DELETE CASCADE,
  revision_id TEXT NOT NULL REFERENCES v2_chapter_revisions(id) ON DELETE RESTRICT,
  block_id TEXT NOT NULL,
  progress_percent NUMERIC NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, chapter_id)
);

CREATE TABLE IF NOT EXISTS v2_annotations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL REFERENCES v2_chapters(id) ON DELETE CASCADE,
  revision_id TEXT NOT NULL REFERENCES v2_chapter_revisions(id) ON DELETE RESTRICT,
  start_block_id TEXT NOT NULL,
  end_block_id TEXT NOT NULL,
  quote TEXT NOT NULL,
  note TEXT,
  color TEXT NOT NULL DEFAULT 'gold',
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  deleted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS v2_audit_events_entity_idx ON v2_audit_events(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS v2_annotations_user_idx ON v2_annotations(user_id, updated_at DESC);
