ALTER TABLE v2_audio_assets ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'audio/mpeg';
ALTER TABLE v2_audio_assets ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE v2_audio_assets ADD COLUMN IF NOT EXISTS cleanup_after TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS v2_audio_assets_cleanup_idx ON v2_audio_assets(cleanup_after) WHERE status = 'pending';
