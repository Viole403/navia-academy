# Navia Academy Backend (Go / Fiber)

REST API self-hosted untuk platform Navia Academy. Dibangun dengan **Go + Fiber**,
backed **PostgreSQL** dan **Redis** (keduanya via `DATABASE_URL` / `REDIS_URL` —
dev lokal atau cloud managed). Menyajikan **user data saja** (auth, progress, SRS,
sessions, tasks, games, achievements) plus **content write path** (`content_items`).
User publik membaca konten dari R2/CDN via pipeline media; backend ini tidak pernah
menyajikan content bundle.

## Arsitektur

```
cmd/server/main.go                     - entrypoint + semua routes
internal/config/                       - config berbasis env
internal/handler/                      - HTTP handlers (auth, progress, content, tts, ...)
internal/service/                      - business logic
internal/repository/                   - akses data Postgres/Redis
internal/middleware/                   - JWT auth, optional-auth, role/admin guard, CORS, rate limit
internal/models/                       - shared structs
pkg/response/                          - envelope {success, data, error}
pkg/storage/                           - storage S3-compatible (upload TTS ke R2)
scripts/compute-resource-limits.sh     - deteksi spesifikasi host → cap .env utk compose api-only
migrations/                            - SQL schema (dijalankan manual ke Postgres)
docker-compose.yml                     - api-only (deploy VPS; TANPA pg/redis)
```

> Konten (vocabulary, grammar, curriculum, audio, gambar) disajikan via **R2/CDN**
> dari `apps/media/`, bukan dari backend ini. `content_items` di Postgres hanyalah
> write path contributor/reviewer (status `draft`/`review`/`published`). User publik
> mengambil konten dari CDN.

## Quick Start

Ada dua file compose dengan peran berbeda:

- **`docker-compose.yml` di repo root** — full dev stack lokal (postgres + redis + api
  sekaligus). Paling cepat untuk nyoba:
  `docker compose up -d` lalu apply migrasi (lihat bawah).
- **`docker-compose.yml` di folder ini** — api-only untuk deploy VPS production
  (pg/redis = layanan cloud managed eksternal; resource caps via
  `scripts/compute-resource-limits.sh`). Jangan dipakai untuk dev lokal.

Dev native (hot-reload) — arahkan `DATABASE_URL` / `REDIS_URL` ke instance lokal
(atau cloud dev DB), apply schema, lalu jalankan server:

```bash
cp .env.example .env                  # isi secrets + DATABASE_URL / REDIS_URL
psql "$DATABASE_URL" -f migrations/*.sql   # schema (TIDAK ada automigration — lihat bawah)
make dev                              # Air hot-reload di :8080
```

Build & run:

```bash
make build                            # go build -o bin/server ./cmd/server
./bin/server                          # atau: make docker-up (container, compose folder ini)
```

Swagger regenerasi setelah ubah anotasi: `make swagger` → `/scalar`, `/docs/*`.

Typecheck (yang dipakai CI): `go vet ./cmd/... ./internal/... ./pkg/...`
(root: `pnpm backend:typecheck`) + `go build ./cmd/server`.

## VPS Resource Budget (wajib sekali per host)

Postgres dan Redis adalah **layanan cloud managed eksternal** di production, dijangkau
via `DATABASE_URL` / `REDIS_URL`. Budget VPS ini jadi hanya menutup dua consumer Navia:
server `api` dan batch generation `apps/media`. Keduanya **tidak pernah berjalan
bersamaan** (batch media selesai dulu; api baru hidup), jadi masing-masing diukur ke
**budget penuh**, bukan pembagian:

- CPU = 90% dari vCPU terdeteksi (provider auto-suspend >95% sustained; kita jaga <90%)
- RAM = 62% dari MemTotal terdeteksi

Sanity baseline 1 vCPU / 2 GB: **api 0.90 CPU / 1269 MB standalone · media 0.90 CPU /
1269 MB standalone** (yang sedang berjalan dapat seluruh envelope).

`scripts/compute-resource-limits.sh` mendeteksi spesifikasi host dan menulis cap ke
`.env`, dikonsumsi oleh `docker-compose.yml` (inline default = baseline sampai script
dijalankan):

```bash
make resource-limits        # deteksi host spec -> key limit API_*/MEDIA_* di .env
docker compose up -d        # api berjalan dengan cap hasil kalkulasi
```

Jalankan batch media hanya saat api mati — guard di `apps/media` akan memperingatkan
keras bila health endpoint api menjawab (set `MEDIA_BATCH_GUARD=strict` untuk abort,
`off` untuk skip). Preview tanpa menulis apa pun: `make resource-limits-dry`, atau
simulasi spesifikasi lain:
`HOST_CPUS=4 HOST_MEM_MB=8192 bash scripts/compute-resource-limits.sh --dry-run`.

### Migrasi manual (wajib)

Tidak ada automigration. Apply schema sekali per database setelah provisioning:

```bash
psql "$DATABASE_URL" -f migrations/*.sql   # urut nomor file, atau migration tool pilihanmu
```

Semua migrasi idempotent (`CREATE TABLE/INDEX IF NOT EXISTS`). Daftar file domain-split:

| File                    | Domain                                   |
| ----------------------- | ---------------------------------------- |
| `0001_users_auth.sql`   | users + auth accounts                    |
| `0002_progress_srs.sql` | user progress, SRS cards, study sessions |
| `0003_content.sql`      | `content_items` (write path)             |
| `0004_exam.sql`         | exam sessions/results/progress           |
| `0005_contributor.sql`  | contributors + applications              |
| `0006_supporter.sql`    | supporters                               |
| `0007_resonance.sql`    | resonance                                |
| `0008_settings.sql`     | user settings                            |
| `0009_audio_tts.sql`    | audio cache TTS                          |

## Environment Variables

Sumber lengkap: `.env.example`.

| Variable                                                             | Deskripsi                                                                                                                            | Default                               |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| `SERVER_PORT` | Port HTTP listen | `8080` |
| `API_PUBLISH_PORT` | Port publik di host saat jalan via compose (kiri mapping) | `8080` |
| `DATABASE_URL`                                                       | Connection string Postgres (managed perlu `?sslmode=require`)                                                                        | —                                     |
| `REDIS_URL`                                                          | Connection string Redis (Upstash pakai skema `rediss://`)                                                                            | `redis://localhost:6379`              |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`                           | Secret HS256 (min 32 char)                                                                                                           | —                                     |
| `JWT_ACCESS_DURATION` / `JWT_REFRESH_DURATION`                       | TTL token                                                                                                                            | `15m` / `168h`                        |
| `SITE_URL`                                                           | Origin publik (OAuth redirect)                                                                                                       | `http://localhost:3000`               |
| `CORS_ORIGINS`                                                       | Origin yang diizinkan                                                                                                                | `http://localhost:3000`               |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` / `AUTH_GOOGLE_REDIRECT_URL` | Google OAuth (redirect default `SITE_URL/auth/callback`)                                                                             | —                                     |
| `KOFI_VERIFICATION_TOKEN`                                            | Verifikasi webhook Ko-fi (supporter wall)                                                                                            | —                                     |
| `TRAKTEER_WEBHOOK_SECRET`                                            | Verifikasi webhook Trakteer                                                                                                          | —                                     |
| `CONTENT_EXPORT_TOKEN`                                               | Bearer token app-to-app untuk `GET /content/export` (dipakai `pnpm sync-content` milik apps/media). Kosong = endpoint disabled (503) | —                                     |
| `STORAGE_PROVIDER`                                                   | `s3` / `local`                                                                                                                       | `s3`                                  |
| `STORAGE_BUCKET`                                                     | Bucket storage                                                                                                                       | `navia-data`                          |
| `STORAGE_ENDPOINT`                                                   | Endpoint S3-compatible (kosongkan untuk AWS)                                                                                         | —                                     |
| `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY`                          | Kredensial storage                                                                                                                   | —                                     |
| `TTS_ENGINE`                                                         | `edge` / `google` / `azure`                                                                                                          | `edge`                                |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM`  | Email reset password (opsional)                                                                                                      | —                                     |
| `API_CPU_LIMIT` / `API_MEM_LIMIT` / `API_MEM_LIMIT_BYTES`            | Cap resource api — ditulis otomatis oleh `compute-resource-limits.sh`, jangan edit manual                                            | —                                     |
| `MEDIA_CPU_LIMIT` / `MEDIA_MEM_LIMIT`                                | Cap resource batch media (idem)                                                                                                      | —                                     |
| `MEDIA_BATCH_GUARD`                                                  | Guard overlap api vs batch media: unset/`warn` (default) \| `strict` \| `off`                                                        | warn                                  |
| `MEDIA_API_HEALTH_URL`                                               | Health endpoint yang diprobe guard                                                                                                   | `http://localhost:8080/api/v1/health` |
| `CONTENT_LEVELS_URL`                                                 | URL whitelist content-levels di CDN (kosong = derivasi dari `STORAGE_PUBLIC_URL`)                                                    | —                                     |

Rate limiting Redis bersifat fail-open tapi log error keras (throttled sekali/30 detik);
scope unik per call site (`global`, `tts`, `cat:result`, `cat:session:create`,
`cat:session:patch`) dengan key `ratelimit:<scope>:<identifier>`.

## Key Endpoints

Semua response memakai envelope `{ success, data?, error?: { code, message } }`.
Auth memakai custom JWT `token_pair` (`access_token` / `refresh_token`); request
mengirim `Authorization: Bearer <access_token>`.

Legend auth: **—** publik · ✅ login · 🛡️ admin (`AdminMiddleware`) · 🔑 service token.

| Method          | Path                                                 | Auth                    | Catatan                                                                                 |
| --------------- | ---------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| GET             | `/api/v1/health`                                     | —                       | Health check                                                                            |
| POST            | `/api/v1/auth/register`                              | —                       | Daftar (selalu role `student`)                                                          |
| POST            | `/api/v1/auth/login`                                 | —                       | Masuk                                                                                   |
| POST            | `/api/v1/auth/refresh`                               | —                       | Refresh token pair                                                                      |
| GET             | `/api/v1/auth/google`                                | —                       | URL authorize Google OAuth                                                              |
| POST            | `/api/v1/auth/reset-password`                        | —                       | Minta reset password                                                                    |
| POST            | `/api/v1/auth/logout`                                | ✅                      | Logout                                                                                  |
| POST            | `/api/v1/auth/change-password`                       | ✅                      | Ganti password                                                                          |
| GET             | `/api/v1/me`                                         | ✅                      | User saat ini                                                                           |
| GET/PUT         | `/api/v1/progress`                                   | ✅                      | Progress user                                                                           |
| POST            | `/api/v1/progress/study-session`                     | ✅                      | Simpan study session                                                                    |
| GET             | `/api/v1/progress/study-sessions`                    | ✅                      | Riwayat study session                                                                   |
| GET             | `/api/v1/progress/due-cards`                         | ✅                      | Kartu SRS jatuh tempo                                                                   |
| POST            | `/api/v1/progress/review`                            | ✅                      | Review SRS                                                                              |
| GET             | `/api/v1/progress/achievements`                      | ✅                      | Achievements                                                                            |
| POST            | `/api/v1/srs/cards`                                  | ✅                      | Ensure kartu SRS                                                                        |
| GET             | `/api/v1/srs/stats`                                  | ✅                      | Statistik SRS                                                                           |
| GET/POST        | `/api/v1/tasks`                                      | ✅                      | Tasks                                                                                   |
| PUT/DELETE      | `/api/v1/tasks/:id`                                  | ✅                      | Tasks                                                                                   |
| POST            | `/api/v1/games`                                      | ✅                      | Hasil game                                                                              |
| GET/PUT         | `/api/v1/settings`                                   | ✅                      | Settings user                                                                           |
| GET/POST/PUT    | `/api/v1/exam/sessions`                              | ✅                      | Exam sessions                                                                           |
| POST            | `/api/v1/cat/result`                                 | ✅                      | Submit hasil CAT — rate limited 5/menit                                                 |
| POST            | `/api/v1/cat/session`                                | ✅                      | Buat sesi CAT — rate limited 5/menit                                                    |
| PATCH           | `/api/v1/cat/session/:id`                            | ✅                      | Update jawaban CAT — rate limited 60/menit                                              |
| GET             | `/api/v1/cat/session/:id` · `/cat/progress`          | ✅                      | Ambil sesi/progress CAT                                                                 |
| POST            | `/api/v1/tts`                                        | ✳️ optional-auth        | TTS on-demand — rate limited 10/menit                                                   |
| GET             | `/api/v1/tts/cache/stats` · `/tts/metrics`           | ✅                      | Statistik cache/metrics TTS                                                             |
| GET             | `/api/v1/contributors` · `/:id`                      | —                       | Kontributor aktif                                                                       |
| POST            | `/api/v1/contributors/apply`                         | —                       | Lamaran kontributor                                                                     |
| PUT/DELETE      | `/api/v1/contributors/:id`                           | 🛡️                      | Kelola kontributor                                                                      |
| GET             | `/api/v1/contributors/applications`                  | 🛡️                      | Daftar lamaran                                                                          |
| PUT             | `/api/v1/contributors/applications/:id/review`       | 🛡️                      | Approve/reject lamaran                                                                  |
| GET             | `/api/v1/sponsors` · `/:id`                          | —                       | Sponsor                                                                                 |
| POST            | `/api/v1/sponsors/apply`                             | —                       | Lamaran sponsor                                                                         |
| POST/PUT/DELETE | `/api/v1/sponsors` · `/:id`                          | 🛡️                      | Kelola sponsor                                                                          |
| GET             | `/api/v1/sponsors/applications`                      | 🛡️                      | Daftar lamaran sponsor                                                                  |
| GET             | `/api/v1/supporters`                                 | —                       | Supporter wall                                                                          |
| POST            | `/api/v1/webhooks/kofi` · `/webhooks/trakteer`       | —                       | Webhook donasi                                                                          |
| GET             | `/api/v1/admin/support/config` · `/admin/supporters` | 🛡️                      | Config & daftar supporter                                                               |
| POST            | `/api/v1/admin/users`                                | 🛡️                      | Buat user (role opsional; default `student`; valid: student/contributor/reviewer/admin) |
| GET             | `/api/v1/admin/users`                                | 🛡️                      | List semua user                                                                         |
| PUT             | `/api/v1/admin/users/:id/role`                       | 🛡️                      | Ubah role user                                                                          |
| GET             | `/api/v1/content/export`                             | 🔑 `ContentExportToken` | Export konten → bridge `sync-content` (apps/media); disabled (503) bila token kosong    |
| GET/POST        | `/api/v1/content`                                    | ✅ role contributor+    | List/buat content item                                                                  |
| GET/PUT         | `/api/v1/content/:lang/:domain/:id`                  | ✅ role contributor+    | Get/update (+ optimistic lock)                                                          |
| POST            | `/api/v1/content/:lang/:domain/:id/review`           | ✅ role reviewer+       | Publish/reject                                                                          |
| GET             | `/scalar` · `/docs/*`                                | —                       | Scalar API reference / Swagger UI                                                       |

## Integrasi Frontend

Arahkan Next.js frontend ke backend:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

Auth memakai custom JWT `token_pair` yang disimpan di localStorage key `navia-session`;
setiap request mengirim `Authorization: Bearer <access_token>`. Role yang dikenal web:
`student` / `contributor` / `reviewer` / `admin`.

## Riwayat Backend

Backend **Hono + Cloudflare Workers sudah dihapus** (kembali ke model self-hosted
Go/Fiber). Schema sekarang live di 9 file migrasi domain-split di `migrations/`
(lihat tabel di atas) — bukan lagi `0001_schema.sql` tunggal.
