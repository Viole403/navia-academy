# AUDIT AUDIO FULL — seluruh sistem suara (pipeline → storage → backend → web/mobile)

Tanggal: 2026-09-19. Sifat: audit baca-kode + ukur-data, tanpa ubah kode.
Doc progres casting per konten: `AUDIT_JSON_GENDER.md`. Doc keputusan awal: `AUDIT_MEDIA.md`
(akan di-update TERAKHIR setelah semua keputusan di bawah terjawab).

## 0. Peta sistem (fakta)

```text
data/json (4 bahasa × 5 domain + placement/assessment/curriculum)
  │ generate-manifest.ts → audio-manifest.json (112.775 entries, TANPA field gender)
  │ runner-audio.ts: GENDERS=[female,male] → 2 task/entry → 225.550 file (±4,7 GB)
  ▼
R2 audio/<key>__<locale>__<gender>.mp3   ← skema key PIPELINE (gender di path)
CDN → web (cache-first) / mobile (bundel basi)
  │ miss
  ▼
POST /api/v1/tts → synth → R2 audio/<sha256(text::locale::gender)[:32]>.mp3  ← skema key BACKEND (gender HANYA di hash)
  + cache DB audio_cache.text_hash (UNIQUE, ON CONFLICT DO NOTHING) + singleflight
```

**Dua skema R2 key berbeda** (pipeline vs backend) — URL on-demand TIDAK sama polanya
dengan URL pre-generate. Klien tidak perlu tahu (dapat URL jadi dari API), tapi jangan
pernah menebak URL backend dari pola pipeline.

## 1. Pipeline media (`apps/media`)

- `runner-audio.ts:32` `GENDERS`, loop `:175-197` → 1 entry = 2 task. Dedup `ownerByCombo`
  (text::locale::gender) sinkron sebelum sintesis (`:147-186`).
- Record key `:157-158` + object key `manifest.ts:38-40`: `<key>__<locale>__<gender>.mp3`.
  Contoh: `audio/vocab:ba1__zh-CN__female.mp3`. Gender SELALU di path.
- Voice: delegasi `tts.ts:47 edgeTTS → resolveVoice(locale,gender)` (@navia/utils,
  identik dengan `data/audio/voice-map.ts`): Xiaoxiao/Yunxi (zh-CN), HsiaoYu/YunJhe (zh-TW),
  HiuGaai/WanLung (zh-HK), Katja/Conrad (de-DE), Nanami/Keita (ja-JP), Jenny/Guy (en-US).
  Engine default edge (gratis, tanpa key); google/azure via key-pool rotation.
  ⚠️ Anomali: tabel Azure zh-TW female = `HsiaoChenNeural` (bukan `HsiaoYuNeural`).
- Manifest entry (`generate-manifest.ts:50-57`, `manifest.ts:5-12`):
  `key, text, locale, language, examSource?, audioPath?` — **tanpa gender/speaker**.
- Domain: `LANGUAGES × [vocabulary, grammar, readings, conversations, characters]`
  - placement (HANYA array-style = zh; de/ja/en object-style → kosong) + assessments
    (zh-only) + curriculum (`steps[].exercise.audioText` saja).
- `publish-data.ts`: **mp3 TIDAK di-publish** — hanya bundle JSON content-hashed (immutable,
  max-age 1 thn) + `data-manifest.json` (max-age 1 hari) + `audio/manifest` utuh.
  Tidak pernah ada purge.
- CI `media-generate.yml`: manifest → audio → images → publish-data; mp3 sengaja tak di-commit.
  `generate-audio` selalu rebuild manifest dulu; konkurensi 20.
- Angka: manifest 112.775 entries (vocab 101.385 | char 7.298 | grammar 1.747 |
  reading 1.706 | conv 617 | placement 16 | assessment 3 | curriculum 3).
  Locale: zh-CN 45.317, zh-TW 33.990, ja-JP 25.531, de-DE 7.778, **en-US 159 (!)**.
  `.output/audio`: 47.769 mp3 ≈ 1008 MB (~21% dari 225.550). `.generate-records.json`
  hanya 3.401 records (checkpoint 2026-08-25) — jauh di bawah file nyata, tampak ter-reset.

## 2. Storage R2 (dua skema — JANGAN disatukan manual)

|                | Pipeline (pre-generate)               | Backend (on-demand)                             |
| -------------- | ------------------------------------- | ----------------------------------------------- |
| Key            | `audio/<key>__<locale>__<gender>.mp3` | `audio/<sha256(text::locale::gender)[:32]>.mp3` |
| Gender di path | ya                                    | tidak (di hash)                                 |
| Cache-Control  | — (cek `storage.ts`)                  | `public, max-age=31536000, immutable`           |
| Contoh         | `audio/vocab:ba1__zh-CN__female.mp3`  | `audio/9f2c….mp3`                               |

## 3. Backend (`apps/backend`)

- `POST /api/v1/tts` (`cmd/server/main.go:326`, publik + rate-limit 10): body
  `{text, locale, gender}` (models/exam.go:187-191, **tanpa param voice**).
  Default kosong → `zh-CN`/`female`. Batas 4096 char. Balas `{url,text,locale,gender,provider}`
  - header `X-TTS-Cache: hit|miss`.
- Alur `tts_service.go:86-149`: FindByTextHash → miss → singleflight per textHash →
  loop engines → upload → save. Hash `sha256("text::locale::gender")` 16 byte (`:151-154`).
- ⚠️ **Locale non-zh lumpuh di backend**: edge/azure voice-map hanya key `zh-*`
  (fallback zh-CN female); **google engine hardcode `zh-CN-Standard-A/B`, abaikan locale**.
  On-demand de/ja/en = suara Mandarin. (Pre-generate pipeline BENAR per locale —
  alasan satu lagi agar de/ja/en di-pre-generate, bukan on-demand.)
- `GET /api/v1/content/export` (`content_handler.go:218-263`, token bersama, tanpa rate-limit):
  ekspor `id, lang, domain, ref, pos, payload, updated_at` (published only, limit 500/max 1000).
  **Payload disalin verbatim** (`content_service.go:341-352`) — `speakers[]`/`turns` lolos utuh.
- `validatePayload` (`:77-164`): conv wajib title + turns/dialogue non-kosong;
  **tak cek speaker per-turn, tak kenal `speakers[]`**.
- Backend TIDAK menyajikan manifest/audio ke publik (read path = R2/CDN;
  `content.go:8-9`). Web hanya pakai CDN + `POST /tts`.

## 4. Web (`apps/web`)

- `lib/audio.ts` (485 baris). Tangga `preloadAudio`: (a) urlCache memori + localStorage
  `navia-audio-cache` → (b) CDN langsung `<CDN>/audio/<key>__<locale>__<gender>.mp3`
  (manifest-backed only) → (c) `POST /tts` `{text,locale,gender}` (di-cache setelah
  `canplaythrough`) → (d) statik `/audio/...` (manifest-backed only).
- Gender: `gender ?? settings.voiceGender ?? "female"` (3 titik: `:154,239,380`).
  **Caller BISA kirim gender eksplisit** (`play` arg-4, ada `audioUrlWithGender`).
- ⚠️ Anomali: param `locale` di `preloadAudio` **diabaikan** — resolve selalu dari
  `effectiveLocale()` = exam aktif (hsk→zh-CN, tocfl→zh-TW, goethe→de-DE, jlpt→ja-JP,
  toefl→en-US). Locale caller hanya dipakai banding replay.
- Manifest: `loadBundle("audio/manifest")` ~14 MB, cache selamanya (memory + SW `navia-v1`);
  hanya `data-manifest.json` ber-TTL (5 mnt in-memory).
- 12+ call site (semua `settings.voiceGender`): review `:262,:290`, reading `:192`
  (locale hardcode zh-CN!), lesson `:364,:413`, characters `:110`, vocabulary
  `:143,:162,:212`, grammar `:158`, conversations `:93,:162` (locale hardcode zh-CN,
  SATU gender untuk tutor+user), placement `:478`, exam `:437` (full default),
  adaptive `:578`, speaking `:245,:264,:405` + exercise-player, vocab-card, landing.
- Speaking: mic (`getUserMedia`+`MediaRecorder`) + STT teks independen — **gender TTS
  tak pengaruh skor** (hanya warna playback referensi).
- Admin review (`admin/content/page.tsx`): **TIDAK ADA preview audio** — reviewer
  approve JSON buta suara.
- Settings: `voiceGender` default female, persist localStorage `navia-settings` + PUT server.
  **Tanpa versioning/migrasi** — field dihapus = key basi mengendap; dihidupkan lagi =
  nilai lama bangkit.
- Conversation: bubble tutor/user dibedakan tampilan, tapi model `ConversationTurn`
  tanpa field gender/voice — gender per-turn belum didukung data maupun UI.

## 5. Kontributor input (4 jalur)

- A. Media Studio: TANPA input konten (dashboard pipeline saja). 🟢
- B. Form web `/dashboard/contributor`: turns/dialogue/paragraphs = textarea JSON bebas;
  **tanpa field `speakers[]`** (non-zh cuma title/scenario/dialogue). Konsekuensi:
  konten baru ≈ tanpa speakers[] → aturan urutan jadi jalur utama otomatis. 🟡
- C. Backend validasi: presence-only (lolos tanpa speaker). `voiceForEntry` wajib fallback
  posisi, jangan reject. 🟡
- D. Anki import: vocab only. 🟢
- Keputusan input-side: B1 field `speakers` opsional + contoh; B2 hint
  "pembicara pertama = pria"; C1 tanpa reject + flag reviewer; D tanpa perubahan.

## 6. Mobile (`apps/mobile`)

- `useTts`: **NOL pemanggil** — audio mobile belum wired ke screen mana pun.
- 4 hardcode saat wiring: M1 gender female (`:145`) → baca dari manifest;
  M2 locale hsk (`:144`) → baca dari manifest; M3 voice-map zh-only & basi →
  re-sync (sumber media sudah 6 locale); M4 manifest 530 entries basi → re-sync /
  baca CDN. Tak berubah: fallback chain, format cache, default `say()`, 50 MB.
- `sync-mobile.ts` (di `apps/mobile/scripts/`): blind `cp` 3 file + mp3 opsional
  (`COPY_LOCAL_AUDIO=1`). Tidak rutin jalan.

## 7. Data (per domain — ringkas; detail di `AUDIT_JSON_GENDER.md`)

- Vocab 101.385 (90%): kata + `:trad` + 42.684 contoh zh (N 34.450/M 6.507/F 1.727).
  de contoh 3.675 (F 435 = noise "Sie" formal — BUKAN sinyal). en 30 contoh. Kata =
  model pelafalan (tanpa pembicara); contoh = kutipan narator. Contoh warisi suara kata induk.
- Grammar 1.747 (zh 1.349 contoh: N 1.087/M 253/F 9 — F 9/1349 = tiket konten,
  bukan keputusan suara). de 158 / en 20 / ja 220 contoh. Narator per-entry (hash).
- Readings 1.706: narasi 1 suara; protagonis-jelas → ikut protagonis (安娜/Nora/Lena→F;
  小明/Markus/Thomas/Jonas→M); netral → hash. 1 dialog (`r-zai-fandian` 服务员↔客人)
  → split 2 suara (M/F aturan urutan).
- Conversations 617: zh tutor/user (tutor=M bukti 李明, user=F); de/en/ja `speakers[]`
  bernama (aturan: bernama-menang; ambigu Klein=F/Braun=M/Alex=M via kontras+neraca
  13–13/3–3); netral → aturan urutan (pertama=M). ja A/B + nama keluarga → urutan.
- Characters 7.298, placement 16+12, assessment 3, curriculum-exercise 3: narator hash.
- ⚠️ **Curriculum 48 dialogue-steps (mis. 李明↔Ana bernama!) TIDAK masuk manifest**
  (`collectCurriculum` hanya `exercise.audioText`) → hari ini diputar via on-demand.
  Keputusan: ikutkan sebagai entry `curriculum:<lesson>:<step>:d<i>` (aturan speaker sama)?
- Legacy: 2.257 `item.audio` + 264 `dialogue.audio` (mis. `de_conv001_01.mp3`) —
  `audioPath` dipertahankan bila beda key. Cek keberadaan file sebelum hapus skema lama.

## 8. DAFTAR KEPUTUSAN (semua yang kurang — jawab untuk eksekusi)

| ID       | Pertanyaan                                                                         | Usulan              |
| -------- | ---------------------------------------------------------------------------------- | ------------------- |
| Q9       | Setujui skema casting (speaker→suara, netral→hash, contoh warisi kata)?            | YA                  |
| B1/B2/C1 | Field `speakers` opsional + hint urutan + flag reviewer tanpa reject?              | YA                  |
| M1–M4    | Mobile baca gender+locale manifest + re-sync + wiring (PR-3)?                      | YA                  |
| W1       | Toggle `voiceGender` web: hapus total atau simpan tersembunyi?                     | hapus total         |
| W2       | `preloadAudio` locale diabaikan + reading/conv hardcode zh-CN — betulkan sekalian? | YA                  |
| W3       | Admin review tanpa preview audio — tambah tombol play (ikut casting)?              | YA, ringan          |
| R1       | File male lama di R2: biarkan atau hapus massal pasca-rilis?                       | biarkan dulu        |
| R2       | Azure zh-TW female beda voice (HsiaoChen vs HsiaoYu) — samakan?                    | samakan ke HsiaoYu  |
| R3       | `.generate-records.json` hanya 3.401 (tak sinkron 47.769 file) — investigasi?      | YA sebelum full-run |
| D1       | en-US cuma 159 entries — konten en memang segitu atau ada yang tak ke-collect?     | cek                 |
| D2       | Curriculum 48 dialogue-steps masuk manifest?                                       | YA, pola conv       |
| D3       | Legacy `audioPath` (de_conv*.mp3) masih dipakai/dibutuhkan?                        | cek keberadaan file |
| S1       | Settings tanpa migrasi — tambah versioning saat hapus voiceGender?                 | YA, kecil           |

## 9. Rencana eksekusi (setelah keputusan)

- PR-1 media: `gender` per entry (speaker/hash/waris) + 1 task/entry + D2 + R2 + R3 + D1/D3.
- PR-2 web: `voice-casting.ts` + 12 call site + hapus toggle (+S1) + W2 + W3 + B1/B2.
- PR-3 mobile: M1–M4 + wiring pertama. Backend: C1 + tanpa perubahan TTS.
- Estimasi akhir: 112.775 file (±2,35 GB), distribusi ~50/50 M/F se-korpus.
