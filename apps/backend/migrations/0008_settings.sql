-- =============================================================
-- 0008_settings.sql — per-user app settings
-- Tables: user_settings
--
-- Derived from models/settings.go + repository/settings_repo.go.
-- One row per user (Upsert targets ON CONFLICT (user_id)).
-- Defaults mirror the shipped UI defaults.
-- =============================================================

CREATE TABLE IF NOT EXISTS user_settings (
    id                text        NOT NULL,
    user_id           text        NOT NULL,
    theme             text        NOT NULL DEFAULT 'scholar',
    mode              text        NOT NULL DEFAULT 'light',
    font_size         text        NOT NULL DEFAULT 'md',
    hanzi_size        text        NOT NULL DEFAULT 'md',
    display_mode      jsonb,      -- NULL falls back to models.DefaultDisplayMode in Go
    audio_rate        numeric     NOT NULL DEFAULT 1,
    autoplay_audio    boolean     NOT NULL DEFAULT true,
    sound_effects     boolean     NOT NULL DEFAULT true,
    daily_goal_min    integer     NOT NULL DEFAULT 15,
    new_words_per_day integer     NOT NULL DEFAULT 10,
    max_reviews_per_day integer   NOT NULL DEFAULT 20,
    locale            text        NOT NULL DEFAULT 'en',
    reduce_motion     boolean     NOT NULL DEFAULT false,
    high_contrast     boolean     NOT NULL DEFAULT false,
    density           text        NOT NULL DEFAULT 'comfortable',
    focus_mode        boolean     NOT NULL DEFAULT false,
    daily_reminder    boolean     NOT NULL DEFAULT false,
    reminder_time     text        NOT NULL DEFAULT '18:00',
    weekly_summary    boolean     NOT NULL DEFAULT false,
    streak_alerts     boolean     NOT NULL DEFAULT false,
    public_profile    boolean     NOT NULL DEFAULT false,
    show_stats        boolean     NOT NULL DEFAULT true,
    hidden_widgets    text[]      NOT NULL DEFAULT '{}',
    active_exam_type  text        NOT NULL DEFAULT 'hsk',
    voice_gender      text        NOT NULL DEFAULT 'female',
    updated_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT user_settings_pkey PRIMARY KEY (id),
    CONSTRAINT user_settings_user_id_key UNIQUE (user_id),
    CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES "user" (id) ON DELETE CASCADE
);
