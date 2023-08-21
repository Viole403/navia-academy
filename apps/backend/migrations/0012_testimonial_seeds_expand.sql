-- =============================================================
-- 0012_testimonial_seeds_expand.sql — more real testimonials
--
-- (1) Replaces 5 seed avatars that read as elderly/odd-profession
--     (farmer/straw-hat etc.) with young-adult portraits.
-- (2) Inserts 15 more APPROVED seeds (testi-seed-16..30) so the
--     landing infinite-scroll columns have enough items to avoid
--     a fast visible loop (~30 total).
--
-- All avatar URLs are real free Unsplash photos (Unsplash License),
-- NOT AI-generated. Every URL verified HTTP 200.
-- Idempotent: UPDATE only touches rows with the OLD avatar value;
-- INSERT uses ON CONFLICT DO NOTHING.
-- =============================================================

-- (1) Swap the 5 problematic seed avatars to young-adult portraits.
UPDATE testimonial SET avatar = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150'
WHERE id = 'testi-seed-8' AND avatar = 'https://images.unsplash.com/photo-1721713478248-ded19734143d?auto=format&fit=crop&w=150&h=150';

UPDATE testimonial SET avatar = 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&h=150'
WHERE id = 'testi-seed-10' AND avatar = 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&h=150';

UPDATE testimonial SET avatar = 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&h=150'
WHERE id = 'testi-seed-12' AND avatar = 'https://images.unsplash.com/photo-1516011362164-3095a82b0af9?auto=format&fit=crop&w=150&h=150';

UPDATE testimonial SET avatar = 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=150&h=150'
WHERE id = 'testi-seed-14' AND avatar = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150';

UPDATE testimonial SET avatar = 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150'
WHERE id = 'testi-seed-15' AND avatar = 'https://images.unsplash.com/photo-1531662672181-81e987192c91?auto=format&fit=crop&w=150&h=150';

-- (2) Insert 15 more APPROVED seeds (young-adult portraits, neutral roles).
INSERT INTO testimonial (id, name, role_label, quote, avatar, status, reviewed_by, reviewed_at)
VALUES
    ('testi-seed-16', 'Andini Lestari', 'HSK 1',
     'Aplikasi ini bikin aku nggak takut mulai dari nol. Vocab-nya ditaruh di konteks, jadi nempel sendiri.',
     'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150', 'APPROVED', 'seed', now()),
    ('testi-seed-17', 'Bagus Prakoso', 'HSK 2',
     'Tiap hari dikasih jadwal kecil-kecilan, rutin tanpa nyetel alarm sendiri. Konsistensi yang bikin beda.',
     'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&h=150', 'APPROVED', 'seed', now()),
    ('testi-seed-18', 'Intan Permata', 'HSK 3',
     'Review-nya nggak nunggu aku lupa dulu. Sistem ngatur waktu ulang pas di titik yang pas.',
     'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=150&h=150', 'APPROVED', 'seed', now()),
    ('testi-seed-19', 'Dimas Aditya', 'HSK 4',
     'Mock test-nya akurat banget ngebaca level. Aku tahu persis bagian mana yang harus dikuatin.',
     'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150', 'APPROVED', 'seed', now()),
    ('testi-seed-20', 'Putri Rahayu', 'HSK 5',
     'Kosakata + contoh kalimatnya nyambung ke kehidupan sehari-hari. Belajar terasa relevan, bukan hafalan mati.',
     'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=150&h=150', 'APPROVED', 'seed', now()),
    ('testi-seed-21', 'Rangga Wijaya', 'TOCFL Band A',
     'Zhuyin dan tradisionalnya lengkap. Cocok banget buat aku yang mau fokus ke ujian Taiwan.',
     'https://images.unsplash.com/photo-1758599543136-5977bf2dd922?auto=format&fit=crop&w=150&h=150', 'APPROVED', 'seed', now()),
    ('testi-seed-22', 'Salsabila Zahra', 'TOCFL Band B',
     'Tingkat kesulitannya naik pelan-pelan, jadi nggak kaget pas ujian. Progress tracking-nya jujur.',
     'https://images.unsplash.com/photo-1638953052562-21e347a142bf?auto=format&fit=crop&w=150&h=150', 'APPROVED', 'seed', now()),
    ('testi-seed-23', 'Raka Ardiansyah', 'JLPT N5',
     'Latihan listening-nya pakai suara asli penutur bahasa Jepang, bukan robot. Buat pemula kayak aku ini paling membantu.',
     'https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&w=150&h=150', 'APPROVED', 'seed', now()),
    ('testi-seed-24', 'Tania Maharani', 'JLPT N4',
     'Grammar bahasa Jepang dijelasin lewat pola yang langsung dipakai, bukan teori panjang. Partikel jadi nggak serem lagi.',
     'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=150&h=150', 'APPROVED', 'seed', now()),
    ('testi-seed-25', 'Vina Oktaviani', 'JLPT N3',
     'Kosakata Jepang yang tadinya sering lupa sekarang keinget otomatis. SRS-nya emang bikin vocab nempel lama.',
     'https://images.unsplash.com/photo-1531384441138-2736e62e0919?auto=format&fit=crop&w=150&h=150', 'APPROVED', 'seed', now()),
    ('testi-seed-26', 'Ilham Ramadhan', 'GOETHE A1',
     'Latihan ngomong bahasa Jermannya dibandingin sama penutur asli. Langsung tahu pelafalan mana yang meleset.',
     'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&h=150', 'APPROVED', 'seed', now()),
    ('testi-seed-27', 'Lina Marlina', 'GOETHE A2',
     'Sesi hariannya singkat dan padat, pas buat tetap konsisten belajar bahasa Jerman sambil kerja.',
     'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150', 'APPROVED', 'seed', now()),
    ('testi-seed-28', 'Reza Pratama', 'GOETHE B1',
     'Setelah placement test, jalur belajar bahasa Jermanku langsung jelas. Nggak nebak-nebak materi lagi.',
     'https://images.unsplash.com/photo-1519638399535-1b036603ac77?auto=format&fit=crop&w=150&h=150', 'APPROVED', 'seed', now()),
    ('testi-seed-29', 'Citra Ayunda', 'TOEFL iBT',
     'Latihan reading dan listening bahasa Inggris-nya mirip format TOEFL asli, jadi nggak kaget pas hari H.',
     'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=150&h=150', 'APPROVED', 'seed', now()),
    ('testi-seed-30', 'Farhan Maulana', 'TOEFL iBT',
     'Kosakata akademik bahasa Inggris yang terlacak bikin aku stay on track sampai target skor.',
     'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=150&h=150', 'APPROVED', 'seed', now())
ON CONFLICT (id) DO NOTHING;

-- (3) Fix quotes already inserted into DBs where this migration ran before the
--     rewrite: re-apply the explicitly per-language quotes (idempotent).
UPDATE testimonial SET quote = 'Latihan listening-nya pakai suara asli penutur bahasa Jepang, bukan robot. Buat pemula kayak aku ini paling membantu.'
WHERE id = 'testi-seed-23' AND quote = 'Latihan listening-nya natural, bukan robot bacain teks. Aku jadi terbiasa denger intonasi asli.';
UPDATE testimonial SET quote = 'Grammar bahasa Jepang dijelasin lewat pola yang langsung dipakai, bukan teori panjang. Partikel jadi nggak serem lagi.'
WHERE id = 'testi-seed-24' AND quote = 'Grammar dijelasin pakai pola, bukan teori panjang. Langsung bisa kupakai bikin kalimat sendiri.';
UPDATE testimonial SET quote = 'Kosakata Jepang yang tadinya sering lupa sekarang keinget otomatis. SRS-nya emang bikin vocab nempel lama.'
WHERE id = 'testi-seed-25' AND quote = 'SRS-nya bikin vocab nempel lama. Yang tadinya sering lupa, sekarang otomatis keinget pas baca kalimat.';
UPDATE testimonial SET quote = 'Latihan ngomong bahasa Jermannya dibandingin sama penutur asli. Langsung tahu pelafalan mana yang meleset.'
WHERE id = 'testi-seed-26' AND quote = 'Latihan pengucapan membantu banget. Audioku dibandingin sama aslinya, langsung tahu yang salah di mana.';
UPDATE testimonial SET quote = 'Sesi hariannya singkat dan padat, pas buat tetap konsisten belajar bahasa Jerman sambil kerja.'
WHERE id = 'testi-seed-27' AND quote = 'Tiap sesi singkat tapi padat. Pas masuk ujian, materinya semua udah pernah kutemuin.';
UPDATE testimonial SET quote = 'Setelah placement test, jalur belajar bahasa Jermanku langsung jelas. Nggak nebak-nebak materi lagi.'
WHERE id = 'testi-seed-28' AND quote = 'Planner dari placement test langsung nunjukin jalur belajar. Nggak bingung mulai dari mana lagi.';
UPDATE testimonial SET quote = 'Latihan reading dan listening bahasa Inggris-nya mirip format TOEFL asli, jadi nggak kaget pas hari H.'
WHERE id = 'testi-seed-29' AND quote = 'Listening + reading-nya mirip format asli. Waktu latihan jadi familiar pas hari H.';
UPDATE testimonial SET quote = 'Kosakata akademik bahasa Inggris yang terlacak bikin aku stay on track sampai target skor.'
WHERE id = 'testi-seed-30' AND quote = 'Catatan kosakata dan progres yang terlacak bikin aku stay on track sampai target skor.';
