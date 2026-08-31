# AGENTS.md — Navia Academy

Compact guidance for AI coding agents. Every line is something an agent would likely miss.

## Toolchain

- **pnpm + Turborepo monorepo.** Use `pnpm` (declared `packageManager: pnpm@9.15.0`). A stray `bun.lock` exists in the root but pnpm is canonical — ignore it.
- **No test runner exists anywhere.** CI only runs `pnpm lint` + per-package typecheck (`tsc --noEmit` / `go vet`) + JSON validation. Verify changes with `pnpm lint` and `tsc --noEmit`, never `pnpm test`.
- Prettier config: `semi: false`, `singleQuote: false`, `printWidth: 80`. Run `pnpm format` to autofix.
- Node 22+ / pnpm 9+ (CI pins Node 22). Backend needs Go 1.26+.

## Workspace layout

- `apps/web` — Next.js 16 App Router, React 19, Tailwind v4. Dev `:3000`. Path alias `@/*` → `./src/*`.
- `apps/media` — Next.js 16 Media Studio + content/asset pipeline (`data/json`, TTS, AI images). Dev `:3002`.
- `apps/backend` — **Go/Fiber** API. NOT a pnpm package (no `package.json`). Don't drive it with pnpm.
- `apps/mobile` — Expo + React Native, **Tailwind v3 + nativewind** (different major from web/media v4 — don't unify).
- `packages/` — `types` (shared TS types), `utils`, `eslint-config` (`@navia/eslint-config`).

## Backend (Go) commands

- Setup: `cd apps/backend && cp .env.example .env && make dev` (dev runs natively — no Docker; point `DATABASE_URL`/`REDIS_URL` at local instances or cloud dev DBs).
- `make dev` (Air hot-reload) · `make build` → `bin/server` · `make swagger` (regenerates `/scalar`, `/docs/*`).
- Typecheck: `cd apps/backend && go vet ./cmd/... ./internal/... ./pkg/...` (this is what `pnpm backend:typecheck` runs).
- API response envelope: `{success, data, error:{code,message}}`. Auth = custom JWT HS256, `Authorization: Bearer <token>`.
- Migrations live in `apps/backend/migrations/`; there is **NO automigration** — apply manually: `psql "$DATABASE_URL" -f migrations/*.sql`.
- **VPS resource budget**: Postgres/Redis are external managed cloud services (never on the VPS). `api` and `apps/media` batch jobs **never run concurrently**, so each gets the FULL budget (~90% CPU / ~62% RAM standalone) — `apps/backend/scripts/compute-resource-limits.sh` writes the caps into `.env`, consumed by the api-only `docker-compose.yml`. Media batch entrypoints probe the api's health endpoint first and warn on overlap (`MEDIA_BATCH_GUARD=strict` refuses, `off` skips). Don't reintroduce pg/redis into compose or split the budget between the two consumers.

## Content architecture (critical, non-obvious)

- **Single source of truth = `apps/media/data/json/`** (`zh/ de/ en/ ja/`). Public users read content **only** from R2/CDN via `apps/web/src/lib/data-client.ts` (cache-first, manifest-resolved). The backend **never serves content** and the DB is **never on the read path**.
- Publish: `pnpm data:publish` (`@navia/media publish-data`) → immutable, content-hashed R2 bundles + `data-manifest.json` (5 min TTL). Idempotent; releases propagate within 5 min. **No CDN purge ever.**
- Heavy generation (`generate-audio` ≈30–45 min, `generate-images`) must run in the manual `media-generate.yml` GitHub Action, not locally. `generate-manifest` must run before `generate-audio`/`generate-images` (turbo wires this dependency).
- Never add a web route that pulls content from the backend/Supabase; read it from R2/CDN only.

## Content authoring rules

- **Exam types are fixed at exactly 5**: `hsk`, `tocfl` (zh) · `goethe` (de) · `jlpt` (ja) · `toefl` (en). Removed types (`hskk`, `bct`, `yct`, `ap`, `ib`, `ielts`, `cambridge`) must **not** be reintroduced anywhere (config, types, content, curriculum, voice-map, manifest).
- **Voice locale is derived from the file/folder path, not `examMappings`**: HSK folders → `zh-CN`, TOCFL → `zh-TW` (see `examForFile` in `apps/media/scripts/generate-manifest.ts`). An item that has both mappings still follows its folder's locale.
- Every item with `pinyin` **must also have `zhuyin`** (Bopomofo). Preserve hand-verified polyphonic/neutral-tone readings (e.g. 认识 → rèn·shi); don't blindly regenerate existing zhuyin.
- Learner UI is **Indonesian-first**: glossable/prose fields carry `_id` (Indonesian) + `_en` (English) variants; `translation` stays English canonical (quiz/answer logic uses it).
- `placement.json` per language must be a **flat array** of questions, never an object — an object shape yields an empty question bank.
- Dedup keys (so the same asset is generated once): audio = `text+locale+gender`; images = `translation` hash (shared across languages via `translation_id`).

## Media Studio dev gotchas

- Local dev storage is RustFS at `:9000`. The `navia-data` bucket must be **public-read + CORS-enabled** or the browser gets 403/empty audio. Recreate the container with CORS env + the `/data` volume mounted (credentials/bucket live in the volume).
- The web service worker (`navia-v1`) can serve **stale** content in dev (symptom: blank pages / empty placement bank after content changes). Fix: `caches.delete('navia-v1')` then hard reload. Production is safe (content-hashed immutable bundles).

## UI / i18n

- Every user-facing string must go through i18n via `t()` from `en.json` / `id.json`. No hardcoded English text in components. Keep both locale files in **sync** (same keys).
- **Spanish is forbidden** in content and UI — English (default) + Indonesian (`id`) only.

## Conventions

- Commits: Conventional Commits. Branches: `feat/short-name`, `fix/short-name`.
- Frontend: TypeScript strict; ship loading/empty/error states on all new UI.
- AI Tutor is optional — enable via `apps/web/.env.local` (`AI_TUTOR_PROVIDER=openai|anthropic|gemini`); falls back to local KB if no key.

## Verify before PR

- `pnpm lint` (root, turbo) · `go vet ./cmd/... ./internal/... ./pkg/...` + `go build ./cmd/server` (apps/backend) · `npx tsc --noEmit` (apps/media, apps/web).

## Scratch space

- Put throwaway work (reports, drafts, temp JSON) in repo `tmp/`, **never** `/tmp` (wiped on reboot, not backed up). Note: `tmp/` is **not** git-ignored — don't commit generated scratch files.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
