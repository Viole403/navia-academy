/**
 * Generalized type system for multi-language support (v2).
 *
 * Design: Flexible interface with optional language-specific fields.
 * - Single interface for all languages (no discriminated unions)
 * - Language-specific fields are optional
 * - Smart accessor functions handle language detection
 * - Zero-cost migration via runtime field aliasing
 *
 * Benefits:
 * - ✅ No complex type guards needed
 * - ✅ Simpler code (no type narrowing)
 * - ✅ Backward compatible with old Chinese schema
 * - ✅ Runtime bridge preserves existing data files
 *
 * @see TYPE_GENERALIZATION_V2.md
 * @version 2.0
 * @date 2026-08-02
 */

import type { LanguageCode } from "./index"

/* ========================= Exam System (Generalized) ========================= */

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
export type TocflLevel =
  | "Novice 1"
  | "Novice 2"
  | "Level 1"
  | "Level 2"
  | "Level 3"
  | "Level 4"
  | "Level 5"
export type JlptLevel = "N5" | "N4" | "N3" | "N2" | "N1"
export type ToeflScore = number // 0-120

export type ExamTypeGeneric =
  // Chinese exams
  | "hsk"
  | "tocfl"
  // German
  | "goethe"
  // Japanese
  | "jlpt"
  // English
  | "toefl"

export interface ExamMappingsGeneric {
  // Chinese exams
  hsk?: 1 | 2 | 3 | 4 | 5 | 6 | 7
  tocfl?: TocflLevel

  // German
  goethe?: CefrLevel

  // Japanese
  jlpt?: JlptLevel

  // English
  toefl?: ToeflScore
}

/* ========================= Vocabulary (Generalized v2) ========================= */

/**
 * Unified vocabulary word interface for all languages.
 *
 * Design: Single flexible interface with optional language-specific fields.
 * - Core fields required for all languages
 * - Language-specific fields optional (undefined for non-applicable languages)
 * - Backward compatible via deprecated aliases
 * - Runtime bridge handles field mapping automatically
 *
 * Usage:
 * ```typescript
 * // Access any field safely (auto-undefined for non-applicable)
 * const pinyin = word.romanization; // Works for Chinese, undefined for German
 * const gender = word.gender;       // Works for German, undefined for Chinese
 *
 * // Use smart accessors for language-aware formatting
 * import { vocab } from "@/lib/vocab-utils";
 * const display = vocab.display(word); // Auto-formats based on language
 * ```
 */
export interface VocabWord {
  id: string
  language: LanguageCode

  /* Core Fields (All Languages) */

  /** Primary text representation in target language */
  text: string

  /** Translation in learner's native language */
  translation: string

  /** Indonesian gloss. Required by schema; empty until the language is migrated. */
  translation_id: string

  /** Explicit English gloss. Required by schema (copy of `translation` on migrated items). */
  translation_en: string

  /** Part of speech: noun, verb, adjective, etc. */
  pos: string

  /** Proficiency level (1-7 scale, language-agnostic) */
  level: number

  /** Exam mappings (CEFR, HSK, JLPT, etc.) */
  examMappings?: ExamMappingsGeneric

  /** Alternative meanings/definitions */
  meanings: string[]

  /** Example sentences */
  examples: Example[]

  /** Synonyms (IDs or text) */
  synonyms?: string[]

  /** Antonyms (IDs or text) */
  antonyms?: string[]

  /** Related words (IDs) */
  related?: string[]

  /** Register: neutral, formal, informal */
  register?: "neutral" | "formal" | "informal"

  /** Frequency (1 = rare, 5 = very common) */
  frequency: 1 | 2 | 3 | 4 | 5

  /** Tags for categorization */
  tags: string[]

  /** Audio file URL/key */
  audio?: string

  /** Image file URL/key */
  image?: string

  /* Language-Specific Fields (Optional) */

  /** Text variant: Traditional Chinese, British English, Swiss German, etc. */
  textVariant?: string

  /** Romanization: Pinyin (zh), Romaji (ja), none for Latin scripts */
  romanization?: string

  /** Pronunciation guide: IPA, tones, pitch accent */
  pronunciation?: string[] | number[]

  /* Chinese-specific */

  /** Zhuyin/Bopomofo (Chinese) */
  zhuyin?: string

  /** Measure word/classifier (Chinese: 量词) */
  classifier?: string

  /** Component radicals (Chinese) */
  radicals?: string[]

  /** Stroke count (Chinese, Japanese kanji) */
  strokes?: number

  /* German-specific */

  /** Grammatical gender (German nouns) */
  gender?: "m" | "f" | "n"

  /** Definite article (German: der/die/das) */
  article?: "der" | "die" | "das"

  /** Plural form (German, English irregular) */
  plural?: string

  /** Genitive form (German) */
  genitive?: string

  /** Separable prefix verb (German) */
  separable?: boolean

  /** Verb conjugation pattern (German) */
  verbPattern?: "weak" | "strong" | "mixed" | "irregular"

  /* Japanese-specific */

  /** Kanji representation (Japanese) */
  kanji?: string

  /** Hiragana reading (Japanese) */
  hiragana?: string

  /** Katakana reading (Japanese, for foreign words) */
  katakana?: string

  /** Counter word (Japanese) */
  counter?: string

  /** Kanji readings (Japanese) */
  readings?: {
    kun?: string[] // kun-yomi
    on?: string[] // on-yomi
  }

  /* English-specific */

  /** Irregular past tense (English verbs) */
  pastTense?: string

  /** Irregular past participle (English verbs) */
  pastParticiple?: string

  /** Phrasal verb particles (English) */
  particles?: string[]

  /* Backward Compatibility (Deprecated) */

  /** @deprecated Use `text` instead (Chinese: 汉字) */
  hanzi?: string

  /** @deprecated Use `textVariant` instead (Chinese: 繁體字) */
  traditional?: string

  /** @deprecated Use `romanization` instead (Chinese: 拼音) */
  pinyin?: string

  /** @deprecated Use `pronunciation` instead (Chinese: 声调) */
  tones?: number[]

  /** @deprecated Use `level` instead (Chinese HSK level) */
  hsk?: number
}

/* ========================= Example Sentences (Generalized v2) ========================= */

/**
 * Example sentence for vocabulary/grammar demonstrations.
 * Flexible interface supporting all languages.
 */
export interface Example {
  /** Sentence in target language */
  text: string

  /** Translation in learner's language */
  translation: string

  /** Indonesian gloss. Required by schema; empty until the language is migrated. */
  translation_id: string

  /** Explicit English gloss. Required by schema (copy of `translation` on migrated items). */
  translation_en: string

  /** Audio file URL/key */
  audio?: string

  /** Breakdown/annotation (optional) */
  breakdown?: string

  /* Language-specific (optional) */

  /** Romanization (Chinese pinyin, Japanese romaji) */
  romanization?: string

  /** Zhuyin/Bopomofo (Chinese) */
  zhuyin?: string

  /** IPA pronunciation (German, English) */
  pronunciation?: string

  /* Backward compatibility */

  /** @deprecated Use `text` instead */
  hanzi?: string

  /** @deprecated Use `romanization` instead */
  pinyin?: string
}

/* ========================= Grammar (Generalized) ========================= */

export interface GrammarPointBase {
  id: string
  language: LanguageCode

  /** Grammar point title */
  title: string

  /** Pattern or structure */
  pattern: string

  /** Proficiency level (1-7) */
  level: number

  /** Exam mappings */
  examMappings?: ExamMappingsGeneric

  /** Difficulty (1-5) */
  difficulty: 1 | 2 | 3 | 4 | 5

  /** Simple explanation */
  simpleExplanation: string

  /** Technical/detailed explanation */
  detailedExplanation: string

  /** Usage notes */
  usage: string

  /** When to avoid */
  avoidWhen: string

  /** Example sentences */
  examples: Example[]

  /** Common mistakes */
  commonMistakes: string[]

  /** Related grammar points (IDs) */
  relatedPoints?: string[]

  /** Category/topic */
  category: string

  /** Tags */
  tags: string[]
}

export interface GrammarPointZh extends GrammarPointBase {
  language: "zh"
  /** Chinese-specific fields (if needed) */
}

export interface GrammarPointDe extends GrammarPointBase {
  language: "de"
  /** German-specific fields (if needed) */
}

export type GrammarPoint = GrammarPointZh | GrammarPointDe | GrammarPointBase

/* ========================= Reading (Generalized) ========================= */

export interface ReadingBase {
  id: string
  language: LanguageCode

  /** Title */
  title: string

  /** Subtitle */
  subtitle?: string

  /** Reading type */
  type:
    "sentences" | "conversation" | "story" | "news" | "culture" | "professional"

  /** Proficiency level */
  level: number

  /** Difficulty */
  difficulty: 1 | 2 | 3 | 4 | 5

  /** Paragraphs/sections */
  paragraphs: ParagraphBase[]

  /** Exam mappings */
  examMappings?: ExamMappingsGeneric

  /** Tags */
  tags: string[]
}

export interface ParagraphBase {
  text: string
  translation: string
  audio?: string
}

export interface ParagraphZh extends ParagraphBase {
  romanization: string // pinyin
  zhuyin?: string
}

export type Paragraph = ParagraphZh | ParagraphBase

export interface ReadingZh extends ReadingBase {
  language: "zh"
  paragraphs: ParagraphZh[]
}

export type Reading = ReadingZh | ReadingBase

/* ========================= Character System (Generalized) ========================= */

/**
 * Generic character/letter interface.
 * For Chinese: Hanzi with radicals, strokes
 * For German: Letters with umlaut info
 * For Japanese: Kanji/kana
 */
export interface CharacterBase {
  id: string
  language: LanguageCode

  /** Character/letter */
  char: string

  /** Variant (traditional Chinese, uppercase, etc.) */
  variant?: string

  /** Meaning/name */
  meaning: string

  /** Proficiency level */
  level: number

  /** Words containing this character (vocab IDs) */
  words: string[]

  /** Exam mappings */
  examMappings?: ExamMappingsGeneric
}

export interface HanziChar extends CharacterBase {
  language: "zh"

  /** Pinyin */
  romanization: string

  /** Zhuyin */
  zhuyin?: string

  /** Tone */
  tone: 0 | 1 | 2 | 3 | 4

  /** Stroke count */
  strokes: number

  /** Radical */
  radical: string

  /** Radical meaning */
  radicalMeaning: string

  /** Component characters */
  components: string[]

  /** Visually similar characters */
  similar?: string[]
}

export type Character = HanziChar | CharacterBase

/* ========================= Type Guards (Simplified) ========================= */

/**
 * Simple language checkers (no complex type narrowing needed with v2).
 * Use these when you need to check language for logic, not for type safety.
 */
export function isChineseWord(word: VocabWord): boolean {
  return word.language === "zh"
}

export function isGermanWord(word: VocabWord): boolean {
  return word.language === "de"
}

export function isEnglishWord(word: VocabWord): boolean {
  return word.language === "en"
}

export function isJapaneseWord(word: VocabWord): boolean {
  return word.language === "ja"
}

/**
 * Get language name for display
 */
export function getLanguageName(lang: LanguageCode): string {
  const names: Record<LanguageCode, string> = {
    zh: "Chinese",
    de: "German",
    en: "English",
    ja: "Japanese",
  }
  return names[lang]
}
