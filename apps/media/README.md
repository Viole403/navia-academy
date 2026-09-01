# Navia Academy — Media Studio

**Pipeline konten + generasi asset** untuk Navia Academy.

## Purpose

Media Studio memiliki **content pipeline**: pohon JSON di `data/json/` adalah single
source of truth untuk semua konten. Ia menjalankan pipeline audio (TTS) + gambar (AI)
dan **mem-publish** konten menjadi bundle R2/CDN immutable ber-content-hash via
`publish-data`. Backend dan web frontend **tidak menyimpan konten** — user publik selalu
dilayani dari R2/CDN.

Pembagian penyimpanan:

- **Postgres backend** (`apps/backend`, tabel `content_items` di `migrations/0003_content.sql`):
  write path contributor/review via `ContentHandler`. Tidak pernah dibaca user publik.
  Media Studio mengambil/menyinkronkannya lewat bridge HTTP `GET /content/export`
  (`CONTENT_EXPORT_TOKEN`) via script `sync-content`.
- **Supabase project terpisah** (opsional): hanya untuk key pools image/TTS
  (`image_api_keys`, `tts_api_keys`) dan pipeline settings (`media_settings`).
  Kalau unreachable/kosong → fallback ke flat env keys.

## Arsitektur

```text
┌──────────────────────────────────────────────────────────────┐
│  apps/media/data/json/   (source of truth)                  │
│  zh/ · de/ · en/ · ja/   + app-level config (exam-*, …)     │
└────────────────────────────┬─────────────────────────────────┘
                             │  publish-data (content-hashed bundles)
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  R2/CDN                                                     │
│  • data/<lang>/<group>/<sha256>.json    (immutable)         │
│  • data/content-levels.json             (1 bulan)           │
│  • data/data-manifest.json              (max-age 1 hari)    │
│  • audio/<text-hash>.mp3 · images/<hash>.<ext> (+ manifest) │
└────────────────────────────┬─────────────────────────────────┘
                             │  Fetch (cache-first, PWA offline)
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  apps/web/ + mobile                                         │
│  • Content: fetch dari R2/CDN saja                          │
│  • User data: fetch dari apps/backend/ API                  │
└──────────────────────────────────────────────────────────────┘
```

- Asset generation (audio/images) upload ke storage yang sama (prod: R2, dev: RustFS
  di `:9000`, bucket prefix `/navia-data`).
- Image/TTS API keys + pipeline settings dikelola dari dashboard `/keys` → tersimpan di
  Supabase (`image_api_keys`, `tts_api_keys`, `media_settings`); env flat adalah fallback.
- Rollback = revert manifest ke versi sebelumnya — tanpa CDN purge.
- Manifest ditulis **atomik** (upload ke key `.tmp` → final), jadi publish yang
  terputus tidak pernah meninggalkan manifest yang menunjuk bundle yang belum ada.

## Struktur Direktori

```tree
apps/media/
├── data/
│   ├── json/                  # source of truth:
│   │   ├── zh/ · de/ · en/ · ja/
│   │   │   ├── vocabulary/ · grammar/ · curriculum/ · readings/
│   │   │   ├── characters/ · conversations/ · assessments/
│   │   │   └── placement.json          # flat array of questions (WAJIB flat!)
│   │   └── achievements.json · exam-types.json · exam-cards.json ·
│   │       exam-definitions.json · exam-display-names.json ·
│   │       exam-abbreviations.json · exam-badge-colors.json   # app-level config
│   └── output/                # generated: audio/ · images/ (not committed)
├── scripts/
│   ├── publish-data.ts        # data/json → R2/CDN bundles + manifest (+ content-levels)
│   ├── generate-manifest.ts   # audio manifest (text → hash); locale dari path folder
│   ├── generate-audio.ts      # TTS + upload (auto-run generate-manifest dulu)
│   ├── generate-images.ts     # AI images + upload (idem)
│   ├── validate-images.ts     # vision check gambar hasil generate
│   ├── regenerate-images.ts   # re-generate images yang gagal/aneh
│   ├── image-report.ts        # laporan markdown validasi gambar (per unique image)
│   ├── sync-content.ts        # bridge export backend → data/json (--check-only / --publish)
│   ├── import-anki.ts         # import .apkg → data/json
│   ├── check-dedup.mts        # cek duplikasi / naming issues di data/json
│   ├── dedupe-ids.mts         # perbaiki id duplikat
│   ├── backfill-exam-mappings.mts
│   ├── setup-gh-secrets.sh    # helper set GitHub secrets CI
│   └── lib/
│       ├── content.ts         # shared bundle-building + publish core
│       ├── content-levels.ts
│       ├── sync-content.ts
│       └── api-running-guard.ts  # guard mutual-exclusion api vs batch (MEDIA_BATCH_GUARD)
├── migrations/                # Supabase project media:
│   ├── 0001_content.sql       #   LEGACY (era Supabase content_items; kini native PG backend)
│   ├── 0003_image_api_keys.sql · 0004_tts_api_keys.sql · 0005_media_settings.sql
├── src/                       # Next.js dashboard (:3002)
│   └── app/
│       ├── page.tsx           # landing
│       ├── keys/page.tsx      # kelola image/TTS keys + provider (round-robin, cooldown)
│       ├── login/page.tsx
│       └── api/               # anki · auth · generate · import · keys · settings · status
└── .env.example
```

## Quick Start

1. Copy `.env.example` → `.env.local` dan isi credentials (storage, TTS, image provider).
2. `bun run dev` → dashboard di <http://localhost:3002>
3. Generate & publish:

   ```bash
   bun run generate-manifest   # manifest audio dari data/json
   bun run generate-audio      # TTS + upload (incremental, dedup) — auto-run generate-manifest
   bun run generate-images     # AI images + upload (incremental, dedup) — idem
   bun run publish-data        # content → R2/CDN bundles + manifest
   ```

4. (Opsional) Setup Supabase untuk key pools: jalankan `migrations/0003…0005*.sql` di
   Supabase SQL editor, isi `CONTENT_SUPABASE_URL` +
   `CONTENT_SUPABASE_SERVICE_ROLE_KEY`.

## Key Commands

| Command                              | Purpose                                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `bun run dev`                        | Start Media Studio dashboard (:3002)                                                              |
| `bun run publish-data`               | Publish `data/json` → R2 bundles + manifest + content-levels                                      |
| `bun run generate-manifest`          | Rebuild audio manifest dari data/json                                                             |
| `bun run generate-audio`             | Generate audio (TTS) + upload R2 (≈30–45 mnt dataset penuh)                                       |
| `bun run generate-images`            | Generate images (AI) + upload R2                                                                  |
| `bun run validate-images`            | Vision-check hasil gambar                                                                         |
| `bun run regenerate-images`          | Re-generate gambar yang vision-check tandai MISMATCH                                              |
| `bun run image-report`               | Laporan markdown validasi gambar utk eyeballing manual                                            |
| `bun run check-dedup`                | Cek duplikasi / naming issues di data/json                                                        |
| `bun run dedupe-ids`                 | Perbaiki id duplikat                                                                              |
| `bun run backfill-exam-mappings`     | Backfill field examMappings                                                                       |
| `bun run sync-content`               | Tarik konten review dari backend → data/json (`--check-only` dry-run, `--publish` lanjut publish) |
| `bun run import-anki -- <file.apkg>` | Import Anki deck                                                                                  |

`validate-images` → `regenerate-images` bisa dijalankan berurutan tanpa flag:
laporan mismatch default ditulis/dibaca dari `.output/images/vision-mismatches.json`.

## Trigger Pipeline: 3 Jalur (hasil sama, R2/CDN yang sama)

| Jalur                 | Cara                                                                 | Untuk                                                                                |
| --------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **VPS CLI**           | `bun run generate-audio` / `generate-images` langsung                | Full control; guard mutual-exclusion aktif                                           |
| **GitHub Actions**    | Tab Actions → `media-generate` → Run workflow (inputs: scope/engine) | Backfill/inkremental di runner ephemeral — tanpa kontensi VPS                        |
| **Dashboard trigger** | Media Studio → tombol batch → `POST /api/generate/batch`             | Trigger jarak jauh ke workflow GH yang sama; status via `/api/generate/batch/status` |

Ketiga jalur konvergen ke satu workflow `.github/workflows/media-generate.yml`
(group `concurrency:` konstan → dua run tidak pernah overlap, dari sumber mana pun).
Runner CI ephemeral aman berkat dedup R2 unconditional di kedua runner
(checkpoint lokal = optimasi performa, bukan syarat kebenaran).

### Guard mutual-exclusion dengan API

Batch generation share budget CPU/RAM VPS dengan API backend dan **tidak boleh overlap**.
`scripts/lib/api-running-guard.ts` memprobe `MEDIA_API_HEALTH_URL` (default
`:8080/api/v1/health`) sebelum mulai:

- unset / `warn` (default) → peringatan keras, lanjut
- `strict` → refuse to start (exit 1)
- `off` → skip check

### Env tambahan

**GitHub repo secrets** (untuk workflow — nama saja, isi manual via UI):
`MEDIA_IMAGE_CF_ACCOUNT_ID`, `MEDIA_IMAGE_CF_API_TOKEN`, `MEDIA_IMAGE_CF_MODEL`,
`CONTENT_SUPABASE_URL`, `CONTENT_SUPABASE_SERVICE_ROLE_KEY`
(+ yang sudah ada: MEDIA_STORAGE__, MEDIA_TTS__/GOOGLE/AZURE, MEDIA_IMAGE_*).

**Vercel (deploy dashboard apps/media — target baru, saat ini masih local :3002):**
`GH_PAT` (fine-grained PAT, 1 repo, scope _Actions: read & write_),
`GH_REPO` (`owner/repo`), opsional `GH_WORKFLOW` (default `media-generate.yml`)
dan `GH_REF` (default `main`).

## Content Pipeline (Staged Release)

```text
1. Author/edit    → data/json/<lang>/<group>/*.json  (source of truth)
2. Validate       → bun run check-dedup + validate-images (CI juga jalan di ci.yml)
3. Release        → bun run publish-data / GH Action media-generate.yml (manual)
4. Propagate      → client ambil manifest baru sesuai TTL cache-nya
```

**Anti-duplikasi (assets):**

- Audio: dedup by `text+locale+gender` hash
- Images: dedup by `translation` hash

**Apa yang di-publish:**

- Content-hashed bundles: `data/<lang>/<group>/<sha256>.json` (immutable)
- Whitelist level: `data/content-levels.json` (`max-age=2592000`, 1 bulan)
- Version manifest: `data/data-manifest.json` (`max-age=86400`, 1 hari)

**Benefits:**

- ✅ No CDN purge needed (new release = new hashed URLs)
- ✅ Client cache forever (cache-first, PWA offline)
- ✅ Rollback = revert manifest to previous version
- ✅ DB tidak dibaca user publik → aman untuk free tier (banyak user)

## Supabase (key pools + settings)

`migrations/0003_image_api_keys.sql` + `0004_tts_api_keys.sql` — tabel key pool:

```sql
image_api_keys / tts_api_keys (
  id            uuid primary key,
  provider      text,
  name          text,
  api_key       text,        -- hanya service-role yang bisa baca
  enabled       boolean,
  cooldown_until timestamptz,
  last_error    text,
  last_used_at  timestamptz
)
```

`migrations/0005_media_settings.sql` — `media_settings` (provider/engine aktif, edit via
dashboard `/keys` → Provider tab). Precedence: env var > DB setting > default.

> Setidaknya BUTUH `CONTENT_SUPABASE_URL` + `CONTENT_SUPABASE_SERVICE_ROLE_KEY` ketika
> memakai key pools / media_settings. Kalau tabel unreachable/empty, flat env keys jadi
> fallback. Konten (`content_items`) BUKAN di sini — itu milik Postgres backend
> (`apps/backend/migrations/0003_content.sql`); `migrations/0001_content.sql` di folder
> ini adalah legacy era Supabase.

## Environment

Sumber lengkap & komentar konteks: `.env.example`.

```env
# Storage (S3-compatible: local RustFS / R2 / GCS / S3 / MinIO)
MEDIA_STORAGE_PROVIDER=s3               # s3 | r2 | gcs
MEDIA_STORAGE_BUCKET=navia-data
MEDIA_STORAGE_REGION=us-east-1          # R2: auto
MEDIA_STORAGE_ENDPOINT=                 # RustFS/MinIO: http://localhost:9000
MEDIA_STORAGE_ACCESS_KEY=<key>
MEDIA_STORAGE_SECRET_KEY=<secret>
MEDIA_STORAGE_PUBLIC_URL=http://localhost:9000/navia-data

# Supabase (key pools + media_settings) — opsional
CONTENT_SUPABASE_URL=
CONTENT_SUPABASE_SERVICE_ROLE_KEY=

# Bridge konten dari backend (GET /content/export)
CONTENT_EXPORT_TOKEN=                   # harus identik dgn backend

# TTS / Image provider
MEDIA_TTS_ENGINE=edge                   # edge | google | azure
MEDIA_IMAGE_PROVIDER=openai             # openai | gemini | deepai | cloudflare
MEDIA_ADMIN_TOKEN=change-me             # lock dashboard (kosong = open utk local dev)
```

**Recommended production:** Cloudflare R2 — audio **dan** images sama-sama ke R2
(immutable, content-hashed, no egress fee, 10 GB storage gratis).

## Multi-Language Support

Exam aktif per bahasa (**fixed 5**, tipe lain sudah dihapus):

| Language         | Code | Exam           | Status struktur   |
| ---------------- | ---- | -------------- | ----------------- |
| Mandarin Chinese | `zh` | `hsk`, `tocfl` | ✅ paling lengkap |
| German           | `de` | `goethe`       | 🟡 bertumbuh      |
| English          | `en` | `toefl`        | 🟡 bertumbuh      |
| Japanese         | `ja` | `jlpt`         | 🟡 bertumbuh      |

Setiap bahasa punya struktur identik:

```tree
data/json/<lang>/
├── vocabulary/ · grammar/ · curriculum/ · readings/
├── characters/ · conversations/ · assessments/
└── placement.json            # WAJIB flat array of questions (object → bank kosong)
```

Aturan penulisan konten:

- Voice locale diturunkan dari **path folder** (HSK → `zh-CN`, TOCFL → `zh-TW`),
  bukan dari `examMappings`.
- Setiap item bernada wajib punya `pinyin` **dan** `zhuyin`; pertahankan reading
  polyphonic/neutral-tone hasil verifikasi manual.
- Field learner membawa varian `_id` (Indonesia) + `_en` (English);
  `translation` tetap English canonical.

## Staging & Release Strategy

1. **Edit** → `data/json` (author/edit langsung di JSON tree)
2. **Validate** → `bun run check-dedup` (+ `validate-images` setelah generate)
3. **Generate** → `bun run generate-manifest` → `generate-audio` / `generate-images`
4. **Publish** → `bun run publish-data` (manual / via `media-generate.yml`)

No CDN purge needed — rilis baru meng-upload file hashed baru.

## Import Anki Decks

```bash
# Import .apkg deck
bun run import-anki -- path/to/deck.apkg

# Output: parsed notes di data/json/zh/vocabulary/
```

## GitHub Actions Integration

Generasi batch besar (audio/images) + publish content dijalankan via **GitHub Actions**
(gratis): `.github/workflows/media-generate.yml` (manual).

Secrets CI: `MEDIA_STORAGE_*`, plus TTS/image keys (flat maupun pooled via
`CONTENT_SUPABASE_URL` + `CONTENT_SUPABASE_SERVICE_ROLE_KEY`). See
`scripts/setup-gh-secrets.sh`.

## Development vs Production

| Environment     | Content store                 | Storage                                                                        | CDN konten                                                  |
| --------------- | ----------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| **Development** | `data/json` (source of truth) | RustFS lokal `http://localhost:9000` (bucket `navia-data`, public-read + CORS) | `NEXT_PUBLIC_DATA_CDN_URL=http://localhost:9000/navia-data` |
| **Production**  | `data/json` → publish-data    | Cloudflare R2                                                                  | domain custom R2 / CDN                                      |

**Development workflow:**

```bash
# Edit content
nano data/json/zh/vocabulary/hsk/hsk1.json

# Validate + publish lokal (RustFS)
bun run check-dedup
bun run publish-data
```

**Production workflow:**

```bash
# Publish ke R2/CDN
bun run publish-data

# Atau jalankan GH Action "Media Generate" (manual) — generate + publish sekaligus
```

## Troubleshooting

### Storage not configured

```text
Error: Storage not configured. Set MEDIA_STORAGE_* (see .env.local)
```

**Fix:** Copy `.env.example` → `.env.local` dan isi credentials.

### DeepAI image generation fails with "Please try this model on deepai.org"

**Fix:** Otomatis — `MEDIA_IMAGE_PROVIDER=deepai` fallback ke headless Chrome
(puppeteer-core) yang meniru browser asli. Pastikan Chrome/Chromium terpasang
(preinstalled di GH Actions runner) atau set `CHROME_PATH`.

### Key pool / media_settings unreachable

**Fix:** Jalankan `migrations/0003_image_api_keys.sql` (dan 0004/0005 bila perlu) di
Supabase SQL editor, lalu isi env. Tanpa DB, key pools di-skip → flat env keys
(`MEDIA_IMAGE_*` / `MEDIA_TTS_*`) dipakai sebagai fallback.

### RustFS connection refused

```text
Error: connect ECONNREFUSED 127.0.0.1:9000
```

**Fix:** Start RustFS container. Container harus dibuat dengan **CORS enabled** dan
volume `/data` termount — kalau container direcreate tanpa volume, IAM user + bucket
hilang (lihat komentar `.env.example`):

```bash
podman run -p 9000:9000 \
  -e RUSTFS_CORS_ALLOWED_ORIGINS='*' \
  -e RUSTFS_CONSOLE_CORS_ALLOWED_ORIGINS='*' \
  -v ~/rustfs/data:/data rustfs/rustfs
```

Bucket `navia-data` harus **public-read** — kalau tidak, browser dapat 403/audio kosong.

### Batch generation menolak start (guard)

Guard mendeteksi health endpoint API menjawab → matikan dulu API, atau set
`MEDIA_BATCH_GUARD=off` bila overlap memang disengaja.

## Contributing

Kontribusi konten welcome! Edit di `data/json/<lang>/` dan submit PR (CI menjalankan
`check-dedup` + validasi). Lihat `CONTRIBUTING.md` di root untuk guidelines.

## License

See `LICENSE` di root.
