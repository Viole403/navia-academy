# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

One Expo codebase shipping natively to Android and iOS. The visual language stays a
single unified system across both OSes (Editorial Print below) — "adaptive" here means
dual-platform native delivery plus OS affordances (Material You theming on Android 12+),
NOT divergent per-OS design worlds.

## Users

Learners on phones who study daily in short sessions: review due SRS cards, browse
vocabulary, take/resume exams, check streaks and badges. Learner-only app BY DESIGN —
admin endpoints are deliberately not implemented; contributor/sponsor applications are
submit-only (`app/apply.tsx`).

## Product Purpose

Navia Academy in the pocket: the mobile companion of the open-source language academy.
Five-tab shell — Today (dashboard), Learn (vocab browser + SRS entry review), Exam
(start/resume/history), Stats (overview/badges), Profile (tasks, settings, about) —
plus modal flows: SM-2 review session, exam session/result, Hanzi Match game, vocab
detail. Onboarding sets target script, theme, and daily goal before first use.

Success: a learner completes their daily review loop comfortably one-handed, offline
where content allows, without ever needing the desktop app.

## Operating Context

- Talks directly to the Go/Fiber backend REST API (`EXPO_PUBLIC_API_URL`); auth tokens
  persisted via expo-secure-store with auto-refresh interceptor.
- Curriculum/vocabulary read from CDN `data-manifest.json` (`EXPO_PUBLIC_DATA_CDN_URL`);
  TTS audio via backend `POST /tts` cache (expo-av streaming); images resolved against
  `EXPO_PUBLIC_MEDIA_BASE_URL`.
- Builds ship through EAS (dev client → internal preview → store production) with OTA
  updates via EAS Update.
- Backend must be reachable for auth/progress; content itself comes from CDN bundles.

## Capabilities and Constraints

- Endpoint surface fixed per README feature map (auth, me, progress, srs, tasks,
  exams, games, settings, tts, contributors, sponsors, health). No admin console.
- Tailwind v3 + nativewind (different major from web's v4 — do NOT unify versions).
- Six themes × light/dark/AMOLED: Ink (default, navy+cinnabar), Night Scholar,
  Sunset Mogao, Jade Garden, Sakura Court, Material You (Android 12+ dynamic palette);
  preferences persist via Zustand + AsyncStorage.
- i18n/localization via expo-localization; Spanish forbidden; glosses `_id` + `_en`.
- Exam types fixed at exactly 5 (hsk/tocfl/goethe/jlpt/toefl).
- Open decisions (not decided): App Store / Play release stage; tablet layouts.

## Brand Commitments

Explicitly recorded in `apps/mobile/README.md` — treat as binding:

- **Editorial Print system**: sharp geometry (borderRadius 2–4, no circles except
  dots), hairline 1px rules top/bottom of content with NO shadows, serif for
  headings/Hanzi/pull-quote italics + sans for labels/metadata
  (`src/theme/typography.ts`), single-artifact motif (small framed hanzi seal,
  `Motif.tsx`, upper-right of feature areas), color discipline (one accent + one
  secondary per screen).
- Name: **Navia Academy**. Default theme Ink carries the brand palette.

## Evidence on Hand

- Complete working app: onboarding, auth, 5 tabs, review/exam/game/apply/vocab screens
  (file-based routing under `app/`).
- Full README with stack table, env matrix per build target, endpoint↔screen mapping,
  theme catalog, Editorial Print rules, EAS script inventory.
- Theme system implemented in `src/theme/` (colors, useMaterialYou, typography).

## Product Principles

1. One hand, one accent, one artifact — mobile sessions are short and focused.
2. The plan is visible — Today always answers "what now?" without navigation.
3. Offline-tolerant — CDN-cached content keeps working when the api does not.
4. Print discipline — hairlines instead of shadows; restraint reads as quality.
