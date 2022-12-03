-- =============================================================
-- 0003_content.sql — content authoring / review workflow
-- Tables: content_items
--
-- Derived from models/content.go + repository/content_repo.go.
-- Composite PK (lang, domain, id): Get/GetMeta/Update/Review all
-- address rows by that triple.
--
-- NOTE: there is NO vocabulary table in this backend. Vocabulary is
-- read-only content served from R2/CDN (apps/web data-client); the
-- DB never stores it (models/vocabulary.go only defines filter
-- structs + AudioRecord, the latter living in 0009_audio_tts.sql).
-- =============================================================

CREATE TABLE IF NOT EXISTS content_items (
    id          text        NOT NULL,
    lang        text        NOT NULL,
    domain      text        NOT NULL,
    ref         text        NOT NULL DEFAULT '',
    pos         integer     NOT NULL DEFAULT 0,
    kind        text        NOT NULL DEFAULT 'list',
    payload     jsonb       NOT NULL,
    status      text        NOT NULL DEFAULT 'draft',  -- draft | review | published | rejected
    created_by  text        NOT NULL,
    reviewer_id text,
    reviewed_at timestamptz,
    review_note text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT content_items_pkey PRIMARY KEY (lang, domain, id)
);

-- List() filters by status; ORDER BY updated_at DESC
CREATE INDEX IF NOT EXISTS idx_content_status  ON content_items (status);
CREATE INDEX IF NOT EXISTS idx_content_updated ON content_items (updated_at DESC);
