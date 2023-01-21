-- =============================================================
-- 0005_contributor.sql — community & sponsorship
-- Tables: contributor, sponsor, contributor_application,
--         sponsor_application
--
-- Derived from models/contributor.go + repository/contributor_repo.go.
-- Application status lifecycle: 'PENDING' (default, set by service)
-- -> 'APPROVED' | 'REJECTED' (ReviewApplicationRequest).
-- Sponsor tiers ordered by repo query: Platinum > Gold > Silver > Bronze.
-- =============================================================

CREATE TABLE IF NOT EXISTS contributor (
    id            text        NOT NULL,
    name          text        NOT NULL,
    email         text,
    avatar        text,
    contributions text[]      NOT NULL DEFAULT '{}',
    mandarin_level text,
    portfolio     text,
    bio           text,
    is_active     boolean     NOT NULL DEFAULT true,
    joined_at     timestamptz NOT NULL DEFAULT now(),
    user_id       text,       -- optional link to a "user" account (not FK-enforced in code)
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT contributor_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_contributor_active ON contributor (is_active);

CREATE TABLE IF NOT EXISTS sponsor (
    id            text        NOT NULL,
    name          text        NOT NULL,
    logo          text,
    website       text,
    tier          text,       -- Platinum | Gold | Silver | Bronze (else sorted last)
    description   text,
    is_active     boolean     NOT NULL DEFAULT true,
    started_at    timestamptz NOT NULL DEFAULT now(),
    ended_at      timestamptz,
    contact_email text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT sponsor_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_sponsor_active ON sponsor (is_active);

CREATE TABLE IF NOT EXISTS contributor_application (
    id               text        NOT NULL,
    name             text        NOT NULL,
    email            text        NOT NULL,
    contribution_area text       NOT NULL,
    mandarin_level   text,
    portfolio        text,
    message          text,
    status           text        NOT NULL DEFAULT 'PENDING',
    reviewed_by      text,
    reviewed_at      timestamptz,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT contributor_application_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS sponsor_application (
    id           text        NOT NULL,
    company_name text        NOT NULL,
    email        text        NOT NULL,
    website      text,
    message      text,
    tier_interest text,
    status       text        NOT NULL DEFAULT 'PENDING',
    reviewed_by  text,
    reviewed_at  timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT sponsor_application_pkey PRIMARY KEY (id)
);

-- Admin listing endpoints order by created_at DESC unconditionally;
-- additive index (not present in the legacy single-file schema).
CREATE INDEX IF NOT EXISTS idx_contributor_application_created
    ON contributor_application (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sponsor_application_created
    ON sponsor_application (created_at DESC);
