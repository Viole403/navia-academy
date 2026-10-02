/**
 * Supported learning languages — mirrors apps/web/src/lib/languages.ts.
 *
 * Content data lives per language under `data/json/<code>/...` (single source
 * of truth in `apps/media/data/json`), published as language-scoped bundles,
 * e.g. `zh/vocabulary/index`, `de/vocabulary/index`.
 */

export type LanguageCode = "zh" | "de" | "en" | "ja"

export interface LanguageInfo {
  code: LanguageCode
  /** English label, e.g. "Chinese". */
  name: string
  /** Native label, e.g. "中文". */
  nativeName: string
  /** Primary writing script of the language. */
  script: "Simplified" | "Traditional" | "Latin" | "Kana"
  /** BCP-47 locale for TTS / audio. */
  ttsLocale: string
  /** ISO 639-1 code for i18n lookups. */
  iso6391: string
  /** Which exam types are relevant to this language (subset of ExamType). */
  examTypes: string[]
}

export const LANGUAGES: LanguageInfo[] = [
  {
    code: "zh",
    name: "Chinese",
    nativeName: "中文",
    script: "Simplified",
    ttsLocale: "zh-CN",
    iso6391: "zh",
    examTypes: ["hsk", "tocfl"],
  },
  {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    script: "Latin",
    ttsLocale: "de-DE",
    iso6391: "de",
    examTypes: ["goethe"],
  },
  {
    code: "en",
    name: "English",
    nativeName: "English",
    script: "Latin",
    ttsLocale: "en-US",
    iso6391: "en",
    examTypes: ["toefl"],
  },
  {
    code: "ja",
    name: "Japanese",
    nativeName: "日本語",
    script: "Kana",
    ttsLocale: "ja-JP",
    iso6391: "ja",
    examTypes: ["jlpt"],
  },
]

export const DEFAULT_LANGUAGE: LanguageCode = "zh"

export function languageInfo(code: LanguageCode): LanguageInfo {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0]
}

export function isSupportedLanguage(code: string): code is LanguageCode {
  return LANGUAGES.some((l) => l.code === code)
}

/**
 * Get the learning language for a given exam type.
 * - HSK/TOCFL → "zh" · Goethe → "de" · JLPT → "ja" · TOEFL → "en"
 */
export function languageForExam(examType: string): LanguageCode {
  const lower = examType.toLowerCase()
  if (lower === "hsk" || lower === "tocfl") return "zh"
  if (lower === "goethe") return "de"
  if (lower === "jlpt") return "ja"
  if (lower === "toefl") return "en"
  return "zh"
}

/**
 * Which script an exam teaches. Only the two Chinese tracks differ, so every
 * other exam returns null and callers leave the stored preference alone.
 */
export function scriptForExam(
  examType: string
): "simplified" | "traditional" | null {
  const lower = examType.toLowerCase()
  if (lower === "hsk") return "simplified"
  if (lower === "tocfl") return "traditional"
  return null
}

/** Logical bundle name for a language-scoped content domain. */
export function langBundle(lang: LanguageCode, name: string): string {
  return `${lang}/${name}`
}

/** True for languages whose writing system is character/kana-based (zh, ja). */
export type CharScriptLanguage = "zh" | "ja"

export function isCharScript(lang: LanguageCode): lang is CharScriptLanguage {
  const script = languageInfo(lang).script
  return (
    script === "Simplified" || script === "Traditional" || script === "Kana"
  )
}

/** Script-aware label for the unit of writing (character vs word). */
export function wordLabel(lang: LanguageCode, singular = true): string {
  if (isCharScript(lang)) return singular ? "character" : "characters"
  return singular ? "word" : "words"
}

/** BCP-47 locale for TTS given a language. */
export function ttsLocaleFor(lang: LanguageCode): string {
  return languageInfo(lang).ttsLocale
}

/** Headword of a vocab item: `hanzi` (zh) or `text` (de/en/ja media schema). */
export function headword(w: { hanzi?: string; text?: string }): string {
  return w.text ?? w.hanzi ?? ""
}

/** Reading of a vocab item: `pinyin` (zh) or first `pronunciation` (de/en/ja). */
export function reading(w: {
  pinyin?: string
  pronunciation?: string[]
}): string {
  return w.pinyin ?? w.pronunciation?.[0] ?? ""
}

/** Per-language seal glyph + cover sub-line (neutral across zh/de/en/ja). */
export const MOTIF: Record<LanguageCode, { char: string; sub: string }> = {
  zh: { char: "你", sub: "nǐ · you" },
  de: { char: "Ä", sub: "Ä · ä" },
  en: { char: "A", sub: "A · a" },
  ja: { char: "あ", sub: "あ · a" },
}

export function motifChar(lang: LanguageCode): string {
  return MOTIF[lang].char
}

export function motifSub(lang: LanguageCode): string {
  return MOTIF[lang].sub
}

// ─── Exam metadata (mirrors media data/json/exam-*.json) ────────────────────

/** Display names: media `exam-display-names.json`. */
export const EXAM_DISPLAY_NAMES: Record<string, string> = {
  hsk: "HSK",
  tocfl: "TOCFL",
  goethe: "Goethe-Zertifikat",
  jlpt: "JLPT",
  toefl: "TOEFL iBT",
}

/** Badge colors: media `exam-badge-colors.json` (light values). */
export const EXAM_BADGE_COLORS: Record<string, string> = {
  hsk: "#BB4030",
  tocfl: "#3E8464",
  goethe: "#3D7A6B",
  jlpt: "#B53A3A",
  toefl: "#2F6FC6",
}

/** Level ladders per exam: media `exam-definitions.json` levels. */
export const EXAM_LEVELS: Record<string, string[]> = {
  hsk: ["1", "2", "3", "4", "5", "6", "7"],
  tocfl: [
    "Novice 1",
    "Novice 2",
    "Level 1",
    "Level 2",
    "Level 3",
    "Level 4",
    "Level 5",
  ],
  goethe: ["A1", "A2", "B1", "B2", "C1", "C2"],
  jlpt: ["N5", "N4", "N3", "N2", "N1"],
  toefl: ["0-30", "31-60", "61-80", "81-100", "101-120"],
}

export function examDisplayName(examType: string): string {
  return EXAM_DISPLAY_NAMES[examType.toLowerCase()] ?? examType.toUpperCase()
}

export function examBadgeColor(examType: string): string | undefined {
  return EXAM_BADGE_COLORS[examType.toLowerCase()]
}

export function examLevels(examType: string): string[] {
  return EXAM_LEVELS[examType.toLowerCase()] ?? ["1", "2", "3"]
}

/**
 * Name a numeric content level using the active exam's own ladder, so a German
 * conversation reads "B1" instead of a bare "2". Returns empty when there is no
 * exam track to name it after — a bare number is not a subtitle.
 */
export function levelLabelFor(
  examType: string | null | undefined,
  level?: number | string
): string {
  if (!examType || level == null || level === "") return ""
  const n = typeof level === "number" ? level : Number(level)
  if (!Number.isFinite(n)) return String(level)
  return examLevels(examType)[n - 1] ?? `Level ${n}`
}
