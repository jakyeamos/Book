CREATE TABLE IF NOT EXISTS v2_migrations (
  version TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v2_chapters (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL UNIQUE CHECK (order_index >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v2_chapter_revisions (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES v2_chapters(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL CHECK (revision_number > 0),
  document JSONB NOT NULL,
  experience JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'direct-link', 'conditional')),
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chapter_id, revision_number)
);

CREATE TABLE IF NOT EXISTS v2_chapter_publications (
  chapter_id TEXT PRIMARY KEY REFERENCES v2_chapters(id) ON DELETE CASCADE,
  revision_id TEXT NOT NULL UNIQUE REFERENCES v2_chapter_revisions(id) ON DELETE RESTRICT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v2_audio_assets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('music', 'ambience')),
  storage_key TEXT NOT NULL UNIQUE,
  checksum TEXT NOT NULL UNIQUE,
  byte_size BIGINT NOT NULL CHECK (byte_size > 0),
  duration_ms INTEGER NOT NULL CHECK (duration_ms > 0),
  waveform_peaks JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'ready', 'quarantined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v2_audio_scenes (
  id TEXT PRIMARY KEY,
  revision_id TEXT NOT NULL REFERENCES v2_chapter_revisions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  start_block_id TEXT NOT NULL,
  end_block_id TEXT NOT NULL,
  order_index INTEGER NOT NULL CHECK (order_index >= 0),
  UNIQUE (revision_id, order_index)
);

CREATE TABLE IF NOT EXISTS v2_audio_cues (
  id TEXT PRIMARY KEY,
  scene_id TEXT NOT NULL REFERENCES v2_audio_scenes(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL REFERENCES v2_audio_assets(id) ON DELETE RESTRICT,
  layer TEXT NOT NULL CHECK (layer IN ('music', 'ambience')),
  start_block_id TEXT NOT NULL,
  end_block_id TEXT NOT NULL,
  offset_ms INTEGER NOT NULL DEFAULT 0 CHECK (offset_ms >= 0),
  loop BOOLEAN NOT NULL DEFAULT false,
  gain_db NUMERIC NOT NULL DEFAULT 0 CHECK (gain_db >= -60 AND gain_db <= 12),
  fade_in_ms INTEGER NOT NULL DEFAULT 0 CHECK (fade_in_ms >= 0),
  fade_out_ms INTEGER NOT NULL DEFAULT 0 CHECK (fade_out_ms >= 0),
  duck_music_db NUMERIC CHECK (duck_music_db >= -60 AND duck_music_db <= 0),
  duck_attack_ms INTEGER CHECK (duck_attack_ms >= 0),
  duck_release_ms INTEGER CHECK (duck_release_ms >= 0)
);

CREATE INDEX IF NOT EXISTS v2_chapter_revisions_chapter_idx ON v2_chapter_revisions(chapter_id, revision_number DESC);
CREATE INDEX IF NOT EXISTS v2_audio_cues_scene_idx ON v2_audio_cues(scene_id);
