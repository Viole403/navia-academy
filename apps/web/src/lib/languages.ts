import type { LanguageCode } from "@/types"

/**
 * Supported learning languages.
 *
 * Content data lives per language under `data/json/<code>/...` (single source
 * of truth in `apps/media/data/json`), published as language-scoped bundles,
 * e.g. `zh/vocabulary/index`, `de/vocabulary/index`. Chinese is the default
 * language; new languages are added here + in the media `data/json` tree.
 */

export interface LanguageInfo {
  code: LanguageCode
  /** English label, e.g. "Chinese". */
  name: string
  /** Native label, e.g. "中文". */
  nativeName: string
  /** Primary writing script of the language. */
  script: "Simplified" | "Traditional" | "Latin" | "Kana" | "Hangul"
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
 * Exams have language-specific configurations:
 * - HSK/TOCFL → "zh" (Chinese)
 * - Goethe → "de" (German)
 * - JLPT → "ja" (Japanese)
 * - TOEFL → "en" (English)
 */
export function languageForExam(examType: string): LanguageCode {
  const zhExams = ["hsk", "tocfl"]
  const deExams = ["goethe"]
  const jaExams = ["jlpt"]
  const enExams = ["toefl"]

  const lower = examType.toLowerCase()
  if (zhExams.some((e) => e === lower)) return "zh"
  if (deExams.some((e) => e === lower)) return "de"
  if (jaExams.some((e) => e === lower)) return "ja"
  if (enExams.some((e) => e === lower)) return "en"
  return "zh" // fallback
}

/** Logical bundle name for a language-scoped content domain. */
export function langBundle(lang: LanguageCode, name: string): string {
  return `${lang}/${name}`
}

/** True for languages whose writing system is character/kana-based (zh, ja). */
export function isCharScript(lang: LanguageCode): boolean {
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
