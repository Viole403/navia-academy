-- =============================================================
-- 0007_resonance.sql — word-origin emotional reactions
-- Tables: resonance
--
-- Derived from models/resonance.go + repository/resonance_repo.go
-- (ResonanceReaction / ResonanceEvent) and the clamping in
-- service/resonance_service.go (intensity forced into 1..3).
--
-- NOTE: this table is referenced by ResonanceRepository but was
-- MISSING from the previously-provisioned dev database; this file
-- closes that gap.
-- =============================================================

CREATE TABLE IF NOT EXISTS resonance (
    id         bigint      GENERATED ALWAYS AS IDENTITY,
    origin     text        NOT NULL,  -- radical / head-character key
    emotion    text        NOT NULL,
    user_id    text        NOT NULL,
    intensity  integer     NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT resonance_pkey PRIMARY KEY (id),
    -- canonical set from models.ResonanceEmotions (service normalizes aliases)
    CONSTRAINT chk_resonance_emotion CHECK (
        emotion IN ('inspired', 'warm', 'curious', 'nostalgic', 'calm', 'excited')
    ),
    -- service clamps intensity to [1,3]
    CONSTRAINT chk_resonance_intensity CHECK (intensity BETWEEN 1 AND 3),
    CONSTRAINT resonance_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES "user" (id) ON DELETE CASCADE
);

-- Totals/Live: WHERE origin (= AND created_at window) GROUP BY emotion
CREATE INDEX IF NOT EXISTS idx_resonance_origin ON resonance (origin);
-- RecentByUser: WHERE user_id ORDER BY created_at DESC LIMIT $2
CREATE INDEX IF NOT EXISTS idx_resonance_user_created ON resonance (user_id, created_at DESC);
