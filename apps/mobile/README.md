# Navia Academy — Mobile

Aplikasi React Native cross-platform (Expo, TypeScript) untuk belajar bahasa — Mandarin,
Jerman, Jepang, Inggris (exam: HSK, TOCFL, Goethe, JLPT, TOEFL). Berbicara langsung ke
Go backend (`../backend`). Arah visual **Editorial Print**: hairline rules gaya majalah,
tipografi serif, motif single-artifact, tanpa card-shadow.

Bukan Flutter, bukan native Java/Kotlin — satu codebase untuk **Android** dan **iOS**
via Expo dan (opsional) EAS.

## Stack

| Layer         | Tech                                                                       |
| ------------- | -------------------------------------------------------------------------- |
| Framework     | **Expo ~57 + React Native 0.86** (managed workflow)                        |
| Router        | **expo-router** (file-based, typed routes)                                 |
| Language      | TypeScript (strict)                                                        |
| Styling       | **NativeWind 4** (Tailwind **v3**) + token system `useTheme()` hand-rolled |
| State         | **Zustand 5** (auth, onboarding, theme), persist via AsyncStorage          |
| Server data   | **TanStack Query 5**                                                       |
| HTTP          | Axios dengan JWT refresh interceptor                                       |
| TTS           | `expo-av` streaming backend TTS `/tts`                                     |
| Secure tokens | `expo-secure-store`                                                        |
| Dynamic color | `@pchmn/expo-material3-theme` (Material You, Android 12+)                  |

> Catatan monorepo: mobile memakai Tailwind **v3**, sementara web/media memakai v4 —
> jangan diseragamkan.

## Quickstart

```bash
# 1. Install deps dari root repo
bun install

# 2. Konfigurasi env (sekali)
cp .env.example .env
# Edit .env agar menunjuk backend-mu (lihat "Environment")

# 3. Start Metro bundler (dari apps/mobile)
bun run start

# 4. Jalankan di device / emulator
bun run android       # emulator Android atau device terhubung
bun run ios           # iOS simulator (macOS only)
```

> Go backend harus berjalan (`apps/backend`: `make dev`).

## Environment

Mobile membaca config dari **`.env`** (loader bawaan Expo `EXPO_PUBLIC_*`). Semua nilai
ditaruh di `.env` demi konsistensi. `.env` git-ignored; salin dari `.env.example`.

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:8080/api/v1        # Go Fiber backend
EXPO_PUBLIC_DATA_CDN_URL=http://localhost:9000/navia-data    # manifest + bundle konten
EXPO_PUBLIC_AUDIO_CDN_URL=http://localhost:9000/navia-data   # audio asset
EXPO_PUBLIC_MEDIA_BASE_URL=http://localhost:9000/navia-data  # fallback media relatif
EXPO_PUBLIC_API_DEBUG=0                                  # log tiap request/response
```

### Matriks per-target

| Target             | `EXPO_PUBLIC_API_URL`          | Catatan                      |
| ------------------ | ------------------------------ | ---------------------------- |
| iOS simulator      | `http://localhost:8080/api/v1` | Localhost aman               |
| Android emulator   | `http://10.0.2.2:8080/api/v1`  | Host loopback milik emulator |
| Device fisik (LAN) | `http://<IP-LAN>:8080/api/v1`  | Backend harus bind `0.0.0.0` |
| Staging/Production | `https://…`                    | HTTPS wajib untuk iOS ATS    |

Di **EAS Build**, set via [EAS environment variables](https://docs.expo.dev/build-reference/variables/).

## Media: Audio & Gambar dari S3

Backend yang memiliki storage media. **Mobile hanya mengonsumsi URL.**

### Flow

```text
mobile  ──POST /tts──▶  backend cek cache R2/S3
                            │
                            ├─ cache hit  → return { url }
                            └─ cache miss → generate via TTS engine, upload bucket,
                                            cache di DB, return { url }
mobile  ─play──▶  expo-av streaming URL
```

- Konten kurikulum (vocab dll.) dibaca dari CDN: `loadVocabulary()` di
  `src/lib/content-data.ts` resolve `data-manifest.json` dari
  `EXPO_PUBLIC_DATA_CDN_URL`.
- Hook audio: `src/hooks/useTts.ts`; gambar via komponen `MediaImage`
  (resolve path relatif terhadap `EXPO_PUBLIC_MEDIA_BASE_URL`).
- Batch generation ada di **Media Studio** (`apps/media`), bukan di backend Go.

## Struktur Proyek

```text
apps/mobile/
├── app/                    # expo-router screens (file-based routing)
│   ├── _layout.tsx         # Root — QueryClient + ThemeProvider + auth bootstrap
│   ├── index.tsx           # Entry redirect: onboarding → auth → tabs
│   ├── (onboarding)/       # setup awal: script, theme, daily goal
│   ├── (auth)/             # Welcome / Login / Register
│   ├── (tabs)/             # shell utama 5 tab
│   │   ├── index.tsx       # Today (dashboard)
│   │   ├── learn.tsx       # Browser vocab + entry review SRS
│   │   ├── exam.tsx        # Exam start / resume / history
│   │   ├── stats.tsx       # Overview / badges
│   │   └── profile.tsx     # Profile, tasks, settings
│   ├── review.tsx          # Sesi flashcard SRS (modal route)
│   ├── exam-session.tsx    # Exam berjalan (loop soal + submit)
│   ├── exam-result.tsx     # Ringkasan hasil
│   ├── game-match.tsx      # Hanzi Match
│   ├── apply.tsx           # Contributor/sponsor application
│   └── vocab/[id].tsx      # Detail vocab
├── src/
│   ├── api/                # Axios client + typed endpoint wrappers
│   ├── components/         # Primitives Editorial (Button, Card, Chip, …)
│   ├── data/               # seed/data lokal
│   ├── hooks/              # useTts, dll.
│   ├── lib/                # content-data.ts (CDN), audio/
│   ├── store/              # Zustand: auth, onboarding, theme, app
│   ├── theme/              # Definisi tema (6 base + Material You) + typography
│   ├── types/              # Shared API types
│   └── utils/              # secure.ts (persistensi token), dll.
├── app.json                # Config Expo + EAS projectId
├── eas.json                # Build profiles
├── package.json
└── tailwind.config.js
```

## Feature Map

Mobile mengonsumsi endpoint backend sisi learner; endpoint admin-only
(`POST/PUT/DELETE /admin/users*`, review applications, kelola sponsor/contributor)
**sengaja tidak** diimplementasikan — mobile adalah app pembelajar, bukan konsol admin.

| Grup endpoint                                                  | Method(s)            | Surface app                                                |
| -------------------------------------------------------------- | -------------------- | ---------------------------------------------------------- |
| `/auth/register`, `/auth/login`, `/auth/refresh`               | POST                 | `(auth)` + auto-refresh interceptor                        |
| `GET /me`                                                      | GET                  | Auth bootstrap saat launch                                 |
| `GET/PUT /progress`                                            | GET, PUT             | Sinkronisasi onboarding + Home + Profile                   |
| `GET /progress/due-cards`, `POST /progress/review`             | GET, POST            | `app/review.tsx` (sesi SM-2)                               |
| `GET /progress/achievements`                                   | GET                  | Stats → Badges                                             |
| `POST /progress/study-session`, `GET /progress/study-sessions` | GET, POST            | Stats → Overview                                           |
| `GET/POST/PUT/DELETE /tasks*`                                  | full CRUD            | Profile → Tasks                                            |
| `POST /games`                                                  | POST                 | `app/game-match.tsx` (submit skor Hanzi Match)             |
| Vocabulary                                                     | —                    | **via CDN** (`loadVocabulary()` dari `data-manifest.json`) |
| `GET/POST/PUT /exam/sessions*`                                 | full lifecycle       | Tab exam + `exam-session` + `exam-result`                  |
| `GET/PUT /settings`                                            | GET, PUT             | Profile → Settings                                         |
| `POST /tts`                                                    | POST (optional-auth) | hook `useTts()`                                            |
| `GET /contributors*`, `GET /sponsors*`                         | GET                  | Profile → About                                            |
| `POST /contributors/apply`, `POST /sponsors/apply`             | POST                 | `app/apply.tsx`                                            |
| `GET /health`                                                  | GET                  | Profile → About (status dot)                               |
| `POST /srs/cards`, `GET /srs/stats`                            | POST, GET            | `progress.ensureCard`, `progress.srsStats`                 |

## Theming

Enam base theme di `src/theme/colors.ts`:

| Theme             | Karakter                                             |
| ----------------- | ---------------------------------------------------- |
| **Ink** (default) | Navy + cinnabar — brand Navia                        |
| **Night Scholar** | Cool periwinkle, fokus malam                         |
| **Sunset Mogao**  | Oranye desert hangat                                 |
| **Jade Garden**   | Hijau cool, keramik klasik                           |
| **Sakura Court**  | Pink lembut aksen plum                               |
| **Material You**  | Palet dinamis dari device (Android 12+) × light/dark |

Semua theme dirender dalam mode **Light / Dark / AMOLED**. AMOLED memaksa `bg: #000000`
agar pixel OLED benar-benar mati — opt-in lewat **Onboarding → Theme step** dan
**Profile → Settings → Appearance**. Preferensi user persist di AsyncStorage via
Zustand store `useThemePrefs()`.

## Editorial print system

Aturan visual di seluruh primitives (`src/components/*`):

- **Sharp geometry** — button/card/chip pakai `borderRadius: 2` atau `4`. Tanpa lingkaran kecuali dot.
- **Hairline rules** — border 1px (`theme.border`) atas/bawah konten; tanpa shadow.
- **Typography** — serif untuk heading/Hanzi/pull-quote italic, sans-serif untuk label & metadata (`src/theme/typography.ts`).
- **Single-artifact motif** — seal Hanzi kecil berbingkai di kanan-atas area fitur (`Motif.tsx`).
- **Color discipline** — satu accent + satu secondary per screen.

## Scripts

| Command                               | Purpose                                                                 |
| ------------------------------------- | ----------------------------------------------------------------------- |
| `bun run start`                       | Metro dev server (Expo Go / dev client)                                 |
| `bun run android` / `bun run ios`     | Launch Android / iOS                                                    |
| `bun run typecheck`                   | `tsc --noEmit` (strict)                                                 |
| `bun run sync:mobile`                 | Sync artefak/konten bersama dari workspace (tsx scripts/sync-mobile.ts) |
| `bun run eas:init`                    | Link sekali ke EAS project                                              |
| `bun run build:dev:{android,ios}`     | Cloud dev-client build                                                  |
| `bun run build:preview:{android,ios}` | Internal distribution APK/IPA                                           |
| `bun run build:prod:{android,ios}`    | AAB / IPA siap store                                                    |
| `bun run submit:{android,ios}`        | Submit build terakhir ke Play Console / App Store Connect               |
| `bun run update:{preview,production}` | OTA update via EAS Update                                               |

---

## Cloud Builds dengan EAS

Project tertaut ke **EAS project ID `1896057c-6dfb-4a5a-85e9-299f62523ac0`**
(sudah wired di `app.json` → `expo.extra.eas.projectId` dan `expo.updates.url`).

### Setup lokal sekali

```bash
cd apps/mobile
bunx eas-cli@latest login            # akun Expo pemilik project
bunx eas-cli@latest init --id 1896057c-6dfb-4a5a-85e9-299f62523ac0  # opsional, idempotent
eas whoami && eas project:info      # verifikasi
```

### Build profiles (`eas.json`)

| Profile         | Output                                                   | Use case                               |
| --------------- | -------------------------------------------------------- | -------------------------------------- |
| **development** | dev-client APK / iOS-simulator                           | Test native module (mis. Material You) |
| **preview**     | Internal APK / ad-hoc IPA                                | Share link download ke tester          |
| **production**  | AAB (Play) / IPA (App Store), versionCode auto-increment | Rilis store                            |

Setiap profile membakar env vars ke bundle (lihat `eas.json`). URL staging/production
di sana masih placeholder — update saat backend publik:

```jsonc
// eas.json
"production": {
  "env": {
    "EXPO_PUBLIC_API_URL": "https://api.navia.vektracode.web.id/api/v1",
    "EXPO_PUBLIC_MEDIA_BASE_URL": "https://pub.navia.vektracode.web.id/navia-data"
  }
}
```

```bash
# Sanity lokal sebelum cloud build
bun run typecheck

# Dev-client (install sekali di device fisik; dibutuhkan Material You)
bun run build:dev:android && bun run build:dev:ios

# Internal test build, distribusi via EAS download URL
bun run build:preview:android

# Siap store + submit
bun run build:prod:android && bun run submit:android
bun run build:prod:ios && bun run submit:ios

# One-shot kedua platform + auto-submit (butuh credentials + URL publik + tested!)
bunx eas-cli@latest build --platform all --auto-submit
```

## Secrets & environment variables

**Tidak ada yang sensitif di-hardcode.** Semua lewat layer:

```text
local shell / .env  ──┐
GitHub Secrets ───────┼─→ resolved saat build-time → baked ke bundle
EAS env vars ─────────┘
```

`eas.json` memakai ekspansi `${VAR:-fallback}`; jika var kosong, placeholder dipakai
dan workflow CI mencetak warning.

| Variable                                           | Dipakai oleh                                    | Set lokal                                    | Set CI                 |
| -------------------------------------------------- | ----------------------------------------------- | -------------------------------------------- | ---------------------- |
| `MOBILE_API_URL_PREVIEW`                           | `eas.json → preview.env.EXPO_PUBLIC_API_URL`    | export sebelum `eas build`                   | GitHub → Variables     |
| `MOBILE_MEDIA_BASE_URL_PREVIEW`                    | idem, media                                     | idem                                         | idem                   |
| `MOBILE_API_URL_PRODUCTION`                        | `eas.json → production.env.EXPO_PUBLIC_API_URL` | idem                                         | idem                   |
| `MOBILE_MEDIA_BASE_URL_PRODUCTION`                 | idem, media                                     | idem                                         | idem                   |
| `EXPO_TOKEN`                                       | Auth EAS di CI                                  | tidak perlu (`eas login`)                    | **Secrets**            |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` _(contents)_ | Submit Android                                  | `./secrets/google-play-service-account.json` | **Secrets** (opsional) |

Google Play service account: taruh JSON key di
`apps/mobile/secrets/google-play-service-account.json` (git-ignored;
`eas.json → submit.production.android.serviceAccountKeyPath` sudah menunjuk ke sana).

Apple/iOS submit: biarkan `eas.json → submit.production.ios` kosong dan jawab prompt,
atau pre-fill Apple ID / ASC App ID / Team ID.

### CI: automatic EAS builds

Workflow: [`.github/workflows/eas-build.yml`](../../.github/workflows/eas-build.yml).

- Trigger: push tag `v*` → production build dua platform (tanpa auto-submit); atau
  manual **Actions → Mobile — EAS Build → Run workflow**.
- Workflow membaca `MOBILE_*` dari repo **Variables** dan warning keras bila URL masih
  mengandung `example.com`.
- Free-tier EAS punya limit menit/konkurensi — workflow sengaja tidak jalan di PR/push `main`.

### OTA Updates (EAS Update)

Karena `runtimeVersion.policy = "appVersion"`, perubahan JS-only bisa dikirim sebagai
OTA tanpa review store:

```bash
bun run update:preview "chore: tweak home greeting"
bun run update:production "feat: vocab detail screen"
```

OTA **tidak** berlaku untuk perubahan native dep (`package.json` bump, modul Expo baru)
→ rebuild binary. Material You hanya aktif di dev-client/production build; di Expo Go,
`useAppTheme()` fallback ke static Ink themes.

## Design decisions worth knowing

- **Tanpa custom font bundled** — system serif (Georgia di iOS, `serif` di Android)
  agar binary kecil dan rendering Hanzi terpercaya.
- **Tanpa NativeBase/Paper/Gluestack** — primitives hand-rolled demi kontrol penuh sistem Editorial.
- **Material You opt-in per theme**, bukan default; hidden di iOS.
- **AMOLED adalah mode, bukan theme** — modifier di atas base theme mana pun.
- **Auth refresh**: response 401 memicu satu in-flight `/auth/refresh`; gagal → wipe
  SecureStore + redirect `(auth)`.

## Belum dikerjakan

- Mode game lain selain Hanzi Match (typing, listening, decomposition)
- Sync lintas-device outbox SRS offline (saat ini local-only via AsyncStorage)
- Kustomisasi suara/channel push notification
- Deep-link notifikasi review (tap "5 cards due" → `/review`)
- Offline exam sessions

## Troubleshooting

| Gejala                                            | Fix                                                                                                                                                                                                |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| White screen saat start                           | `bun install` dari root, restart Metro `bun run start -c`                                                                                                                                          |
| "Network request failed" di device fisik          | Tunjuk `EXPO_PUBLIC_API_URL` ke IP LAN, bukan `localhost`                                                                                                                                          |
| Error TS `SafeAreaView … not a valid JSX element` | Sudah ditangani — `tsconfig.paths` me-redirect `@types/react` ke copy lokal di `node_modules` mobile (monorepo root resolve versi beda untuk Next.js). Jangan hapus override dari `tsconfig.json`. |
| Theme aneh di Expo Go                             | Expected — Material You butuh dev client; static theme tetap normal                                                                                                                                |
| JWT stale setelah backend restart                 | Sign out & in lagi, atau wipe app data                                                                                                                                                             |
