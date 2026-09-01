# Navia — Language Academy

> Open-source, multi-language exam preparation platform

Navia adalah platform belajar bahasa (Mandarin, Jerman, Jepang, Inggris) dengan
kurikulum terarah ujian yang terbatas pada **5 exam**: **HSK** & **TOCFL** (zh) ·
**Goethe-Zertifikat** (de) · **JLPT** (ja) · **TOEFL iBT** (en).

## Struktur Monorepo

```
huanyu-academy/
├── apps/
│   ├── web/          # Next.js frontend learner-facing (App Router, React 19, Tailwind v4)
│   ├── media/        # Media Studio — tool contributor + pipeline audio/gambar/publish
│   ├── backend/      # Go/Fiber REST API — user data + content write path
│   └── mobile/       # Expo + React Native app
├── packages/
│   ├── types/        # Shared TypeScript types (@navia/types)
│   ├── utils/        # Shared utilities (@navia/utils)
│   └── eslint-config # Shared ESLint config (@navia/eslint-config)
├── .github/workflows/  # ci.yml · media-generate.yml · eas-build.yml
├── docker-compose.yml  # full dev stack lokal (postgres + redis + api)
├── SETUP.md            # Panduan setup lengkap
├── DEPLOYMENT.md       # Panduan deploy produksi (VPS + Vercel + R2)
├── AGENTS.md           # Catatan arsitektur untuk AI coding agents
└── turbo.json
```

Toolchain: **Bun 1.4+ + Turborepo**, Go 1.26+.

## Arsitektur Konten — JSON source + read-path CDN

**Prinsip inti: konten ditulis di `apps/media/data/json/` dan dipublikasikan ke CDN.
Database tidak pernah di-query di read path publik.**

```
CONTRIBUTOR / EDITOR                USER
   │ edit data/json                   ▲ fetch (cache-first, immutable)
   ▼ apps/media                       │
┌──────────────────────────┐   ┌──────────────────────────────┐
│ data/json (source)       │   │ R2 / CDN (read path)         │
│ • zh/ de/ en/ ja/        │   │ • JSON bundles (hashed, ∞)   │
│ • app-level config       │   │ • audio + images (R2, hashed)│
└───────────┬──────────────┘   │ • data-manifest.json         │
            │ publish-data     └──────────────────────────────┘
            ▼
┌──────────────────────────────────────────────┐
│ apps/media — publish-data                    │
│ content-hashed bundles → upload R2 → update  │
│ manifest → tanpa CDN purge                   │
└──────────────────────────────────────────────┘
```

Mengapa arsitektur ini (ramah free-tier):

- **Read publik tidak pernah menyentuh egress Vercel/Supabase** — bandwidth Vercel gratis
  kecil; menyajikan semua konten lewat database/API akan meledakkan limit egress begitu
  user bertambah. Objek CDN immutable + globally cached, jadi origin (R2) hanya kena satu
  kali per hash.
- **Rilis = URL hashed baru** — tanpa CDN purge, tanpa cache stampede. Bundle yang tidak
  berubah mempertahankan URL-nya (cache selamanya).
- **Audio dan gambar sama-sama masuk R2** — deterministic keys, immutable, tanpa biaya egress.

| Layer                        | Write path                 | Read path        | Cache                           |
| ---------------------------- | -------------------------- | ---------------- | ------------------------------- |
| User data (progress, SRS, …) | Postgres via backend API   | backend API      | **tidak pernah**                |
| Content (draft/review)       | Postgres `content_items`   | — (internal)     | tidak                           |
| Content (published)          | `data/json` → publish-data | **hanya R2/CDN** | immutable + manifest 1 hari     |
| Audio / images               | Media Studio → R2          | R2/CDN           | immutable                       |
| Response API (Go/Fiber)      | —                          | backend API      | user data tidak pernah di-cache |

## Dokumentasi

- **[SETUP.md](./SETUP.md)** — panduan setup lengkap dev & production
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — langkah deploy produksi (R2 public + backend VPS + web Vercel)
- **[AGENTS.md](./AGENTS.md)** — catatan arsitektur & konvensi untuk AI coding agents
- **[apps/backend/README.md](./apps/backend/README.md)** — detail API, env, resource budget VPS
- **[apps/media/README.md](./apps/media/README.md)** — pipeline konten & asset generation

## Quick Start

```bash
# Install dependencies
bun install

# Jalankan backend + web sekaligus dari root
# (root script "dev" = make -C apps/backend dev & turbo dev)
bun run dev
# Backend :8080 · Web :3000 · Media Studio :3002 (jalankan terpisah bila perlu)
```

Per-app:

```bash
bun run backend:dev                       # Go/Fiber API (Air hot-reload, :8080)
bun run --filter @navia/web dev           # Next.js :3000
bun run --filter @navia/media dev         # Media Studio dashboard :3002
```

Detail setup: **[SETUP.md](./SETUP.md)**

### Prasyarat Backend

- Go 1.26+ (untuk native/hot-reload) — atau full-Docker tanpa install Go
- Postgres + Redis via `DATABASE_URL` / `REDIS_URL` — container, lokal, atau cloud managed.
  Ada dua compose: root = full dev stack; `apps/backend` = api-only untuk VPS.

**Opsi A — Full Docker:**

```bash
docker compose up -d                                      # postgres + redis + api
psql "postgres://navia:navia-dev@localhost:5432/navia" \
     -f apps/backend/migrations/*.sql                     # schema — TIDAK ada automigration
# API :8080 siap
```

**Opsi B — Native (hot-reload):**

```bash
cd apps/backend
cp .env.example .env          # isi DATABASE_URL, REDIS_URL, JWT_*, STORAGE_* ...
psql "$DATABASE_URL" -f migrations/*.sql   # schema — TIDAK ada automigration
make dev                      # Air hot-reload — API lokal di :8080
```

Deploy self-hosted:

```bash
make -C apps/backend build    # go build -o bin/server ./cmd/server
./bin/server                  # atau: make -C apps/backend docker-up (compose api-only)
```

Di VPS production: Postgres/Redis = layanan cloud eksternal; job batch `apps/media` dan
API **tidak boleh berjalan bersamaan** (share budget CPU/RAM yang sama) — lihat seksi
[VPS Resource Budget](./apps/backend/README.md#vps-resource-budget-required-once-per-host)
di README backend.

### Data

Single source of truth untuk data kurikulum adalah pohon JSON di `apps/media/data/json/`.
`bun run data:publish` membacanya menjadi bundle R2/CDN immutable (content-hashed + manifest).
Proses ini idempotent:

```bash
bun run data:publish            # data/json → bundle R2/CDN + manifest
```

Tabel `content_items` di Postgres (via `ContentHandler` backend) hanyalah record
contributor/review — tidak pernah dibaca user publik.

## Arsitektur

### Backend (`apps/backend`) — Go/Fiber (self-hosted)

- **Runtime**: Go + Fiber (binary self-hosted); Postgres + Redis via env
  (`DATABASE_URL` / `REDIS_URL`)
- **Database**: PostgreSQL — **user data** (progress, SRS, sessions, tasks, games,
  achievements) + **content write path** (`content_items`). Key pools TTS/image media
  bukan miliknya — itu tabel Supabase project `apps/media`.
- **Auth**: custom JWT HS256 (`token_pair`); register/login/refresh/me/reset-password +
  Google OAuth. Register publik **selalu** role `student`; role staff dibuat admin via
  `/admin/users`
- **Response contract**: envelope `{success, data, error:{code,message}}`
- **Docs**: Scalar API reference di `/scalar`, Swagger di `/docs/*`
- **Deploy**: self-hosted — `make build` → jalankan `bin/server`

Backend tidak pernah menyajikan konten — user publik membacanya dari R2/CDN.

### Media Studio (`apps/media`)

- Next.js 16 dashboard + CLI untuk workflow contributor & asset pipeline
- **Content store**: JSON tree `data/json/` (source of truth); write path review via
  tabel `content_items` di Postgres backend
- Pipeline audio (edge/google/azure TTS) & gambar (OpenAI/Gemini/deepai) → **R2**
- Upload ke storage S3-compatible: RustFS lokal, R2, GCS, AWS S3
- **Anti-duplikat**: audio dedup by `text+locale+gender`, gambar dedup by hash `translation`
- Import Anki `.apkg`; sinkronisasi dua arah dengan backend via `sync-content`
- `publish-data` — publish `data/json` → R2/CDN (bundle content-hashed + manifest)
- Generasi batch besar via **GitHub Actions** (`media-generate.yml`, manual)

### Web Frontend (`apps/web`)

- Next.js 16 App Router, TypeScript strict, React 19, Tailwind CSS v4
- Zustand (state), React Hook Form + Zod (forms)
- Auth JWT via backend (`token_pair` di localStorage `navia-session`)
- PWA dengan service worker offline (`navia-v1`)
- Path alias: `@/*` → `./src/*`
- **Runtime data konten** (`src/lib/data-client.ts`): cache-first JSON bundles dari
  R2/CDN (manifest-resolved, URL immutable). Konten **tidak pernah** di-fetch dari
  backend/database.

## Content Pipeline (Staged Release)

1. **Contribute/edit** → edit pohon JSON `apps/media/data/json/<lang>/`
   (Media Studio / CLI).
2. **Validate** → `bun run data:validate-images` + `check-dedup` (CI juga menjalankannya
   di `ci.yml`).
3. **Release** → `bun run data:publish` (atau GitHub Action `media-generate.yml` — manual):
   baca `data/json`, build bundle content-hashed, upload ke R2, update `data-manifest.json`.
4. **Propagate** → client mengambil manifest baru saat TTL-nya habis; bundle yang tidak
   berubah tetap memakai URL lama (cached forever). Tanpa CDN purge.

Strategi cache (ramah free-tier):

| Layer                 | Cache-Control               | Catatan                                        |
| --------------------- | --------------------------- | ---------------------------------------------- |
| Content JSON bundles  | `immutable`                 | URL content-hashed; rilis baru = URL baru      |
| Audio / images (R2)   | `immutable`                 | deterministic keys, tanpa biaya egress         |
| `data-manifest.json`  | `max-age=86400` (1 hari)    | rollback = revert manifest ke versi sebelumnya |
| `content-levels.json` | `max-age=2592000` (1 bulan) | whitelist level per bahasa                     |

## Media Studio (`apps/media`)

Pipeline konten + aset terpusat: memiliki pohon JSON (`apps/media/data/json`),
menghasilkan **audio** (edge / Google / Azure TTS) dan **gambar** (OpenAI / Gemini /
deepai), lalu upload keduanya ke storage S3-compatible — **RustFS lokal, R2 / GCS /
AWS S3 di production**.

- **Anti-duplikat**: audio dedup by `text+locale+gender`; gambar by hash `translation` —
  teks yang sama hanya disintesis sekali.
- **Locale voice mengikuti path folder konten**: folder HSK → `zh-CN`, TOCFL → `zh-TW`
  (lihat `examForFile` di `scripts/generate-manifest.ts`). Item dengan mapping ganda pun
  tetap mengikuti locale foldernya.
- **Display modes**: aplikasi punya 6 mode tampilan — Hanzi, +Pinyin, +Zhuyin (Bopomofo),
  +Translation, atau semuanya. Setiap item bernada harus punya `zhuyin`.

```bash
# Konten: data/json → R2/CDN (bundle content-hashed + manifest)
bun run data:publish

# Aset (audio + gambar, sama-sama → R2)
bun run data:generate-manifest
bun run data:generate-audio      # ≈30–45 menit utk dataset penuh; jalankan di GitHub Actions
bun run data:generate-images     # gambar (prompt POS-aware, dedup by concept)
bun run data:validate-images     # cek gambar-vs-konsep via Gemini vision
bun run data:regenerate-images   # regenerate yang mismatch dari laporan check
bun run data:import-anki -- path/to/deck.apkg --dump out.json
```

Generasi batch besar berjalan di workflow **GitHub Actions** gratis
(`.github/workflows/media-generate.yml`), lalu publish bundle ke R2/CDN. Job batch ini
saling eksklusif dengan API backend (guard `MEDIA_BATCH_GUARD`) — lihat README backend.

## Audio & Voices

- **Voice gender** (Female/Male) diatur di Settings → Sound dan berlaku untuk semua audio.
- **Voice locale mengikuti folder konten**: HSK → Mandarin mainland (`zh-CN`),
  TOCFL → Taiwanese Mandarin (`zh-TW`). Tidak ada cross-locale fallback (beda aksara/suara).
- Audio digenerate oleh Media Studio (`bun run data:generate-audio`), diupload ke **R2**,
  dan disajikan via `NEXT_PUBLIC_AUDIO_CDN_URL`.
- TTS on-demand untuk teks arbitrer lewat backend (`POST /api/v1/tts`).

## CI/CD

- `.github/workflows/ci.yml` — lint + typecheck (web, backend-Go, media, mobile) +
  validasi data JSON.
- `.github/workflows/media-generate.yml` — manual: generate audio/images/manifest di
  GitHub Actions, lalu publish bundle → R2.
- `.github/workflows/eas-build.yml` — Expo EAS builds (mobile).

## Dokumentasi API

Saat server berjalan (lokal/deployed):

- Scalar UI: `http://localhost:8080/scalar`
- Swagger: `http://localhost:8080/docs/*`

## Contributing

Lihat [SETUP.md](./SETUP.md) untuk setup environment development dan
[CONTRIBUTING.md](./CONTRIBUTING.md) untuk guidelines kontribusi konten.

## License

MIT
