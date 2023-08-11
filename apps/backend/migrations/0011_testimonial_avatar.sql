-- =============================================================
-- 0011_testimonial_avatar.sql — real profile photos for testimonials
--
-- Adds an optional avatar column (public CDN / photo URL) so the
-- landing testimonial columns can show real user faces instead of
-- letter initials.
--
-- Idempotent:
--   * ALTER ... IF NOT EXISTS
--   * UPDATE of the original 0010 seeds (only when avatar IS NULL)
--   * New seed rows use ON CONFLICT (id) DO NOTHING
-- =============================================================

ALTER TABLE testimonial ADD COLUMN IF NOT EXISTS avatar text;

-- Backfill real photos onto the original 0010 dev seeds (photo URLs are
-- real CC-licensed portraits from Unsplash — not AI-generated).
UPDATE testimonial
SET avatar = CASE id
    WHEN 'testi-seed-1' THEN 'https://images.unsplash.com/photo-1753487050317-919a2b26a6ed?auto=format&fit=crop&w=150&h=150'
    WHEN 'testi-seed-2' THEN 'https://images.unsplash.com/photo-1629142353967-5dc91968c701?auto=format&fit=crop&w=150&h=150'
    WHEN 'testi-seed-3' THEN 'https://images.unsplash.com/photo-1643646805556-350c057663dd?auto=format&fit=crop&w=150&h=150'
END
WHERE id IN ('testi-seed-1', 'testi-seed-2', 'testi-seed-3')
  AND avatar IS NULL;

-- -------------------------------------------------------------
-- DEV SEED — expanded APPROVED testimonials with real photos
-- (names/roles are invented; photos are real CC-licensed portraits).
-- -------------------------------------------------------------
INSERT INTO testimonial (id, name, role_label, quote, status, reviewed_by, reviewed_at, avatar)
VALUES
    ('testi-seed-4', 'Budi Hartanto', 'Persiapan HSK 4',
     'Setelah tiga bulan latihan di sini, vocabulary HSK 4 yang tadinya bikin pusing sekarang nempel sendiri lewat SRS-nya.',
     'APPROVED', 'seed', now(), 'https://images.unsplash.com/photo-1770058428099-f2d64ab34006?auto=format&fit=crop&w=150&h=150'),
    ('testi-seed-5', 'Sari Wulandari', 'Persiapan TOCFL Band A',
     'Mode karakter tradisional sama zhuyin-nya lengkap. Buat yang belajar TOCFL, ini nggak ada tandingannya.',
     'APPROVED', 'seed', now(), 'https://images.unsplash.com/photo-1525547843489-d0aab95e5ce1?auto=format&fit=crop&w=150&h=150'),
    ('testi-seed-6', 'Rizky Pratama', 'JLPT N3',
     'Planner-nya serius. Dari placement test langsung dapet jalur yang masuk akal dan skor mock naik tiap minggu.',
     'APPROVED', 'seed', now(), 'https://images.unsplash.com/photo-1758598305492-f56a1bd121c3?auto=format&fit=crop&w=150&h=150'),
    ('testi-seed-7', 'Ayu Lestari', 'Persiapan GOETHE A2',
     'Latihan listening sama penulisannya bikin aku pede pas ujian. Audio TTS-nya juga enak didengerin berulang-ulang.',
     'APPROVED', 'seed', now(), 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150'),
    ('testi-seed-8', 'Agus Setiawan', 'TOEFL iBT',
     'Aku suka mode grid tulisnya buat belajar disiplin. Review harian yang singkat justru paling ngena.',
     'APPROVED', 'seed', now(), 'https://images.unsplash.com/photo-1721713478248-ded19734143d?auto=format&fit=crop&w=150&h=150'),
    ('testi-seed-9', 'Maya Anggraini', 'Persiapan HSK 2',
     'Baru belajar bahasa Mandarin tapi nggak bingung mau mulai dari mana. Materinya urut dan dosisnya pas.',
     'APPROVED', 'seed', now(), 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&h=150'),
    ('testi-seed-10', 'Doni Saputra', 'JLPT N5',
     'Placement test-nya akurat banget. Ternyata levelku di bawah perkiraan, untung dikoreksi dari awal.',
     'APPROVED', 'seed', now(), 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&h=150'),
    ('testi-seed-11', 'Nadia Kusuma', 'Persiapan TOCFL Band B',
     'Fitur notes sama bookmarks-nya ngebantu banget buat nyatet kosakata yang sering kelupaan. Sangat direkomendasikan.',
     'APPROVED', 'seed', now(), 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&h=150'),
    ('testi-seed-12', 'Yoga Firmansyah', 'Persiapan HSK 5',
     'Review jangka panjangnya nyata. Nada yang dulu sering salah sekarang kebawa otomatis pas ngomong.',
     'APPROVED', 'seed', now(), 'https://images.unsplash.com/photo-1516011362164-3095a82b0af9?auto=format&fit=crop&w=150&h=150'),
    ('testi-seed-13', 'Dewi Pratiwi', 'Persiapan GOETHE B1',
     'Aku bisa track progres harian dan lihat mana yang perlu difokuskan. Strukturnya bikin belajar jadi kebiasaan.',
     'APPROVED', 'seed', now(), 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150'),
    ('testi-seed-14', 'Hendra Gunawan', 'TOEFL iBT',
     'Grammar points-nya dijelasin pakai contoh yang relevan, bukan teori kering. Bikin paham, bukan cuma hafal.',
     'APPROVED', 'seed', now(), 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150'),
    ('testi-seed-15', 'Rina Setiowati', 'Persiapan HSK 3',
     'Grid SRS dan latihan nada bikin aku lebih percaya diri. Hasilnya keliatan dari skor mock test yang naik terus.',
     'APPROVED', 'seed', now(), 'https://images.unsplash.com/photo-1531662672181-81e987192c91?auto=format&fit=crop&w=150&h=150')
ON CONFLICT (id) DO NOTHING;
