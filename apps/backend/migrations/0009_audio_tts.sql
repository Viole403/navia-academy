-- =============================================================
-- 0009_audio_tts.sql — TTS audio cache
-- Tables: audio_cache
--
-- Derived from repository/audio_repo.go + service/tts_service.go
-- (models.AudioRecord lives in models/vocabulary.go).
-- Cache key = sha256(text::locale::gender) truncated to 16 bytes;
-- Save uses ON CONFLICT (text_hash) DO NOTHING.
-- =============================================================

CREATE TABLE IF NOT EXISTS audio_cache (
    id         text        NOT NULL,  -- uuid v4 generated in tts_service.go
    text_hash  text        NOT NULL,
    text       text        NOT NULL,
    locale     text        NOT NULL DEFAULT 'zh-CN',
    gender     text        NOT NULL DEFAULT 'female',
    url        text        NOT NULL,  -- public R2/CDN object URL (audio/<hash>.mp3)
    provider   text        NOT NULL DEFAULT 'openai',
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT audio_cache_pkey PRIMARY KEY (id),
    CONSTRAINT audio_cache_text_hash_unique UNIQUE (text_hash)
);

CREATE INDEX IF NOT EXISTS idx_audio_cache_hash ON audio_cache (text_hash);
