# AUDIT MEDIA — Fixed voice casting, satu file per entry (FINAL, implemented)

Tanggal: 2026-09-19. Status: **diimplementasikan** (commit f1695b2 → bfb56cf).
Doc progres per konten: `AUDIT_JSON_GENDER.md`. Doc audit sistem penuh: `AUDIT_AUDIO_FULL.md`.

Keputusan produk: **toggle gender dihapus** — setiap entry punya satu suara tetap.
Hemat ~50% storage + variasi pembicara membantu generalisasi listening.

## 1. Skema final (bukan usulan lagi)

- Dialog (conversation turns, curriculum dialogue steps, 1 reading dialog):
  suara ikut pembicara — bernama menang, tanpa nama ikut aturan urutan
  (pembicara pertama = male). zh tutor = male, user = female.
- Narasi netral (vocab, characters, grammar, readings, placement, assessment,
  curriculum exercise): hash deterministik per key (~50/50 male/female se-korpus,
  stabil per entry). Contoh vocab mewarisi suara kata induknya.
- Implementasi: `apps/media/src/lib/voice-casting.ts`
  (dipakai `scripts/generate-manifest.ts` → field `gender` per entry).

| Domain                      | Entries     | Hasil file                         |
| --------------------------- | ----------- | ---------------------------------- |
| vocabulary (`vocab:*`)      | 101.385     | 1/entry, contoh ikut kata induk    |
| characters (`char:*`)       | 7.298       | 1/entry (hash)                     |
| grammar (`grammar:*:ex*`)   | 1.747       | 1/entry (hash)                     |
| readings (`reading:*:p*`)   | 1.706       | protagonis/hash; 1 dialog di-split |
| conversations (`conv:*:t*`) | 617         | per-turn ikut speaker              |
| placement/assessment        | 19          | 1/entry (hash)                     |
| curriculum (+257 dialog D2) | 260         | exercise hash, dialog ikut speaker |
| **TOTAL manifest**          | **113.032** | **male 56.734 / female 56.298**    |

## 2. Cara kerja lama (yang sudah diganti)

- `apps/media/src/lib/runner-audio.ts:32` — `const GENDERS = ["female", "male"]`;
  loop baris 177 membangun 2 task untuk **setiap** manifest entry, semua domain tanpa kecuali.
- Dedup `ownerByCombo` (text+locale+gender) hanya mencegah duplikat dalam gender yang sama.
- Web membaca gender dari **satu toggle global** `settings.voiceGender` (default `"female"`),
  dipakai di 12 call site (`audio.ts:154,239,380` + 9 halaman, daftar lengkap di §5).
  File male hanya terpakai saat user mengganti setting ke male.
- Proyeksi full run: 225.550 file ≈ **±4,7 GB** (diukur: 47.769 file parsial = 1008 MB,
  ~21 KB/file). Setelah Opsi B: **112.775 file ≈ ±2,35 GB** — hemat ~50% waktu generate,
  PUT/LIST R2, dan setiap konten baru selamanya menambah 1 file, bukan 2.

## 3. Temuan penting re-audit per domain

1. **Vocabulary mendominasi (90%).** Kata (`vocab:<id>`), varian tradisional
   (`vocab:<id>:trad`), dan contoh kalimat (`vocab:<id>:ex<i>`) — semuanya tanpa speaker.
   Satu suara narrator untuk ketiganya adalah perilaku yang diharapkan learner
   (konsistensi pengucapan kata ↔ contohnya). Menghemat ~101 ribu file sendirian.
2. **Characters & grammar sama polanya**: satu teks per entry, tanpa speaker.
   Narator tetap = konsisten dengan vocabulary.
3. **Readings = narasi satu suara.** Struktur `paragraphs[]` hanya berisi teks
   (hanzi/text/pinyin/zhuyin/translation) — tidak ada field narrator, dialog, atau
   penanda pergantian pembicara, jadi satu narrator tetap sudah benar. (Kalau suatu hari
   ada reading berbentuk dialog, tinggal tambah field opsional `narrator`/`voices`
   mengikuti pola conversation di §6 — tidak perlu desain baru.)
4. **Conversation satu-satunya domain berstruktur dialog**, dan satu-satunya yang
   mendapat manfaat nyata dari dua suara: `turns[].speaker = "tutor" | "user"`.
   Pemetaan peran→gender adalah **konvensi produk** (tutor female, user male —
   atau sebaliknya), bukan sesuatu yang bisa diturunkan dari data. Tanpa field
   `speakerGender` di data, jangan menebak dari nama/isi kalimat.
5. **Placement/assessment/curriculum = soal & prompt satu suara.** Jumlahnya kecil
   (22 entries), tanpa speaker. Narator tetap.
6. **JEBAKAN: `gender` di `de/vocabulary/*.json` adalah gender GRAMATIKAL**
   (`"m" | "f" | "n"` = der/die/das), BUKAN gender suara. Jangan pernah memakainya
   untuk voice casting — hanya `zh`/semua domain non-DE yang relevan di sini,
   dan semuanya tanpa sinyal suara.
7. **Mobile sudah satu suara.** `apps/mobile/src/hooks/useTts.ts:145` hardcode
   `genderKey = "female"`; `voice-map.ts:21-22` hanya resolver locale→voice.
   Mobile tidak punya toggle gender — Opsi B menyeragamkan web dengan mobile.
8. **Backend tidak perlu berubah.** `tts_service.go:86-149` menerima gender apa pun,
   synth → upload R2 → cache DB by `sha256(text::locale::gender)` + singleflight.
   Tetap jadi safety net on-demand untuk gender/voice apa pun yang diminta.

## 4. Yang berubah: toggle gender di web dihapus

Satu-satunya perubahan UX: setting `voiceGender` hilang, semua halaman memutar
suara tetap sesuai domain/peran. Daftar lengkap titik yang disentuh:

- `apps/web/src/stores/settings.ts:40,138` — hapus field `voiceGender` + default `"female"`.
- `apps/web/src/app/(dashboard)/dashboard/settings/page.tsx:566-569` — hapus dropdown.
- `apps/web/src/i18n/en.json:1127`, `id.json:1127` — hapus key `settings.voiceGender`.
- `apps/web/src/lib/audio.ts:154,239,380` — **pertahankan** parameter eksplisit `gender`,
  hapus fallback ke `useSettings.getState().voiceGender`; ganti default fallback menjadi
  konstanta domain (atau wajibkan caller mengirim gender — lebih eksplisit, disarankan).

Konstanta casting tunggal (satu file, mis. `apps/web/src/lib/voice-casting.ts`):

```ts
export const NARRATOR_GENDER = "female" as const // vocab, char, grammar, reading, placement, assessment, curriculum
export const CONV_TUTOR_GENDER = "female" as const
export const CONV_USER_GENDER = "male" as const
```

## 5. Pemetaan 12 call site web → suara tetap

| File                              | Baris    | Konten yang diputar      | Gender baru                                                      |
| --------------------------------- | -------- | ------------------------ | ---------------------------------------------------------------- |
| `vocabulary/[wordId]/page.tsx`    | 151, 220 | kata + contoh            | `NARRATOR_GENDER`                                                |
| `characters/[charId]/page.tsx`    | 118      | hanzi                    | `NARRATOR_GENDER`                                                |
| `grammar/[pointId]/page.tsx`      | 166      | contoh kalimat           | `NARRATOR_GENDER`                                                |
| `reading/[readingId]/page.tsx`    | 200      | paragraf narasi          | `NARRATOR_GENDER`                                                |
| `conversations/[convId]/page.tsx` | 101, 170 | turn tutor / user        | per-turn: tutor → `CONV_TUTOR_GENDER`, user → `CONV_USER_GENDER` |
| `lesson/[lessonId]/page.tsx`      | 372, 421 | materi lesson/curriculum | `NARRATOR_GENDER`                                                |
| `review/page.tsx`                 | 270, 298 | review vocab             | `NARRATOR_GENDER`                                                |
| `speaking/page.tsx`               | 253      | prompt speaking          | `NARRATOR_GENDER`                                                |
| `exam/adaptive/page.tsx`          | 586      | soal exam                | `NARRATOR_GENDER`                                                |
| `placement-test/page.tsx`         | 205, 486 | soal placement           | `NARRATOR_GENDER`                                                |

Catatan conversation: turn `user` yang kosong (giliran learner berbicara — `hanzi: ""`
di sampel `conv-introduce-self`) tidak masuk manifest (`getText` kosong → skip),
jadi tidak ada file yang di-generate untuknya; hanya `choices` user yang berisi teks
yang dapat suara `CONV_USER_GENDER`.

## 6. Perubahan pipeline media (1 file per entry)

1. `scripts/generate-manifest.ts` — tambah field `gender` di `ManifestEntry`:
   - `vocabulary / characters / grammar / readings / placement / assessments / curriculum` → `"female"`.
   - `conversations` → baca `turns[i].speaker`: `"user"` → `"male"`, selain itu `"female"`.
     (Rule "tidak ada kepastian": speaker tak dikenal/unknown → female, jangan tebak.)
   - Peta ini hidup di **satu fungsi** (`voiceForEntry(domain, item)`), bukan tersebar.
2. `src/lib/runner-audio.ts` — hapus konstanta `GENDERS` (baris 32) dan loop baris 177;
   setiap entry membangun **1 task** dengan `entry.gender`. Dedup `ownerByCombo`
   tidak berubah (kunci text+locale+gender tetap unik per entry).
3. `scripts/generate-audio.ts` — tidak perlu flag `--genders` lagi (Opsi A dibatalkan
   oleh keputusan ini); batch selalu single-voice per entry.
4. `audioObjectKey` / `contentHash` (`src/lib/manifest.ts:26-40`) — sudah gender-aware,
   tidak perlu diubah. Manifest `audio-manifest.json` (±112.775 entries) tidak berubah
   bentuk; hanya setiap key kini punya 1 file, bukan 2.
5. Opsional masa depan (bukan bagian PR ini): field `speakerGender` / `narrator` di JSON
   bila ada reading dialog atau drama multi-suara lain — manifest tinggal meneruskannya.

## 7. Migrasi & sisa-sisa

- **File male yang sudah ada di R2**: tidak perlu dihapus massal. Opsi termurah:
  biarkan (tidak dirujuk manifest/web baru, biaya storage dingin kecil) ATAU hapus
  dengan skrip prefix `*__male.*` setelah rilis stabil. Jangan hapus sebelum web baru rilis.
- **User yang setting-nya male**: nilainya diabaikan setelah field dihapus dari store
  (persisted zustand: tambah migrasi kecil yang drop key `voiceGender`). Semua user
  mendengar casting baru — umumkan di changelog karena ini perubahan UX yang disengaja.
- **Fallback on-demand tetap aktif**: jika ada request gender di luar casting
  (mis. API pihak ketiga, mobile lama), `POST /api/v1/tts` men-generate + meng-cache-nya
  otomatis. Tidak ada risiko audio mati.
- **Tidak ada perubahan skema konten, DB, atau endpoint.** Satu-satunya kontrak baru
  adalah konvensi `voice-casting.ts` (web) ↔ `voiceForEntry` (media) — dokumentasikan
  keduanya menunjuk ke tabel §1 file ini.

## 8. Estimasi hemat final (per domain)

| Domain                          | Entries     | File hari ini (×2)     | File setelah Opsi B     | File dihemat       |
| ------------------------------- | ----------- | ---------------------- | ----------------------- | ------------------ |
| vocabulary                      | 101.385     | 202.770                | 101.385                 | ~101.385 (~2,1 GB) |
| characters                      | 7.298       | 14.596                 | 7.298                   | ~7.298             |
| grammar                         | 1.747       | 3.494                  | 1.747                   | ~1.747             |
| readings                        | 1.706       | 3.412                  | 1.706                   | ~1.706             |
| conversations                   | 617         | 1.234                  | 617                     | ~617               |
| placement/assessment/curriculum | 22          | 44                     | 22                      | ~22                |
| **TOTAL**                       | **112.775** | **±225.550 (±4,7 GB)** | **±112.775 (±2,35 GB)** | **~50%**           |

## 9. Status implementasi (PR-1 media, PR-2 web, PR-3 mobile — committed)

**PR-1 media (f1695b2, ab90133, 10b710b, c166faa):**
`voice-casting.ts` baru + `gender` per entry di manifest (113.032 entries) +
`runner-audio.ts` 1 task per entry + records merge + retry respons kosong +
Azure zh-TW female disamakan + curriculum dialogue steps masuk manifest (D2).
Rebuild penuh berjalan; lokal `.output/audio` di-prune; daftar orphan R2
(113.032 key) siap dihapus setelah rebuild + deploy.

**PR-2 web (7d0dbd1):** `audio.ts` resolve gender/locale dari manifest
(fallback hash untuk teks dinamis) + 12 call site tanpa gender eksplisit +
toggle `voiceGender` dihapus (store + settings page + i18n, stale-key cleanup) +
locale manifest menang atas exam + preview audio + flag speaker di admin review +
field `speakers` opsional + hint suara di form kontributor.
Terverifikasi realtime via browser: klik 八 → `vocab:ba1__zh-CN__female.mp3` 206.

**PR-3 mobile (7ac0c72):** `useTts` baca gender+locale dari manifest,
fallback teruskan keduanya ke `/tts`; subset manifest + voice-map re-sync.
Hook belum di-wiring ke screen (tidak ada yang rusak, tidak ada yang jalan).

## 10. File yang dirujuk

- `apps/media/src/lib/runner-audio.ts:32,177` — sumber 2x generate
- `apps/media/scripts/generate-manifest.ts:127-327` — kolektor per domain (tempat `voiceForEntry`)
- `apps/media/scripts/generate-audio.ts` — entrypoint CLI batch
- `apps/media/src/lib/manifest.ts:26-40` — `contentHash`, `audioObjectKey` (gender-aware, tak berubah)
- `apps/media/data/audio/audio-manifest.json` — 112.775 entries (sumber angka §1/§8)
- `apps/web/src/lib/audio.ts:154,239,380` — resolusi gender (fallback settings → konstanta)
- `apps/web/src/stores/settings.ts:40,138` + `settings/page.tsx:566-569` + `i18n/{en,id}.json:1127` — toggle yang dihapus
- 9 halaman call site — tabel §5
- `apps/mobile/src/hooks/useTts.ts:145` — bukti mobile sudah female-tetap
- `apps/backend/internal/service/tts_service.go:86-149` — safety net on-demand + singleflight
- `apps/media/data/json/de/vocabulary/b2.json:66` — contoh gender gramatikal (der/die/das), bukan suara
