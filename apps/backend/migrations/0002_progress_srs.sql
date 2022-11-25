-- =============================================================
-- 0002_progress_srs.sql — learner progress & spaced repetition
-- Tables: user_progress, achievement, study_session, task,
--         game_result, srs_card
--
-- Derived from models/progress.go + repository/progress_repo.go and
-- repository/srs_repo.go.
-- =============================================================

CREATE TABLE IF NOT EXISTS user_progress (
    id                 text        NOT NULL,
    user_id            text        NOT NULL,
    xp                 integer     NOT NULL DEFAULT 0,
    streak             integer     NOT NULL DEFAULT 0,
    best_streak        integer     NOT NULL DEFAULT 0,
    last_study_date    timestamptz,
    started_at         timestamptz NOT NULL DEFAULT now(),
    onboarding         jsonb,      -- {"completed":false,"step":0} default is app-side
    placement          jsonb,
    saved_word_ids     text[]      NOT NULL DEFAULT '{}',
    difficult_item_ids text[]      NOT NULL DEFAULT '{}',
    data               jsonb,
    CONSTRAINT user_progress_pkey PRIMARY KEY (id),
    -- one progress row per user: Upsert targets ON CONFLICT (user_id)
    CONSTRAINT user_progress_user_id_key UNIQUE (user_id),
    CONSTRAINT user_progress_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES "user" (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_progress_user ON user_progress (user_id);

CREATE TABLE IF NOT EXISTS achievement (
    id             text        NOT NULL,  -- deterministic "ach-<user>-<achievement>"
    user_id        text        NOT NULL,
    achievement_id text,
    unlocked_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT achievement_pkey PRIMARY KEY (id),
    -- CreateAchievement relies ON CONFLICT DO NOTHING against this unique pair
    CONSTRAINT achievement_user_id_achievement_id_key UNIQUE (user_id, achievement_id),
    CONSTRAINT achievement_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES "user" (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS study_session (
    id      text   NOT NULL,
    user_id text   NOT NULL,
    date    text,             -- YYYY-MM-DD string, not a date column (matches Go model)
    minutes integer NOT NULL DEFAULT 0,
    xp      integer NOT NULL DEFAULT 0,
    skills  jsonb,
    CONSTRAINT study_session_pkey PRIMARY KEY (id),
    CONSTRAINT study_session_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES "user" (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_study_user ON study_session (user_id);

CREATE TABLE IF NOT EXISTS task (
    id         text        NOT NULL,
    user_id    text        NOT NULL,
    content    text,
    completed  boolean     NOT NULL DEFAULT false,
    due_date   timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT task_pkey PRIMARY KEY (id),
    CONSTRAINT task_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES "user" (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_user ON task (user_id);

CREATE TABLE IF NOT EXISTS game_result (
    id        text        NOT NULL,
    user_id   text        NOT NULL,
    game_id   text,
    accuracy  numeric     NOT NULL DEFAULT 0,
    score     integer     NOT NULL DEFAULT 0,
    played_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT game_result_pkey PRIMARY KEY (id),
    CONSTRAINT game_result_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES "user" (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_game_user ON game_result (user_id);

-- SRS review state. "interval" is a keyword and MUST stay quoted
-- (srs_repo.go queries it as "interval").
CREATE TABLE IF NOT EXISTS srs_card (
    id             text        NOT NULL,  -- deterministic "srs-<user>-<item>"
    user_id        text        NOT NULL,
    item_id        text        NOT NULL,
    kind           text        NOT NULL,  -- word | character | grammar (SRSReviewRequest)
    mastery        integer     NOT NULL DEFAULT 0,
    "interval"     integer     NOT NULL DEFAULT 0,
    ease           numeric     NOT NULL DEFAULT 2.5,
    due_date       timestamptz NOT NULL,
    total_reviews  integer     NOT NULL DEFAULT 0,
    correct_streak integer     NOT NULL DEFAULT 0,
    last_review    timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT srs_card_pkey PRIMARY KEY (id),
    CONSTRAINT srs_card_user_id_item_id_kind_key UNIQUE (user_id, item_id, kind),
    CONSTRAINT srs_card_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES "user" (id) ON DELETE CASCADE
);

-- GetDueCards / GetDueCount: WHERE user_id AND due_date <= NOW()
CREATE INDEX IF NOT EXISTS idx_srs_due ON srs_card (user_id, due_date);
-- GetCard(s): WHERE user_id AND item_id (= ANY($2))
CREATE INDEX IF NOT EXISTS idx_srs_item ON srs_card (user_id, item_id);
