# Contributing

Thank you for your interest in Navia Academy!

## Workflow

1. Open an issue describing the bug or proposal before a large change.
2. Fork and create a descriptive branch: `feat/short-name` or `fix/short-name`.
3. Make sure linting and build pass for your changes.
4. Open a pull request explaining what and why.

## Conventions

- **Commits**: [Conventional Commits](https://www.conventionalcommits.org)
- **Code**: TypeScript strict, with loading/empty/error states on all new UI.
- **UI text**: every user-facing string must go through i18n (`en.json` / `id.json` via `t()`).
  No hardcoded English/Spanish text in components. Keep both locale files in sync (same keys).

## Adding Content

Content is a **staged release**: authored in `apps/media/data/json/` (source of truth), validated
(`check-dedup` / `validate-images`), then published via `publish-data` into immutable, content-hashed
R2/CDN bundles (read path). Supabase `content_items` (via the backend `ContentHandler` admin API)
remains the contributor/review record. **Public users never read the database.**

### Baseline / publish

```bash
# data/json → R2/CDN bundles + data-manifest.json (idempotent, content-hashed)
pnpm --filter @navia/media publish-data
```

> Env: `CONTENT_SUPABASE_URL` + `CONTENT_SUPABASE_SERVICE_ROLE_KEY` are only required for the
> image/TTS key pools and `media_settings` (see `apps/media/.env.example`).

### Edit workflow (via DB)

1. **Edit** items → status `draft` (through the backend admin API / Media Studio).
2. **Review** → reviewer (`app_metadata.content_role = 'reviewer'`) sets `published`.
3. **Release** → `publish-data` from `data/json` (manual or via `media-generate.yml`).
4. **Propagate** → clients see the new `data-manifest.json` within 5 min. No CDN purge.

### Edit workflow (dev, via JSON)

```bash
# 1. Edit data/json, 2. check for duplicates, 3. publish for local testing
pnpm --filter @navia/media check-dedup
pnpm --filter @navia/media publish-data   # → R2/CDN (or local storage via .env.local)
```

Rules for content:

- Keep identifiers stable — user progress references them by `id`.
- Chinese content must be verified against reliable sources.
- Every item that has `pinyin` **must also have `zhuyin`** (Bopomofo) so the zhuyin display mode
  works consistently. Fill missing zhuyin from the hanzi (e.g. via `pypinyin` BopomoFo output);
  do not regenerate existing zhuyin blindly — polyphonic/neutral-tone readings (e.g. 认识 → rèn·shi,
  子 → 3rd tone) are hand-verified and must be preserved.
- Spanish is not allowed in content or UI. Use English (default) + Indonesian (`id.json`).

## Media pipeline (apps/media)

`apps/media` is the Media Studio: content store (Supabase) + JSON seed, and the audio (TTS) +
image (AI) pipeline. **Audio and images both upload to R2** (immutable, no egress fee).
See `R2_SETUP_GUIDE.md` for production setup.

```bash
# Rebuild the audio manifest from data/json
pnpm --filter @navia/media generate-manifest
# Generate audio + images (incremental, dedup by text/translation) and upload to R2
pnpm --filter @navia/media generate-audio
pnpm --filter @navia/media generate-images
# Publish content bundles → R2/CDN
pnpm --filter @navia/media publish-data
# Import an Anki deck
pnpm --filter @navia/media import-anki -- path/to/deck.apkg --dump out.json
```

## Backend (apps/backend)

The backend is a self-hosted Go/Fiber API backed by Postgres + Redis. It serves **user data only** —
content data is never served by the backend; public users read it from R2/CDN through the media
pipeline above.

- **Local dev**: `cd apps/backend && cp .env.example .env && docker compose up -d && make dev`
- **Typecheck/build**: `go vet ./cmd/... ./internal/... ./pkg/...` / `go build ./cmd/server`
- **Deploy**: self-hosted — `make build` → run `bin/server` (no automated deploy workflow)
- **CI**: `ci.yml` runs `go vet` + `go build` on every push/PR.

Endpoint conventions:

- Public lookups (vocabulary, contributors, sponsors) may be cached at the edge.
- Everything under user data (progress, SRS, sessions, tasks, settings) **must not be cached**.
- Auth is custom JWT HS256: `Authorization: Bearer <access_token>`; responses use the
  `{success, data, error:{code,message}}` envelope.

## Web (apps/web)

- Content is fetched **only** from R2/CDN via `src/lib/data-client.ts` (manifest-resolved, cache-first).
  Never add a route that pulls content from the backend/Supabase.
- User data is fetched from the backend API (`NEXT_PUBLIC_API_BASE_URL`).

## Building

```bash
# Frontend
cd apps/web && npm run build

# Backend
make -C apps/backend build

# Media Studio
cd apps/media && npm run build
```

## CI/CD

- `.github/workflows/ci.yml` — lint + typecheck (web, backend-Go, media, mobile) + JSON data validation.
- `.github/workflows/media-generate.yml` — manual: generate audio/images/manifest, then publish bundles → R2.
- `.github/workflows/eas-build.yml` — Expo EAS builds (mobile, future).
