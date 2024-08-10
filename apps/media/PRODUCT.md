# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Navia contributors and maintainers operating the content pipeline — volunteers adding
decks, fixing readings, generating media (the same people in the public `/contributors`
program). Not end-learners. Access is login-gated.

## Product Purpose

Media Studio is the operations console for the single source of truth of all Navia
learning content: `apps/media/data/json/{zh,de,en,ja}/`. From here a contributor
checks pipeline status (manifest entries, audio/image counts, storage config), runs
sample audio/image generation, manages Anki deck import sources, and holds the API
keys for TTS/image providers. Companion CLI scripts (local or GitHub Actions) rebuild
the manifest, synthesize audio/images, and publish immutable content-hashed bundles
to R2 that web and mobile consume.

Success: a contributor goes from raw deck (`.apkg`) to published, voiced, illustrated
curriculum content without touching infrastructure.

## Operating Context

- Strict pipeline order: `generate-manifest` before `generate-audio` /
  `generate-images`; publish via `publish-data` (immutable, content-hashed, 5-min
  manifest TTL, idempotent, never requires CDN purge).
- Heavy generation (~30–45 min full audio) belongs in the manual `media-generate.yml`
  GitHub Action; the Studio offers small sample runs only.
- Batch jobs probe the Go api health endpoint first (`MEDIA_BATCH_GUARD=strict|warn|off`)
  — api and media batches must never share the VPS concurrently.
- Local dev storage is RustFS at :9000; the `navia-data` bucket must be public-read +
  CORS-enabled or browsers get 403/empty audio.

## Capabilities and Constraints

- Audio dedup key = `text+locale+gender`; image dedup = `translation` hash shared
  across languages via `translation_id` — each asset generates once.
- Voice locale derives from the folder path: HSK → zh-CN, TOCFL → zh-TW.
- Every item with `pinyin` needs `zhuyin`; preserve hand-verified polyphonic readings.
- Exam types fixed at exactly 5 (hsk/tocfl/goethe/jlpt/toefl); removed exam types must
  not reappear in config, scripts, or content. Spanish forbidden anywhere.
- Studio auth: session login (`/login`) + logout + `/keys` API-keys page;
  credentials/providers come from env only.
- Open decision (not decided): per-item error drill-down / richer pipeline
  observability inside the Studio UI.

## Brand Commitments

- Name: **Navia Media Studio**. Utility-first tone; operational copy may mix
  Indonesian/English pragmatically as it does today.
- Shares the Navia identity (display-serif headings, panel/border tokens) but this is
  not a marketing surface — expression stays subordinate to task speed.

## Evidence on Hand

- Working Studio page (`src/app/page.tsx`): status stats, storage panel, sample-run
  action cards, CLI/GitHub Actions command reference, Anki source list.
- Real pipeline data: 86k+ manifest entries across zh/de/en/ja under `data/json/`.
- Scripts wired in `package.json`: generate-manifest/audio/images,
  import-anki, validate/regenerate-images, sync-content, publish-data.

## Product Principles

1. The pipeline is the product — status truth first, actions second, decoration last.
2. Idempotent by default — every operation must be safe to re-run.
3. Content rules are enforced at generation time, not by hope (zhuyin presence, dedup,
   locale derivation).
4. Never regenerate what already exists — targeted regeneration over full sweeps.
