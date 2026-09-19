# AUDIT JSON GENDER — progress doc (working file)

Tujuan: petakan **setiap konten yang "berbicara"** ke suara male / female yang cocok,
perlahan per domain, TANPA default-buta `female` untuk semua. Setiap kebingungan dicatat
sebagai ❓ — jangan ditebak diam-diam.

> File ini progress doc. `AUDIT_MEDIA.md` baru di-update di AKHIR setelah semua ❓ terjawab.
> Aturan main: M = male, F = female, N = netral (narrator tunggal, either voice OK).

Status: 🟢 dipetakan | 🟡 usulan (butuh OK user) | ❓ bingung | ⏳ belum di-scan

---

## 1. Conversations 🟡 (data paling kaya — satu-satunya dengan speaker bernama)

### 1a. zh (hsk1-7 + tocfl, pola `turns[].speaker = tutor|user`, TANPA speakers array)

- Tutor menamai diri **李明 (laki-laki)** 1x: `conv-introduce-self` → tutor 🟡 **M**.
- Turn tutor lain netral (role saja, tanpa nama).
- Turn `user` kosong (giliran learner bicara) → tidak masuk manifest (skip `getText` kosong).
- `choices` user berisi 安娜 2x (`conv-introduce-self`, `conv-hotel`) TAPI choices juga berisi
  distraktor absurd (我是米饭 "saya nasi") → choices = opsi kuis, BUKAN persona tetap.
- ❓ **Q1 → TERJAWAB (riset + aturan urutan §1e)**: tutor = **M**, user = **F**.
  Bukti: tutor menamai diri 李明 (M) 1x; aturan "pembicara pertama = M" (§1e) menaruh tutor
  di M secara otomatis; user = F memberi kontras drama tutor↔user + cerminkan 安娜 di choices.
  Backup riset: Duolingo memberi tiap karakter suara TTS sendiri ("Hollywood-level casting",
  blog.duolingo.com/character-voices) — dua peran beda suara = standar industri, bukan tebakan.

### 1b. de (27 conv, pola `speakers[]` + `dialogue[]`) 🟢 jelas 60% / ❓ 40%

JELAS (dari nama/gelar — Herr/Frau, nama depan, sufiks feminin):

| Conv                           | Speaker → gender                                           |
| ------------------------------ | ---------------------------------------------------------- |
| b1 de-conv-017                 | Herr Weber **M** / Frau Schneider **F**                    |
| b1 de-conv-018                 | Dr. Klein 🟡M?/❓ / Herr Berg **M**                        |
| b1 de-conv-019                 | Frau Lorenz **F** / Herr Vogt **M**                        |
| b1 de-conv-020                 | Frau Krüger **F** / Herr Albrecht **M**                    |
| b1 de-conv-021                 | Jonas **M** / Miriam **F**                                 |
| b1 de-conv-022                 | Nina **F** / Tom **M**                                     |
| b2 de-conv-023                 | Anna **F** / Marco **M**                                   |
| b2 de-conv-024                 | Frau Vogel **F** / Herr Klein **M**                        |
| b2 de-conv-025                 | Lisa **F** / Paul **M**                                    |
| b2 de-conv-026                 | Frau Berger **F** / Herr Novak **M**                       |
| b2 de-conv-027                 | Dr. Braun ❓ / Frau Yilmaz **F**                           |
| a1 de-conv-002                 | Anna **F** / Max **M**                                     |
| a1 de-conv-007, a2 de-conv-015 | Anna **F** / Ben **M**                                     |
| a2 de-conv-011                 | Kunde ❓ / **Kassiererin F** (sufiks -in = feminin, pasti) |

NETRAL (role saja — butuh konvensi, lihat ❓Q3):
a1: de-conv-001/003/014 (Kellner/waiter ↔ Kunde/Gast), 004 (Verkäufer↔Kunde),
005 (Passant↔Tourist), 006 (Chef↔Mitarbeiter), 008 (Anrufer↔Rezeption),
009/016 (Arzt↔Patient), 010 (Passagier A↔B); a2: 012 (Fahrgast↔Mitarbeiter),
013 (Interessent↔Vermieter).

- ❓ **Q2 → TERJAWAB (prinsip kontras + neraca global)**: `Dr. Klein` = **F**
  (pasangannya Herr Berg M → drama F↔M; skor jelas de jadi M:12/F:13),
  `Dr. Braun` = **M** (pasangannya Frau Yilmaz F → drama M↔F; skor de jadi **13–13**).
  Aturan: kasus ambigu selalu di-cast ke sisi yang menciptakan kontras dalam conv-nya —
  hasilnya sekaligus menyeimbangkan korpus. Bukan tebakan: dua tujuan, satu keputusan.

### 1c. en (10 conv) 🟢 sebagian / ❓ sebagian

- JELAS: Maya **F**, Sofia **F**, Anna **F**, Liam **M**, Ben **M**.
- ❓ **Q3 → TERJAWAB**: `Alex` = **M**. Alex memang unisex, tapi pasangannya Maya (F):
  cast M memberi kontras M↔F dalam conv + skor jelas en jadi **3–3**. Prinsip yang sama dengan Q2.
- NETRAL (role saja): waiter↔customer (003, 004), shopkeeper↔customer (005),
  passerby↔tourist (006), manager↔employee (007), caller↔reception (009), doctor↔patient (010).

### 1d. ja 🟡

- n5 (10 conv bernama): Tanaka/Satou/Yamada/Kimura/Suzuki = **nama keluarga → netral gender** ❓Q4.
  Role: waiter↔customer, shopkeeper↔customer, passerby↔tourist, teacher↔student,
  staff↔passenger, caller↔receiver, doctor↔patient.
- n1–n4 + 4 conv n5: speaker cuma `A`/`B` → sepenuhnya netral.
- ❓ **Q4 → TERJAWAB**: nama keluarga JP (Tanaka/Satou/…) memang netral gender
  (nama keluarga tidak menandai gender) → tidak memberi sinyal, jadi ikut **aturan urutan §1e**
  (pembicara pertama = M). Speaker `A`/`B` juga ikut aturan urutan: **A = M, B = F**.

### 1e. ✅ ATURAN URUTAN (menggantikan tabel peran — lebih sederhana, konsisten 100%)

**Pembicara yang tercantum pertama = M, kedua = F — KECUALI bernama jelas (§1b–1d menang).**

Verifikasi ke semua pasangan netral: waiter(M)↔customer(F), Verkäufer↔Kunde,
Passant↔Tourist, Chef↔Mitarbeiter, Anrufer↔Rezeption, Arzt↔Patient, Passagier A↔B,
Interessent↔Vermieter (→ landlady F — ada preseden: Frau Lorenz di b1!),
teacher↔student, caller↔receiver, zh tutor↔user (tutor M ✓ cocok bukti 李明), ja A↔B.
**Semua otomatis drama M↔F, nol pengecualian, nol tebakan per-conv.**

Kenapa aturan urutan (bukan tabel peran): (1) satu baris implementasi
(`speakers[0]→M, speakers[1]→F`); (2) konsisten lintas 4 bahasa termasuk zh
(yang tanpa speakers array: tutor selalu turn pertama); (3) selaras praktik Duolingo —
tiap karakter suara tetap sendiri ("if you're not hearing the same voice all the time,
it helps train our learners' ears" — Greg Hartman, The Verge 2020).

---

## 2. Readings 🟡 (narator tunggal; protagonis hanya untuk "cocoknya" narator)

Mayoritas first-person netral (我/Ich/I/私 + nol pronoun) → narator **distribusi hash**
(lihat Q7). Bacaan ber-protagonis jelas di bawah mengikuti protagonisnya.

### 2a. zh — yang condong jelas:

| Reading                                      | Sinyal                                     | Narator usulan                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| r-wo-de-yitian                               | 我叫**安娜**                               | **F** 🟢                                                                                                                                                                                                                                                                                                                                     |
| r-wo-de-laoshi                               | 老师…**她** (F:5)                          | **F** 🟡                                                                                                                                                                                                                                                                                                                                     |
| r-wo-de-pengyou                              | 好朋友…**她** (F:5)                        | **F** 🟡                                                                                                                                                                                                                                                                                                                                     |
| r-shengri-kuaile                             | **妹妹**…她 (F:2)                          | **F** 🟡                                                                                                                                                                                                                                                                                                                                     |
| r-wo-de-zhongwen-laoshi                      | 老师…**她** (F:3)                          | **F** 🟡                                                                                                                                                                                                                                                                                                                                     |
| r-wo-de-pengyou-xiaoming                     | **小明**…他 (M:2)                          | **M** 🟡                                                                                                                                                                                                                                                                                                                                     |
| r-zai-fandian                                | **DIALOG 服务员↔客人** (4 baris, tanda ：) | ❓ **Q5 → TERJAWAB: SPLIT 2 suara** — 服务员 **M** / 客人 **F** (ikut aturan urutan §1e). Backup: Duolingo memberi tiap karakter suara TTS sendiri agar lesson hidup; dialog 1 suara = kehilangan informasi giliran bicara. Format manifest: pecah per baris dialog jadi entry `reading:<id>:p<i>:<speaker>` (pola sama seperti conv turns). |
| lainnya (r-wo-de-jia, r-he-cha, r-shengri …) | hitungan M/F = noise (爸爸/中国人/iquote)  | narrator default                                                                                                                                                                                                                                                                                                                             |

### 2b. de — yang condong jelas:

| Reading               | Sinyal                           | Narator usulan   |
| --------------------- | -------------------------------- | ---------------- |
| r-de-b2-2-klimaschutz | **Nora**, Sie (F:3)              | **F** 🟡         |
| r-de-b1-5-technik     | **Lena** (F:2)                   | **F** 🟡         |
| r-de-a2-4-geburtstag  | Freundin **Anna**                | **F** 🟡         |
| r-de-a2-2-arztbesuch  | **Markus** (M:3)                 | **M** 🟡         |
| r-de-b1-1-arbeit      | **Thomas** (M:1)                 | **M** 🟡         |
| r-de-b2-5-reisen      | **Jonas** (M:4)                  | **M** 🟡         |
| lainnya               | netral / noise artikel (der/die) | narrator default |

### 2c. en/ja — hampir semua netral:

- en: 9/10 netral (r-en-1-2-my-family M:2/F:1 = noise father/son…). ❓ **Q6 → TERJAWAB**:
  ikut distribusi hash seperti yang lain (Q7) — tidak perlu disamakan manual dengan padanan de.
- ja: semua netral (私…). Distribusi hash.
- ❓ **Q7 → TERJAWAB: (b) distribusi hash — BUKAN satu narrator global.**
  Hasil riset membalik usulan awal: meta-analisis HVPT (79 studi, Cambridge 2025;
  Zhang et al. 2021, g=0.72 untuk generalisasi ke pembicara baru) menunjukkan
  **variasi pembicara meningkatkan generalisasi listening** — learner yang hanya dengar
  1 suara kesulitan memahami pembicara baru di dunia nyata. Implementasi: gender narator
  per reading = `hash(reading.id) % 2` → ~50/50 M/F se-korpus, deterministik
  (entry yang sama selalu suara sama = model pelafalan konsisten, pola Duolingo:
  konsistensi PER suara, variasi ANTAR suara). Biaya storage: nol tambahan
  (tetap 1 file per entry). Bacaan protagonis-jelas (§2a/2b) dikecualikan → ikut protagonis.

---

## 3. Grammar 🟢 (narator tunggal — JANGAN split per pronoun)

- 1349 examples zh: N=1087, M=253, F=9. Pronoun 他/她 adalah **objek yang dikutip narator**
  ("他跑得很快" diucapkan narator, bukan oleh pria) → split suara per pronoun = skizofrenia audio.
- Catatan konten (bukan audio): F hanya 9/1349 — ketidakseimbangan materi, layak tiket konten
  terpisah, bukan keputusan suara.
- de/en/ja grammar: struktur sama (contoh kalimat, tanpa speaker) → narrator default.
- Keputusan: **satu narator per entry, suara didistribusikan hash** (pola Q7):
  tiap contoh kalimat 1 suara (konsisten saat di-replay), tapi se-korpus ~50/50 M/F
  (variasi talker membantu generalisasi listening — HVPT). Jangan split per pronoun. 🟢

## 4. Vocabulary 🟡

- Kata tunggal (`vocab:<id>`, 1 kata/hanzi): tidak ada "yang berbicara" — model pelafalan.
  → narrator default. 🟢 closed.
- Varian tradisional (`:trad`): sama. 🟢 closed.
- Contoh kalimat (42.684 zh: N=34.450, M=6.507, F=1.727): sama seperti grammar — dikutip
  narator ("他有三个儿子" bukan ucapan seorang ayah).
- ❓ **Q8 → TERJAWAB**: kata + trad = narrator per-entry (hash, pola Q7). Examples =
  narrator per-entry (hash) — konsistensi kata↔contohnya dijaga dengan **mewarisi suara kata
  induknya** (`vocab:<id>:ex<i>` ikut gender `vocab:<id>`), supaya kartu vocab tidak ganti
  suara di tengah. Tutup. 🟢

## 5. Characters 🟢

Satu hanzi per entry, tanpa speaker. → narrator per-entry (hash, pola Q7). 🟢

## 6. Placement / Assessment / Curriculum 🟢

- Prompt/soal satu suara: zh 你好 / 四十七 / 我很累，想睡觉…; de/en/ja sama polanya
  (de/en/ja placement: 20 items, 4 dengan audioText — soal pilihan ganda).
- Curriculum audioText (3): 妈 / 六十八 / 我有两个弟弟 — prompt pelajaran.
- Assessment audioText (3 soal mock, mis. 你爸爸做什么工作 — tetap prompt yang dibacakan,
  bukan dialog). → narrator per-entry (hash, pola Q7). 🟢 closed, tanpa ❓.

## 7. ✅ RISET PENDUKUNG (hasil websearch, menjawab Q1–Q7)

**Pilar 1 — High-Variability Phonetic Training (HVPT): variasi suara membantu listening.**
Meta-analisis Zhang et al. 2021 (18 studi, n=549): efek generalisasi ke pembicara BARU
g=0.72 (large), retensi jangka panjang g=1.09. Meta-analisis Cambridge 2025 (79 studi):
HVPT "most empirically supported phonetic training paradigm" (Thomson 2018);
multi-talker > single-talker untuk generalisasi (Lively, Logan & Pisoni 1993;
Logan, Lively & Pisoni 1991 — penutur JP belajar kontras Inggris l/r dari 5 talker).
Implikasi: (a) dialog WAJIB split per pembicara (Q5); (b) konten netral JANGAN 1 suara
global — distribusi hash ~50/50 M/F memberi talker-variability gratis (Q7);
(c) per-entry konsisten = variasi antar-entry, bukan dalam-entry (sejalan desain HVPT:
variabilitas antar-talker, stimulus per trial stabil).

**Pilar 2 — Duolingo: satu suara tetap PER KARAKTER.**
blog.duolingo.com/character-voices: tiap karakter (Lily, Zari, …) dapat suara TTS custom
via Microsoft neural voice, "Hollywood-level casting", direkam untuk semua konteks
kalimat agar jadi "reliable model of pronunciation". The Verge 2020 (Hartman):
"if you're not hearing the same voice all the time, it helps train our learners' ears."
Implikasi: (a) speaker bernama/berperan → suara tetap per speaker (Q1: tutor M vs user F);
(b) konsistensi per-entry + variasi antar-entry = model Duolingo yang terbukti skala
(40+ bahasa, 100+ kursus).

**Keputusan yang dibalik riset**: Q7 dari "(a) satu narrator F" → "(b) distribusi hash";
Q5 dari "mungkin 1 narator" → "split"; §1e dari "tabel peran" → "aturan urutan"
(sama-sama mencapai drama M↔F, tapi 1 baris implementasi + konsisten 4 bahasa).

## 8. ❓ SISA UNTUK USER (tinggal Q9 — Q1–Q8 terjawab riset)

- **Q9**: Setujui aturan urutan §1e (pertama=M, kedua=F, bernama-menang) + distribusi hash
  untuk konten netral + waris suara kata→contoh (Q8)? Kalau YA, audit selesai → update
  `AUDIT_MEDIA.md` final + implementasi 2 PR.

## 9. Progress

- [x] conversations zh/de/en/ja — speaker map lengkap (§1)
- [x] readings zh/de/en/ja — protagonis scan (§2)
- [x] grammar — keputusan narrator (§3)
- [x] vocabulary — kata vs examples + waris suara (§4)
- [x] characters (§5)
- [x] placement/assessment/curriculum (§6)
- [x] riset Q1–Q7 (HVPT + Duolingo) → Q1–Q8 terjawab (§7)
- [x] sisi input kontributor — Media Studio vs web vs backend (§10)
- [x] sisi mobile — hook, manifest, sync (§11)
- [ ] jawaban Q9 + M1–M4 dari user
- [ ] setelah itu: update AUDIT_MEDIA.md (casting final + implementasi 3 PR: media, web, mobile)

## 11. Sisi mobile: hook mati, manifest basi, 4 hardcode 🟡

**Temuan utama: `useTts` (`apps/mobile/src/hooks/useTts.ts`) punya NOL pemanggil.**
Grep `Audio.Sound|play(|expo-speech` di seluruh `apps/mobile/src` hanya kena definisi hook
itu sendiri — belum ada screen yang memutar audio. Jadi casting TIDAK merusak apa pun
hari ini, tapi saat hook di-wiring ia akan langsung salah tanpa 4 perbaikan di bawah.

**4 hardcode yang konflik dengan casting (di dalam hook yang mati itu):**

- [ ] **M1**: `useTts.ts:145` — `genderKey = "female"` hardcode. Setelah R2 campur M/F,
      entry ber-cast M selalu CDN-miss → jatuh ke `POST /tts` (backend synth female) →
      drama hilang + beban backend naik. Perbaikan: baca `gender` dari manifest entry
      (tambah field di interface `ManifestEntry:18-24` yang saat ini TANPA gender).
- [ ] **M2**: `useTts.ts:144` — `localeForExam("hsk")` hardcode. Konten TOCFL ikut
      diminta zh-CN. Perbaikan: locale dari manifest entry (`localeByKey` sudah ada!).
- [ ] **M3**: `mobile/src/data/audio/voice-map.ts` zh-only (3 locale) — de/en/ja tak terpetakan.
      Padahal `apps/media/data/audio/voice-map.ts` (sumber sync) sudah 6 locale
      (Katja/Conrad, Nanami/Keita, Jenny/Guy). Salinan mobile BASI — `sync-mobile.ts`
      (`apps/media/scripts/sync-mobile.ts:12`, blind `cp`) tidak rutin dijalankan.
      Perbaikan: re-sync + jadikan bagian pipeline publish.
- [ ] **M4**: manifest mobile cuma **530 entries** vs 112.775 di media — subset basi.
      Perbaikan: sync ulang setelah manifest ber-field `gender`; atau mobile baca manifest
      dari CDN saat online (pola web: cache-first) agar tak perlu bundel 14 MB.

**Yang TIDAK perlu diubah:** rantai fallback cache→CDN→`POST /tts` (tetap jadi safety net),
format nama file cache `{key}__{locale}__{gender}` (sudah gender-aware),
`endpoints.say(text, locale="zh-CN", gender="female")` (default param tetap valid),
`MAX_CACHE_SIZE` 50 MB (tetap cukup — 1 file/entry justru mengecilkan kebutuhan cache).

**Urutan kerja mobile (setelah Q9):** PR-3 tersendiri — M1+M2 (baca gender+locale dari
manifest) + M3/M4 (re-sync) + wiring hook ke screen pertama. Tidak memblokir PR-1/2.

## 10. Sisi input: dari mana konten masuk & dampaknya ke casting 🟡

Audit JSON saja tidak cukup — casting pecah kalau konten BARU masuk tanpa info speaker.
Hasil telusur 4 jalur input:

**Jalur A — Media Studio (`apps/media/src/app/page.tsx`): TIDAK ADA input konten.**
Hanya dashboard pipeline (status manifest/audio/images, tombol generate sampel,
Anki sources, keys). Tidak perlu diubah untuk casting. 🟢

**Jalur B — Form kontributor web
(`apps/web/.../(contributor)/contributor/page.tsx:367-378,543`): ADA, tapi mentah.**
Field `turns` / `dialogue` / `paragraphs` = **textarea JSON bebas**
(placeholder `[{"speaker": "...", "line": "..."}]`). Tidak ada speaker picker,
tidak ada field `speakers[]` untuk de/en/ja (form non-zh cuma title/scenario/dialogue).
Dampak: (1) nilai speaker free-text, konvensi tutor/user tak ditegakkan;
(2) `speakers[]` bernama hampir pasti KOSONG di konten kontributor baru →
**aturan urutan §1e otomatis jadi jalur utama** (speaker turn pertama = M).
Ini kabar baik: skema casting tetap jalan tanpa field baru.

**Jalur C — Backend `validatePayload`
(`apps/backend/internal/service/content_service.go:77-164`): hanya cek keberadaan.**
Wajib: title + turns/dialogue non-kosong (conv), title+summary+paragraphs (reading).
TIDAK validasi: isi tiap turn (boleh tanpa speaker!), TIDAK wajibkan `speakers[]`.
Dampak: turn tanpa speaker lolos → `voiceForEntry` WAJIB punya fallback
(turn tanpa speaker = ikut aturan urutan by posisi; jangan reject).

**Jalur D — Import Anki (`scripts/import-anki.ts`, field map hanzi/pinyin/translation/zhuyin):**
vocab only, tanpa konsep speaker. Tidak terdampak casting. 🟢

**Keputusan input-side (butuh OK user, ringan — tanpa blokir casting):**

- [ ] B1: tambah field opsional `speakers` (JSON array) di guided form non-zh + contoh
      placeholder, agar kontributor BISA memberi nama (kalau diisi → casting bernama menang).
- [ ] B2: hint teks di textarea turns/dialogue: "pembicara pertama = suara pria,
      kedua = suara wanita" (dokumentasikan aturan urutan ke kontributor).
- [ ] C1: backend tetap TIDAK menolak turn tanpa speaker (hindari break flow),
      tapi log/flag untuk reviewer di admin review (`admin/content/page.tsx`).
- [ ] D: tidak ada perubahan.
