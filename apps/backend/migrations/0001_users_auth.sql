-- =============================================================
-- 0001_users_auth.sql — identity & auth domain
-- Tables: "user", account, session, verification
--
-- Derived from models/user.go + repository/user_repo.go.
-- "user" is a reserved word and MUST stay quoted (all Go queries
-- use FROM/INTO "user"). Auth = stateless JWT; `session` mirrors
-- models.Session but currently has no read/write path in Go code
-- (kept for schema parity — see migration summary).
--
-- FK note: every other domain table references "user"(id), so this
-- file must always run first.
-- =============================================================

CREATE TABLE IF NOT EXISTS "user" (
    id             text        NOT NULL,
    name           text        NOT NULL DEFAULT '',
    email          text        NOT NULL,
    email_verified boolean     NOT NULL DEFAULT false,
    image          text,
    role           text        NOT NULL DEFAULT 'student',
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT user_pkey PRIMARY KEY (id),
    CONSTRAINT user_email_key UNIQUE (email),
    -- roles enforced by service.ValidRoles (student/contributor/reviewer/admin)
    CONSTRAINT chk_user_role CHECK (
        role IN ('student', 'contributor', 'reviewer', 'admin')
    )
);

CREATE TABLE IF NOT EXISTS account (
    id                       text        NOT NULL,
    account_id               text        NOT NULL,
    provider_id              text        NOT NULL DEFAULT 'email',
    user_id                  text        NOT NULL,
    access_token             text,
    refresh_token            text,
    id_token                 text,
    access_token_expires_at  timestamptz,
    refresh_token_expires_at timestamptz,
    scope                    text,
    password                 text,       -- bcrypt hash (provider_id='email')
    created_at               timestamptz NOT NULL DEFAULT now(),
    updated_at               timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT account_pkey PRIMARY KEY (id),
    CONSTRAINT account_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES "user" (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_account_user ON account (user_id);

CREATE TABLE IF NOT EXISTS session (
    id         text        NOT NULL,
    expires_at timestamptz NOT NULL,
    token      text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    ip_address text,
    user_agent text,
    user_id    text        NOT NULL,
    CONSTRAINT session_pkey PRIMARY KEY (id),
    CONSTRAINT session_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES "user" (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_session_user ON session (user_id);

-- Verification tokens (email confirmation / password reset).
-- created_at / updated_at nullable to match models.Verification (*time.Time).
CREATE TABLE IF NOT EXISTS verification (
    id         text        NOT NULL,
    identifier text        NOT NULL,
    value      text        NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT verification_pkey PRIMARY KEY (id)
);
