# Setup Guide — Navia

Instruksi setup lengkap untuk environment development dan production.

## Daftar Isi

- [Prasyarat](#prasyarat)
- [Setup Development](#setup-development)
- [Setup Production](#setup-production)
- [Deployment Production → DEPLOYMENT.md](./DEPLOYMENT.md)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Storage Setup](#storage-setup)
- [Troubleshooting](#troubleshooting)

---

## Prasyarat

### Wajib

- **Node.js** 22+
- **Go** 1.26+ (backend)
- **pnpm** 9+ (package manager kanonik monorepo; `bun.lock` diabaikan)
- **Git**

### Opsional (fitur penuh)

- **Docker/Podman** — bebas dipilih: untuk menjalankan **Postgres/Redis lokal**
  (`docker run`), storage RustFS, dan/atau menjalankan **API via container**
  (`apps/backend/Dockerfile` + compose api-only)
- **RustFS/MinIO lokal** atau akun **Cloudflare R2** (storage S3-compatible)
- **Postgres + Redis** lokal ATAU cloud managed (Neon, Supabase Postgres, Upstash, …)

> Ada **dua file compose dengan peran berbeda** — jangan tertukar:
>
> | File                              | Peran                                                                               |
> | --------------------------------- | ----------------------------------------------------------------------------------- |
> | `docker-compose.yml` (root)       | **Full dev stack lokal**: postgres + redis + api sekaligus                          |
> | `apps/backend/docker-compose.yml` | **API-only untuk VPS production** (pg/redis = layanan cloud managed; resource caps) |
>
> Kredensial database selalu lewat `DATABASE_URL` / `REDIS_URL` — sumbernya bebas
> (container, native lokal, atau cloud managed).

---

## Setup Development

### 1. Clone & Install

```bash
git clone <repo-url>
cd huanyu-academy
pnpm install
```

### 2. Backend (Go/Fiber)

Siapkan database dulu — bebas pilih cara:

```bash
# Contoh: Postgres + Redis lokal via docker run (ATAU pakai cloud managed)
docker run -d --name navia-pg -p 5432:5432 \
  -e POSTGRES_USER=navia -e POSTGRES_PASSWORD=navia-dev -e POSTGRES_DB=navia postgres:16
docker run -d --name navia-redis -p 6379:6379 redis:7
```

Lalu apply schema & jalankan API — pilih salah satu:

**Opsi A: Full Docker** (root compose: postgres + redis + api sekaligus):

```bash
docker compose up -d                                        # dari repo root
psql "postgres://navia:navia-dev@localhost:5432/navia" \
     -f apps/backend/migrations/*.sql                       # migrasi tetap manual!
```

**Opsi B: Native API + DB bebas** (hot-reload Air — paling nyaman utk develop):

```bash
# DB bisa docker run manual ATAU cloud managed:
docker run -d --name navia-pg -p 5432:5432 \
  -e POSTGRES_USER=navia -e POSTGRES_PASSWORD=navia-dev -e POSTGRES_DB=navia postgres:16
docker run -d --name navia-redis -p 6379:6379 redis:7

cd apps/backend
cp .env.example .env

# Edit .env:
# DATABASE_URL=postgresql://navia:navia-dev@localhost:5432/navia   (atau cloud URL)
# REDIS_URL=redis://localhost:6379
# JWT_ACCESS_SECRET=...   (min 32 char)
# JWT_REFRESH_SECRET=...

psql "$DATABASE_URL" -f migrations/*.sql   # apply schema (sekali per DB; idempotent)

make dev                                   # Air hot-reload → http://localhost:8080
```

**Opsi C: Container API saja** (DB di luar — mis. cloud):

```bash
cd apps/backend
cp .env.example .env                       # DATABASE_URL menunjuk DB-mu
psql "$DATABASE_URL" -f migrations/*.sql   # migrasi tetap manual
make docker-up                             # = docker compose up -d (api-only compose)
```

### 3. Storage Lokal (RustFS)

Konten & audio dibaca web dari storage publik. Untuk dev pakai RustFS di `:9000`:

```bash
podman run -d --name rustfs -p 9000:9000 \
  -e RUSTFS_CORS_ALLOWED_ORIGINS='*' \
  -e RUSTFS_CONSOLE_CORS_ALLOWED_ORIGINS='*' \
  -v ~/rustfs/data:/data \
  rustfs/rustfs
```

Penting:

- **CORS wajib** — tanpa itu browser dapat 403/audio kosong saat memuat audio.
- **Volume `/data` wajib termount** — IAM user + bucket dipulihkan darinya;
  recreate container tanpa volume = kredensial hilang.
- Buat bucket `navia-data` dan set **public-read**
  (`aws s3 mb s3://navia-data --endpoint-url http://localhost:9000`).

MinIO juga bisa (lihat `.env.example` media).

### 4. Publish Konten ke Storage

Urutan boot penting: halaman landing web (SSR) membaca bundle `landing/demo` dari CDN.

1. Storage hidup (step 3).
2. `pnpm data:publish` dari root — upload bundle + manifest (atomik).
3. Baru start web.

Bila web start sebelum publish selesai, SSR menunggu ±8s lalu degrade ke retry
client-side dengan skeleton — tidak crash.

### 5. Web App (Next.js)

`apps/web` belum punya `.env.example` — buat `.env.local` manual:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_DATA_CDN_URL=http://localhost:9000/navia-data
NEXT_PUBLIC_AUDIO_CDN_URL=http://localhost:9000/navia-data
NEXT_PUBLIC_IMAGE_BASE_URL=http://localhost:9000/navia-data
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

```bash
pnpm --filter @navia/web dev    # → http://localhost:3000
```

> Gotcha dev: service worker `navia-v1` bisa menyajikan konten stale setelah
> perubahan konten — `caches.delete('navia-v1')` lalu hard reload.

### 6. Media Studio

```bash
cd apps/media
cp .env.example .env.local

# Minimal (storage):
MEDIA_STORAGE_PROVIDER=s3
MEDIA_STORAGE_BUCKET=navia-data
MEDIA_STORAGE_REGION=us-east-1
MEDIA_STORAGE_ENDPOINT=http://localhost:9000
MEDIA_STORAGE_ACCESS_KEY=rustfsadmin
MEDIA_STORAGE_SECRET_KEY=rustfsadmin
MEDIA_STORAGE_PUBLIC_URL=http://localhost:9000/navia-data

# Bridge konten dari backend (opsional, untuk sync-content):
CONTENT_EXPORT_TOKEN=<sama persis dgn backend>

# Key pools/settings via Supabase (opsional):
# CONTENT_SUPABASE_URL=...
# CONTENT_SUPABASE_SERVICE_ROLE_KEY=...
```

```bash
pnpm dev                        # dashboard → http://localhost:3002

pnpm generate-manifest && pnpm generate-audio   # TTS (butuh kunci utk engine non-edge)
pnpm publish-data               # data/json → R2/RustFS bundles + manifest
```

Provider gambar: `MEDIA_IMAGE_PROVIDER=openai | gemini | deepai | cloudflare`
(detail DeepAI/headless Chrome lihat komentar `.env.example`).

### 7. Jalankan Semua

Dari root:

```bash
pnpm dev        # make -C apps/backend dev & turbo dev (web; media/mobile exclude via turbo)
```

Atau per terminal terpisah:

```bash
pnpm backend:dev                # Terminal 1: API :8080
pnpm --filter @navia/web dev    # Terminal 2: Web :3000
pnpm --filter @navia/media dev  # Terminal 3: Media Studio :3002
# Mobile (opsional):
cd apps/mobile && cp .env.example .env && pnpm start
```

---

## Setup Production

### 1. Backend (self-hosted binary)

Tidak ada workflow deploy otomatis — build & jalankan sendiri di hostmu.

```bash
cd apps/backend
make build                      # go build -o bin/server ./cmd/server
cp .env.example .env            # DATABASE_URL (managed, ?sslmode=require), REDIS_URL, JWT_*
bash scripts/compute-resource-limits.sh   # tulis cap CPU/RAM hasil deteksi host

# Jalankan — bebas pilih:
./bin/server                    # Opsi A: native binary
make docker-up                  # Opsi B: container (compose api-only + resource caps)
```

> Root `docker-compose.yml` (full stack dev) **bukan** untuk production — di VPS
> pakai compose api-only `apps/backend` dengan DB managed eksternal.

- Postgres/Redis = **layanan managed eksternal** (bukan service di compose).
- Migrasi manual sekali per DB: `psql "$DATABASE_URL" -f migrations/*.sql`.
- Batch media & api **tidak boleh konkuren** — guard `MEDIA_BATCH_GUARD`
  memperingatkan/menolak bila overlap (detail: README backend).

### 2. Web (Vercel)

```bash
cd apps/web
npx vercel --prod               # atau connect GitHub via dashboard
```

Environment variables di Vercel: sama seperti dev, tapi `NEXT_PUBLIC_API_BASE_URL`,
`NEXT_PUBLIC_DATA_CDN_URL`, `NEXT_PUBLIC_AUDIO_CDN_URL`, `NEXT_PUBLIC_IMAGE_BASE_URL`
menunjuk domain backend/CDN publik; `NEXT_PUBLIC_SITE_URL` = domain app.

### 3. Storage (Cloudflare R2)

```bash
wrangler r2 bucket create navia-data
# Enable Public Access atau custom domain (Dashboard → R2 → Settings)
```

Set di `apps/media/.env.local`:

```env
MEDIA_STORAGE_PROVIDER=r2
MEDIA_STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
MEDIA_STORAGE_ACCESS_KEY=<key>
MEDIA_STORAGE_SECRET_KEY=<secret>
MEDIA_STORAGE_BUCKET=navia-data
MEDIA_STORAGE_REGION=auto
MEDIA_STORAGE_PUBLIC_URL=https://cdn.domainmu.com
```

Cache headers di-set otomatis saat publish: bundle/audio/gambar `immutable`,
`data-manifest.json` `max-age=86400`, `content-levels.json` `max-age=2592000`.
Egress R2 selalu $0.

### 4. Publishing Konten (Production)

```bash
pnpm data:publish
# Atau trigger GH Action "media-generate" (manual): generate audio/images → publish
```

### 5. CI/CD

Workflow di `.github/workflows/`:

- **`ci.yml`** — lint + typecheck (web, backend-Go, media, mobile) + validasi JSON.
- **`media-generate.yml`** — manual: generate audio/images → publish R2.
- **`eas-build.yml`** — EAS builds mobile (tag `v*` / manual dispatch).

GitHub secrets utama: `MEDIA_STORAGE_*`, TTS/image keys,
`CONTENT_SUPABASE_URL` + `CONTENT_SUPABASE_SERVICE_ROLE_KEY` (key pools),
`EXPO_TOKEN` (mobile). Helper: `apps/media/scripts/setup-gh-secrets.sh`.

---

## Environment Variables

Referensi lengkap per app ada di `.env.example` masing-masing:

| App     | File                                     | Kunci utama                                                                                                                                                                                                                |
| ------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| backend | `apps/backend/.env.example`              | `DATABASE_URL`, `REDIS_URL`, `JWT_*`, `SITE_URL`, `CORS_ORIGINS`, `AUTH_GOOGLE_*`, `KOFI_VERIFICATION_TOKEN`, `TRAKTEER_WEBHOOK_SECRET`, `CONTENT_EXPORT_TOKEN`, `STORAGE_*`, `TTS_ENGINE`, cap resource `API_*`/`MEDIA_*` |
| web     | _(belum ada example — lihat README web)_ | `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_DATA_CDN_URL`, `NEXT_PUBLIC_AUDIO_CDN_URL`, `NEXT_PUBLIC_IMAGE_BASE_URL`, `NEXT_PUBLIC_SITE_URL`                                                                                  |
| media   | `apps/media/.env.example`                | `MEDIA_STORAGE_*`, `MEDIA_TTS_ENGINE`, `MEDIA_IMAGE_*`, `CONTENT_SUPABASE_*` (opsional), `CONTENT_EXPORT_TOKEN`, `MEDIA_ADMIN_TOKEN`                                                                                       |
| mobile  | `apps/mobile/.env.example`               | `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_DATA_CDN_URL`, `EXPO_PUBLIC_AUDIO_CDN_URL`, `EXPO_PUBLIC_MEDIA_BASE_URL`, `EXPO_PUBLIC_API_DEBUG`                                                                                      |

---

## Database Setup

Ada dua store yang **terpisah sengaja** — jangan tertukar:

| Store                          | DB                                    | Tables                                                                   | Migrasi                                              | Akses                       |
| ------------------------------ | ------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------- | --------------------------- |
| User data + content write path | Postgres backend (`DATABASE_URL`)     | users, progress, srs, tasks, games, settings, exam_*, `content_items`, … | `apps/backend/migrations/*.sql` (9 file, idempotent) | hanya backend Go            |
| Key pools + media settings     | Supabase project media (**opsional**) | `image_api_keys`, `tts_api_keys`, `media_settings`                       | `apps/media/migrations/0003…0005*.sql`               | apps/media via service-role |

```bash
# Native Postgres lokal — buat DB lalu apply migrasi
psql -U postgres -c "CREATE DATABASE navia;"
psql -U postgres -d navia -f apps/backend/migrations/*.sql

# Cloud managed — cukup arahkan DATABASE_URL lalu apply file yang sama
psql "$DATABASE_URL" -f apps/backend/migrations/*.sql
```

- **Tidak ada automigration** — jalankan manual sekali per database.
- `content_items` live di Postgres backend (write path contributor/review); file
  `apps/media/migrations/0001_content.sql` adalah legacy era Supabase.
- Vocabulary/kurikulum **tidak punya tabel** — read path-nya R2/CDN saja.

---

## Storage Setup

### Development: RustFS

Lihat langkah 3 di [Setup Development](#3-storage-lokal-rustfs). Inti: CORS on,
volume `/data` mounted, bucket `navia-data` public-read.

### Production: Cloudflare R2

Lihat langkah 3 di [Setup Production](#3-storage-cloudflare-r2).

### Alternatif: GCS / AWS S3

Ganti `MEDIA_STORAGE_PROVIDER=gcs|s3` + credentials (detail komentar `.env.example`).

---

## Troubleshooting

### Port bentrok

- Backend `:8080` (`SERVER_PORT`) · Web `:3000` · Media `:3002` · Storage `:9000`

### Database connection error

```bash
psql "$DATABASE_URL" -c "SELECT 1;"      # test koneksi
# Cek DATABASE_URL di apps/backend/.env; provider managed biasa butuh sslmode=require
```

### Storage upload gagal

```bash
curl http://localhost:9000                                        # storage hidup?
aws s3 ls s3://navia-data --endpoint-url http://localhost:9000     # bucket ada?
```

Browser 403/audio kosong → CORS bucket belum aktif atau bucket belum public-read.

### Konten tidak muncul di web

```bash
cd apps/media && pnpm publish-data
# Pastikan NEXT_PUBLIC_DATA_CDN_URL menunjuk base storage/CDN yang sama, restart web.
# Manifest: curl http://localhost:9000/navia-data/data-manifest.json
# Masih stale? caches.delete('navia-v1') lalu hard reload.
```

### Audio tidak bunyi

Cek `NEXT_PUBLIC_AUDIO_CDN_URL`, cek file di bucket, cek public access prod.

### Error backend API

```bash
curl http://localhost:8080/api/v1/health
open http://localhost:8080/scalar          # API reference
```

### Build error

```bash
rm -rf node_modules .next .turbo dist && pnpm install
pnpm lint                                  # root turbo
cd apps/web && npx tsc --noEmit
cd apps/backend && go vet ./cmd/... ./internal/... ./pkg/... && go build ./cmd/server
```

---

## Next Steps

- [README.md](./README.md) — overview & quick start
- [DEPLOYMENT.md](./DEPLOYMENT.md) — panduan deploy produksi lengkap
- [AGENTS.md](./AGENTS.md) — catatan arsitektur & konvensi (wajib baca agent AI)
- [CONTRIBUTING.md](./CONTRIBUTING.md) — guidelines kontribusi konten
- [apps/backend/README.md](./apps/backend/README.md) ·
  [apps/media/README.md](./apps/media/README.md) ·
  [apps/web/README.md](./apps/web/README.md) ·
  [apps/mobile/README.md](./apps/mobile/README.md)

Untuk issue/pertanyaan: buka issue di GitHub.
