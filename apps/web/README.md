# Navia Academy — Web

Aplikasi web learner-facing untuk Navia Academy. Next.js 16 App Router, React 19,
Tailwind CSS v4, TypeScript strict.

## Stack

| Layer       | Tech                                                         |
| ----------- | ------------------------------------------------------------ |
| Framework   | Next.js 16 (App Router) — dev `:3000`                        |
| UI          | React 19.2 + Tailwind CSS v4 + komponen `@/components/ui`    |
| State       | Zustand 5                                                    |
| Forms       | React Hook Form + Zod 4                                      |
| i18n        | custom context (`src/i18n/`) — `en.json` + `id.json`         |
| Data konten | cache-first fetch dari R2/CDN (`src/lib/data-client.ts`)     |
| Auth        | JWT `token_pair` via Go backend (`src/lib/auth-context.tsx`) |

## Menjalankan

```bash
# dari root monorepo
bun install
bun run --filter @navia/web dev        # http://localhost:3000

bun run --filter @navia/web build      # production build
bun run --filter @navia/web start      # jalankan hasil build
```

Verifikasi sebelum PR:

```bash
bun run lint                # root (turbo)
bun x tsc --noEmit         # di apps/web
```

> Tidak ada test runner di repo ini — CI hanya `bun run lint` + typecheck + validasi JSON.

## Environment

`.env.local` di `apps/web/` (**belum ada `.env.example`** — salin daftar di bawah):

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080        # Go/Fiber backend
NEXT_PUBLIC_DATA_CDN_URL=http://localhost:9000/navia-data  # R2/RustFS bucket konten
NEXT_PUBLIC_AUDIO_CDN_URL=http://localhost:9000/navia-data # base audio asset
NEXT_PUBLIC_IMAGE_BASE_URL=http://localhost:9000/navia-data # base gambar
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Struktur `src/`

```text
src/
├── app/                  # App Router routes
│   ├── (marketing)/      # landing `/`, features, about, contact, legal, contributors
│   ├── (auth)/           # login · recover · register (+ onboarding)
│   ├── (dashboard)/      # shell dashboard learner
│   │   └── dashboard/    # learn · program · vocabulary · grammar · characters ·
│   │                     # reading · listening · speaking · writing · conversations ·
│   │                     # exam · placement-test · review · progress · calendar ·
│   │                     # tasks · achievements · library · notifications · settings
│   │       └── (admin)/admin/   # area admin — gate `user.role === "admin"` di layout;
│   │                            # sub-halaman: users, contributors
│   │       └── (contributor)/   # area contributor
│   └── …                 # sitemap.ts, robots.ts, manifest, error/not-found
├── components/           # ui primitives + marketing + dashboard components
├── hooks/
├── i18n/                 # en.json · id.json · locale-context.tsx
├── lib/                  # data-client (CDN), audio, auth-context, exam-system, dll.
├── stores/               # Zustand stores
└── types/
```

## Aturan Penting

### Read path konten = R2/CDN only

Semua konten publik (vocabulary, grammar, curriculum, readings, characters,
conversations, placement, exam config) dibaca **hanya** dari R2/CDN via
`data-client.ts`: resolve `data-manifest.json` → bundle content-hashed immutable.
**Jangan pernah** menambah route yang menarik konten dari backend/Postgres/Supabase —
backend tidak melayani konten, dan DB tidak ada di read path.

### Auth & roles

- Login/register ke backend; token disimpan di localStorage key `navia-session`;
  setiap request mengirim `Authorization: Bearer <access_token>`.
- Role: `student` | `contributor` | `reviewer` | `admin`. Register publik selalu
  `student`; role staff dibuat oleh admin via `POST /api/v1/admin/users`.

### i18n

- Semua string user-facing wajib lewat `t()` dari `en.json` / `id.json`.
- Key kedua file harus **sinkron** (tambah/hapus berpasangan). Tidak ada teks
  hardcoded di komponen.
- Fokus locale: **Indonesia** (`id`) dan **English** (`en`, default).
- Learner UI Indonesian-first: field glossable/prose membawa varian `_id`
  (Indonesia) + `_en` (English).

## Gotchas Dev

- **Service worker `navia-v1` bisa menyajikan konten stale** saat dev (gejala:
  halaman kosong / placement bank kosong setelah perubahan konten). Fix:
  `caches.delete('navia-v1')` lalu hard reload. Production aman karena bundle
  content-hashed immutable.
- Setelah menambah/menghapus route, kadang perlu `rm -rf .next` (stale validator
  typegen) sebelum `bun run dev` lagi.
