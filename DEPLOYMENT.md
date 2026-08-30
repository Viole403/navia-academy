# Deployment Guide — Navia

Panduan **deploy produksi** end-to-end: R2/CDN → backend (VPS) → web (Vercel) → publish konten.
Untuk setup dev/production lengkap lihat [SETUP.md](./SETUP.md); dokumen ini fokus ke
**urutan langkah + checklist** dari infra yang sudah siap sampai situs live.

## Arsitektur Produksi

```
                     USER
                      │  fetch
        ┌─────────────┼───────────────────────┐
        ▼             ▼                       ▼
   Web (Vercel)   API (VPS :443)          CDN (Cloudflare R2)
   Next.js SSR    Go/Fiber via            cdn.naviaacademy.com
                  Caddy/Nginx TLS         content bundles + audio
                      │                       ▲
                      ▼                       │ publish-data / GH Action
                 Postgres managed ── Redis managed
                 (user data, write)   (session/cache)
```

- **Konten publik** dibaca web **hanya** dari R2/CDN — backend tidak pernah serve konten,
  DB tidak pernah di read path publik (detail arsitektur: [README.md](./README.md)).
- **Postgres & Redis = layanan managed eksternal** (Neon/Supabase Postgres + Upstash, dll),
  bukan service di compose. API container memakai cap resource hasil
  `scripts/compute-resource-limits.sh` (lihat [apps/backend/README.md](./apps/backend/README.md)).
- Batch media & API **tidak boleh jalan bersamaan** di VPS (resource budget dibagi penuh,
  guard `MEDIA_BATCH_GUARD`). Jalankan generate hanya lewat GH Action, bukan di VPS.

---

## 0. Prasyarat

Sudah siap / milikmu:

- [ ] VPS (akses SSH) — untuk API saja
- [ ] Postgres managed + `DATABASE_URL` (pakai `?sslmode=require`)
- [ ] Redis managed + `REDIS_URL`
- [ ] Cloudflare R2 bucket `navia-data` + R2 API token (Access Key/Secret/Endpoint)
- [ ] Domain: satu untuk web, satu untuk API (opsional subdomain), `cdn.naviaacademy.com` untuk CDN
- [ ] Akun Vercel + GitHub repo

> CDN **belum public**? Lihat step 1 — ini langkah pertama yang wajib.

---

## 1. Storage: R2 public + custom domain

Public read wajib, kalau tidak browser dapat 403/audio kosong.

```bash
# Buat bucket (sekali) — akses dari mesin mana pun
wrangler r2 bucket create navia-data
```

Lalu di **dashboard Cloudflare** (R2 → bucket `navia-data` → Settings):

1. **Custom Domains** → add `cdn.naviaacademy.com` (Cloudflare membuat CNAME DNS otomatis).
2. **Public Access** → aktifkan (dengan custom domain, `r2.dev` tidak dipakai).
3. Pastikan bucket public-read (akses via domain tidak butuh auth).

Verifikasi:

```bash
curl -I https://cdn.naviaacademy.com/data-manifest.json   # 200 setelah publish konten
```

> `apps/web/next.config.ts` sudah mencantumkan `https://cdn.naviaacademy.com` di
> `images.remotePatterns` — gunakan domain ini persis, jangan `r2.dev` atau `pub-...r2.dev`.

---

## 2. Backend: deploy ke VPS

Tidak ada workflow deploy otomatis — manual per rilis.

### 2.1 Build binary

```bash
cd apps/backend
make build                          # → bin/server (atau ./server)
```

### 2.2 Env produksi (`apps/backend/.env`)

```bash
cp .env.example .env
```

**Wajib cek ulang** — nilai default/dev sering tertinggal:

| Key                                         | Prod harus                                      | Trap umum                                   |
| ------------------------------------------- | ----------------------------------------------- | ------------------------------------------- |
| `DATABASE_URL`                              | cloud managed + `?sslmode=require`              | `localhost` masih terisi                    |
| `REDIS_URL`                                 | cloud managed (TLS bila perlu)                  | `localhost:6379`                            |
| `SITE_URL`                                  | `https://<domain-web>`                          | `localhost:3000` → OAuth rusak              |
| `CORS_ORIGINS`                              | `https://<domain-web>`                          | dev origin masih ada                        |
| `STORAGE_PROVIDER`                          | `r2`                                            | `s3` (RustFS dev)                           |
| `STORAGE_ENDPOINT`                          | `https://<account-id>.r2.cloudflarestorage.com` | `http://localhost:9000`                     |
| `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` | R2 API token (dengan izin Object Read+Write)    | kredensial RustFS                           |
| `STORAGE_BUCKET`                            | `navia-data`                                    |                                             |
| `STORAGE_REGION`                            | `auto`                                          | `us-east-1` (RustFS dev)                    |
| `STORAGE_PUBLIC_URL`                        | `https://cdn.naviaacademy.com`                  | tidak ada di `.env.example` — tambah manual |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`  | string acak ≥32 char, beda keduanya             | nilai test                                  |
| `SERVER_PORT`                               | `8080`                                          |                                             |

Google OAuth: daftarkan `SITE_URL` di Google Cloud Console (Authorized redirect =
`SITE_URL/auth/callback`).

### 2.3 Migrasi database (sekali per DB, manual)

```bash
psql "$DATABASE_URL" -f apps/backend/migrations/*.sql   # 9 file, idempotent
psql "$DATABASE_URL" -c "SELECT 1;"                     # cek koneksi
```

> **Tidak ada automigration** — jalankan manual sebelum server start pertama.

### 2.4 Resource caps + jalankan

```bash
bash scripts/compute-resource-limits.sh                 # tulis cap CPU/RAM ke .env
make docker-up                                          # Opsi B: container (compose api-only)
# atau: ./bin/server                                    # Opsi A: binary native
```

### 2.5 Reverse proxy + TLS

Compose hanya expose `:8080`. Tambah proxy di depan (contoh Caddy):

```caddyfile
api.naviaacademy.com {
    reverse_proxy localhost:8080
}
```

```bash
# Reload: caddy reload --config /etc/caddy/Caddyfile
```

Untuk selalu jalan: jalankan container API sebagai service (compose `restart: unless-stopped`)
dan Caddy sebagai systemd service. Verifikasi:

```bash
curl https://api.naviaacademy.com/api/v1/health
```

---

## 3. Web: deploy ke Vercel

```bash
cd apps/web
npx vercel --prod          # atau connect GitHub di dashboard
```

Environment variables (Production) di Vercel — semua `NEXT_PUBLIC_*` ter-bundle di client:

```
NEXT_PUBLIC_API_BASE_URL    = https://api.naviaacademy.com
NEXT_PUBLIC_DATA_CDN_URL    = https://cdn.naviaacademy.com
NEXT_PUBLIC_AUDIO_CDN_URL   = https://cdn.naviaacademy.com
NEXT_PUBLIC_IMAGE_BASE_URL  = https://cdn.naviaacademy.com
NEXT_PUBLIC_SITE_URL        = https://<domain-web>
```

Setelah deploy: pasang **custom domain** di dashboard Vercel. Verifikasi homepage SSR
menampilkan bundle landing (konten dari CDN, bukan API).

---

## 4. GitHub secrets: `media-generate.yml`

Supaya generate audio/images + publish R2 bisa jalan dari GitHub Actions (jangan dari VPS):

- `MEDIA_STORAGE_PROVIDER` (r2) · `MEDIA_STORAGE_BUCKET` (navia-data)
- `MEDIA_STORAGE_REGION` (auto) · `MEDIA_STORAGE_ENDPOINT` (R2 S3 endpoint)
- `MEDIA_STORAGE_ACCESS_KEY` · `MEDIA_STORAGE_SECRET_KEY` · `MEDIA_STORAGE_PUBLIC_URL` (https://cdn.naviaacademy.com)
- TTS: `MEDIA_TTS_ENGINE` (+ `GOOGLE_TTS_API_KEY` atau `AZURE_SPEECH_KEY`/`AZURE_SPEECH_REGION`)
- Gambar: `MEDIA_IMAGE_PROVIDER` + `MEDIA_IMAGE_API_KEY` (atau `MEDIA_IMAGE_CF_ACCOUNT_ID`/`MEDIA_IMAGE_CF_API_TOKEN`)
- Opsional key pools: `CONTENT_SUPABASE_URL` · `CONTENT_SUPABASE_SERVICE_ROLE_KEY`

Helper: `apps/media/scripts/setup-gh-secrets.sh`.

---

## 5. Publish konten

**Urutan penting**: storage public (step 1) → publish konten → baru web siap penuh.

```bash
# Dari mesin lokal (data/json terbaru sudah di repo):
pnpm data:publish
```

Atau trigger GH Action **media-generate** (manual): generate audio/images → publish.
Cache header di-set otomatis saat publish (bundle/audio/gambar immutable,
`data-manifest.json` 1 hari, `content-levels.json` 30 hari). **Tidak ada CDN purge.**

Verifikasi:

```bash
curl -s https://cdn.naviaacademy.com/data-manifest.json | head
```

---

## 6. Checklist go-live

- [ ] `https://cdn.naviaacademy.com/data-manifest.json` → 200 (konten sudah ter-publish)
- [ ] `https://api.naviaacademy.com/api/v1/health` → 200
- [ ] Web: homepage SSR memuat konten dari CDN (bukan skeleton/empty)
- [ ] Audio & gambar di halaman materi bunyi/tampil (CORS + public access OK)
- [ ] Login Google (OAuth) jalan di domain prod
- [ ] Web prod `CORS_ORIGINS` — API menerima request dari domain web
- [ ] Migrasi DB sudah di-apply (tabel users/progress/dll ada)
- [ ] `pnpm lint` + typecheck (web/media) hijau sebelum rilis

## Rollback

- **Konten**: republish `data:publish` versi sebelumnya (immutable, tanpa purge).
- **Web**: redeploy commit sebelumnya di Vercel.
- **Backend**: redeploy binary/compose sebelumnya di VPS.

## Referensi

- [SETUP.md](./SETUP.md) — setup lengkap dev & production
- [apps/backend/README.md](./apps/backend/README.md) — env, resource budget VPS, guard batch
- [apps/media/README.md](./apps/media/README.md) — pipeline konten & asset
- [README.md](./README.md) — arsitektur konten & read-path CDN
