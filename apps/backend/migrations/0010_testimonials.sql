-- =============================================================
-- 0010_testimonials.sql — real learner testimonials
-- Table: testimonial (+ dev/demo seed for contributor & testimonial)
--
-- Lifecycle mirrors contributor_application: 'PENDING' (default,
-- set by service) -> 'APPROVED' | 'REJECTED'. Only APPROVED rows
-- are served by the public GET /testimonials endpoint.
--
-- SEED blocks are idempotent demo content for local/dev databases
-- (ON CONFLICT DO NOTHING). Production manages rows via the admin
-- endpoints; seeds never overwrite edited data.
-- =============================================================

CREATE TABLE IF NOT EXISTS testimonial (
    id           text        NOT NULL,
    name         text        NOT NULL,
    role_label   text,       -- free-form context, e.g. "Persiapan HSK 3"
    quote        text        NOT NULL,
    status       text        NOT NULL DEFAULT 'PENDING'
                 CONSTRAINT testimonial_status_chk
                 CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    user_id      text,       -- optional link to a "user" account (not FK-enforced in code)
    reviewed_by  text,
    reviewed_at  timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT testimonial_pkey PRIMARY KEY (id)
);

-- Public listing: only approved, newest first.
CREATE INDEX IF NOT EXISTS idx_testimonial_approved_created
    ON testimonial (created_at DESC) WHERE status = 'APPROVED';
-- Admin listing endpoints order by created_at DESC.
CREATE INDEX IF NOT EXISTS idx_testimonial_status_created
    ON testimonial (status, created_at DESC);

-- -------------------------------------------------------------
-- DEV SEED — contributors (demo profiles so /contributors and the
-- landing voices have content on fresh dev databases).
-- -------------------------------------------------------------
INSERT INTO contributor (id, name, email, avatar, contributions, mandarin_level, portfolio, bio, is_active)
VALUES
    ('contrib-seed-1', 'Rani Puspita', 'rani@navia.dev', NULL,
     ARRAY['kurikulum', 'terjemahan'], 'HSK 5', NULL,
     'Menyusun latihan nada dan menerjemahkan kosakata HSK ke Bahasa Indonesia.', true),
    ('contrib-seed-2', 'Bagas Wirawan', 'bagas@navia.dev', NULL,
     ARRAY['audio review', 'qa'], NULL, NULL,
     'Menguji audio TTS dan melaporkan pengucapan yang melenceng.', true),
    ('contrib-seed-3', 'Mei Lina', 'mei@navia.dev', NULL,
     ARRAY['zhuyin', 'konten tocfl'], 'TOCFL Band A', NULL,
     'Memverifikasi zhuyin dan konten TOCFL untuk pelajar tradisional.', true)
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------------
-- DEV SEED — testimonials (APPROVED so the landing section is
-- populated immediately; edit or remove via admin endpoints).
-- -------------------------------------------------------------
INSERT INTO testimonial (id, name, role_label, quote, status, reviewed_by, reviewed_at)
VALUES
    ('testi-seed-1', 'Dewi Anggraini', 'Persiapan HSK 3',
     'Latihan ulangannya bikin karakter dan nadanya nempel. Tiap hari cuma 15 menit tapi progresnya kelihatan.', 'APPROVED',
     'seed', now()),
    ('testi-seed-2', 'Fajar Ramadhan', 'JLPT N4',
     'SRS-nya serius, bukan gamifikasi kosong. Skor mock test naik konsisten sejak pakai planner dari placement test.', 'APPROVED',
     'seed', now()),
    ('testi-seed-3', 'Citra Maharani', 'TOEFL iBT',
     'Grid tulis Tian Zi Ge-nya juga kepakai buat disiplin belajar. Placement test-nya akurat banget ngukur titik mulai.', 'APPROVED',
     'seed', now())
ON CONFLICT (id) DO NOTHING;
