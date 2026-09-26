import type { DisplayMode, DisplayModeMode } from "@/types/api"

/**
 * Which reading aids a display mode asks for.
 *
 * Mandarin has two readings and they answer different questions: pinyin
 * ("hanyu") is what most learners transliterate from, zhuyin is the
 * phonetic script the target language itself writes. Which one helps
 * depends on where a learner is, so the mode is a preference rather than
 * a setting with a right answer. The `+trans` variants add the translation
 * alongside, and `none` shows the characters on their own.
 */
export const showsPinyin = (mode: DisplayModeMode): boolean =>
  mode === "hanyu" || mode === "hanyu+trans" || mode === "all"

export const showsZhuyin = (mode: DisplayModeMode): boolean =>
  mode === "zhuyin" || mode === "zhuyin+trans" || mode === "all"

export const showsTranslation = (mode: DisplayModeMode): boolean =>
  mode === "hanyu+trans" || mode === "zhuyin+trans" || mode === "all"

export const DISPLAY_MODES: DisplayModeMode[] = [
  "hanyu+trans",
  "zhuyin+trans",
  "all",
  "hanyu",
  "zhuyin",
  "none",
]

/** Order the picker renders, matching the order the labels read best in. */
export const DISPLAY_MODE_ORDER: DisplayModeMode[] = [
  "hanyu+trans",
  "zhuyin+trans",
  "all",
  "hanyu",
  "zhuyin",
  "none",
]

/** Mirrors the backend default so a learner with no stored setting matches. */
export const DEFAULT_DISPLAY_MODE: DisplayMode = {
  script: "simplified",
  mode: "hanyu+trans",
  adaptiveByLevel: false,
  levelOverrides: {},
}

export function resolveMode(
  base: DisplayMode,
  level?: number | null
): DisplayModeMode {
  if (!base.adaptiveByLevel || !level) return base.mode
  return base.levelOverrides[level] ?? base.mode
}

/**
 * Reading a partial or absent setting must not crash a screen, and must not
 * silently fall back to something the learner did not choose.
 */
export function normalizeDisplayMode(raw: unknown): DisplayMode {
  if (!raw || typeof raw !== "object") return DEFAULT_DISPLAY_MODE
  const d = raw as Partial<DisplayMode>
  const mode = DISPLAY_MODES.includes(d.mode as DisplayModeMode)
    ? (d.mode as DisplayModeMode)
    : DEFAULT_DISPLAY_MODE.mode
  return {
    script: d.script === "traditional" ? "traditional" : "simplified",
    mode,
    adaptiveByLevel: d.adaptiveByLevel === true,
    levelOverrides: d.levelOverrides ?? {},
  }
}

/** A mode only means something for a script that carries reading aids. */
export const isCharDisplayMode = (language: string): boolean =>
  language === "zh" || language === "ja"
