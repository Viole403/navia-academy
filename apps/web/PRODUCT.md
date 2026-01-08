# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Self-directed learners of Mandarin, German, Japanese, or English working toward
standardized proficiency exams (HSK, TOCFL, Goethe-Zertifikat, JLPT, TOEFL iBT).
Confirmed secondary audiences: open-source contributors (content + code), sponsors /
donors, and staff with elevated roles (contributor / reviewer / admin) who manage
users and applications. Public registration always creates a student account.

## Product Purpose

Navia Academy is an open-source, donation-supported language academy. It sells
structure, not gamification: exam-aligned curricula, spaced repetition (SM-2 SRS) in
every program, a writing lab (Tian Zi Ge grid, stroke-order animation, radicals), and
a full exam system. A ~10-minute placement test produces a personalized plan. Success
means a learner moves "from zero to professional" mastery in their chosen exam track.

## Positioning

"Self-paced study with real exam structure" applied to open, self-serve learning: fixed,
exam-mapped curricula (exactly 5 exam tracks) plus built-in SRS — a claim generic
language apps cannot truthfully make, because most are either unstructured or
exam-blind. Free tier, no credit card, PWA that keeps working offline.

## Operating Context

- Learners study in the browser (installable PWA with basic offline support); content
  is served exclusively from R2/CDN as immutable, content-hashed bundles resolved via
  `data-manifest.json` (`src/lib/data-client.ts`). The Go backend serves user data
  (auth, progress, reviews, exams, tasks, settings) — never learner content.
- All user-facing strings flow through i18n (`t()` from `en.json` / `id.json`, kept in
  sync). Glossable/prose fields carry `_id` (Indonesian) + `_en` variants;
  `translation` stays English-canonical because quiz logic depends on it.
- Roles: student / contributor / reviewer / admin; admin panel gated server-side.
- Optional AI Tutor activates only when provider keys exist in `apps/web/.env.local`.

## Capabilities and Constraints

- Exam types are FIXED at exactly 5: `hsk`, `tocfl` (zh), `goethe` (de), `jlpt` (ja),
  `toefl` (en). Removed types (hskk, bct, yct, ap, ib, ielts, cambridge) must never be
  reintroduced anywhere.
- Spanish is forbidden in content and UI. Locales: English (default) + Indonesian (`id`).
- Every item with `pinyin` must also carry hand-verified `zhuyin`; preserve existing
  polyphonic/neutral-tone readings.
- Never add a route that pulls learner content from the backend/Supabase — R2/CDN only.
- Ship loading, empty, and error states on all new UI. TypeScript strict.
- Open decisions (not yet decided): learner locales beyond id/en; monetization beyond
  free tier + donations; AI Tutor productization.

## Brand Commitments

- Name: **Navia** ("Learn any language for real."). Voice: structured, encouraging,
  no hype ("No credit card. Start studying in two minutes.").
- Identity constraints recorded in-repo: slate base with red/blue/yellow accents;
  accent color follows active exam; display serif headings; seal-mark motif.
- Chinese content preserves traditional/simplified nuance (TOCFL → zh-TW, HSK → zh-CN
  voice locales derived from content folder paths).

## Evidence on Hand

- Full multi-language curricula as JSON in `apps/media/data/json/{zh,de,en,ja}/`
  (lessons, units, assessments, vocabulary with pinyin/zhuyin/glosses).
- Real i18n copy in `apps/web/src/i18n/en.json` + `id.json` (hero, features, FAQ,
  legal, contributors).
- Working features: placement test, lessons/exercises, hanzi-writer practice,
  SRS review, exam sessions/results, achievements/badges (recharts), command palette,
  contributor program pages wired to backend.
- Absence to respect: no pricing tables or customer logos may be fabricated.
  Testimonials are REAL learner submissions stored in the backend
  (`GET /api/v1/testimonials`, APPROVED-only after admin review) — never
  hardcoded in components.

## Product Principles

1. Structure is the product — every screen should make the plan, progress, and the
   exam target legible.
2. Free and friction-free — no paywall dark patterns; trust is earned with clarity.
3. Content truth lives on the CDN — UI reads published bundles; nothing invents data.
4. Bilingual by design — every new string exists in both `en` and `id`, Indonesian-first.
5. Respect the script — hanzi/pinyin/zhuyin rendering is sacred craft, never decorative.

## Accessibility & Inclusion

No formal WCAG target recorded yet (open decision). Known needs: keyboard operability,
reduced-motion support (existing motion components respect `prefers-reduced-motion`),
and readable CJK typography at small sizes.
