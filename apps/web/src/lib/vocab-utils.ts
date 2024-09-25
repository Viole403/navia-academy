/**
 * Smart accessor utilities for generalized multi-language vocabulary (v2).
 * 
 * Provides language-agnostic access to vocabulary fields with automatic
 * formatting and fallbacks. No type guards needed — just access fields directly.
 * 
 * Benefits:
 * - ✅ Simple API (no complex type narrowing)
 * - ✅ Auto-detects language and formats appropriately
 * - ✅ Backward compatible with old Chinese schema
 * - ✅ Safe undefined handling
 * 
 * Usage:
 * ```typescript
 * import { vocab } from "@/lib/vocab-utils";
 * 
 * // Simple access
 * const text = vocab.text(word);           // Works for all languages
 * const pronunciation = vocab.pronunciation(word); // Auto-formats per language
 * 
 * // Display formatting
 * const display = vocab.display(word);     // "你好 (nǐhǎo)" or "der Tisch {m}"
 * ```
 * 
 * @see src/types/generalized.ts
 * @see TYPE_GENERALIZATION_V2.md
 * @version 2.0
 * @date 2026-08-02
 */

import type { VocabWord as GeneralizedVocabWord, VocabExample, HanziChar } from "@/types";
import type { VocabWord } from "@/types";

// Accept both canonical and generalized VocabWord types
type AnyVocabWord = VocabWord | GeneralizedVocabWord;

/* ========================= Text Content Accessors ========================= */

/**
 * Get the primary text representation of a word in the target language.
 * Works across all language types.
 */
export function getWordText(word: AnyVocabWord): string {
  return word.text;
}

/**
 * Get text variant (Traditional Chinese, British English, etc.)
 */
export function getWordVariant(word: AnyVocabWord): string | undefined {
  return word.textVariant;
}

/**
 * Get translation in learner's language
 */
export function getWordTranslation(word: AnyVocabWord): string {
  return word.translation;
}

/* ========================= Romanization & Pronunciation ========================= */

/**
 * Get romanization (Pinyin for Chinese, Romaji for Japanese, none for Latin scripts)
 */
export function getRomanization(word: AnyVocabWord): string | undefined {
  if (word.language === "zh") return word.romanization;
  if (word.language === "ja") return word.romanization;
  return undefined;
}

/**
 * Get pronunciation guide (IPA for German/English, tones for Chinese, pitch for Japanese)
 */
export function getPronunciation(word: AnyVocabWord): string {
  const p = word.tones;
  if (word.language === "zh") {
    return (p ?? []).map((t: number | string) => String(t)).join("");
  }
  if ((word.language === "de" || word.language === "en") && p?.length) {
    return String(p[0]); // IPA / phonetic
  }
  if (word.language === "ja" && p?.length) {
    return p.map(String).join(" "); // Pitch accent
  }
  return "";
}

/**
 * Format pronunciation for display (with tone marks, IPA brackets, etc.)
 */
export function formatPronunciation(word: AnyVocabWord): string {
  const p = word.tones;
  if (word.language === "zh") {
    const tones = (p ?? []).map((t: number | string) => String(t)).join("");
    return `${word.romanization ?? ""} [${tones}]`.trim();
  }
  if (word.language === "de" && p?.length) {
    return `[${p[0]}]`;
  }
  if (word.language === "en" && p?.length) {
    return `/${p[0]}/`;
  }
  if (word.language === "ja") {
    return word.hiragana ?? "";
  }
  return "";
}

/* ========================= Language-Specific Feature Access ========================= */

/**
 * Get German article (der/die/das) if applicable
 */
export function getGermanArticle(word: AnyVocabWord): string | undefined {
  if (word.language === "de") {
    return word.article;
  }
  return undefined;
}

/**
 * Get German gender marker for display
 */
export function getGermanGenderMarker(word: AnyVocabWord): string {
  if (word.language === "de" && word.gender) {
    return ` {${word.gender}}`;
  }
  return "";
}

/**
 * Get Chinese classifier/measure word
 */
export function getChineseClassifier(word: AnyVocabWord): string | undefined {
  if (word.language === "zh") {
    return word.classifier;
  }
  return undefined;
}

/**
 * Get Japanese kanji if available
 */
export function getJapaneseKanji(word: AnyVocabWord): string | undefined {
  if (word.language === "ja") {
    return word.kanji;
  }
  return undefined;
}

/**
 * Get Japanese reading (hiragana)
 */
export function getJapaneseReading(word: AnyVocabWord): string | undefined {
  if (word.language === "ja") {
    return word.hiragana;
  }
  return undefined;
}

/* ========================= Display Formatting ========================= */

/**
 * Format word for display in vocabulary list.
 * Examples:
 * - Chinese: "你好 (nǐhǎo)" 
 * - German: "der Tisch {m}"
 * - English: "hello"
 * - Japanese: "こんにちは (konnichiwa)"
 */
export function formatWordDisplay(word: AnyVocabWord): string {
  const text = word.text;
  if (word.language === "zh") {
    return word.romanization ? `${text} (${word.romanization})` : text;
  }
  if (word.language === "de") {
    const article = word.article ? `${word.article} ` : "";
    const gender = word.gender ? ` {${word.gender}}` : "";
    return `${article}${text}${gender}`;
  }
  if (word.language === "en") {
    return text;
  }
  if (word.language === "ja") {
    const reading = word.hiragana ?? word.text;
    return word.kanji ? `${word.kanji} (${reading})` : reading;
  }
  return text;
}

/**
 * Format word card title (primary representation only)
 */
export function formatWordTitle(word: AnyVocabWord): string {
  if (word.language === "ja" && word.kanji) {
    return word.kanji;
  }
  return word.text;
}

/**
 * Format word card subtitle (pronunciation/reading)
 */
export function formatWordSubtitle(word: AnyVocabWord): string {
  if (word.language === "zh") {
    return word.romanization ?? "";
  }
  if (word.language === "ja") {
    return word.hiragana ?? "";
  }
  if ((word.language === "de" || word.language === "en") && word.tones?.length) {
    return String(word.tones[0]);
  }
  return "";
}

/* ========================= Level & Exam Mapping ========================= */

/**
 * Get generic proficiency level (1-7)
 */
export function getWordLevel(word: AnyVocabWord): number {
  return word.level;
}

/**
 * Get exam level string for display (HSK 3, CEFR B1, JLPT N3, etc.)
 */
export function getExamLevelDisplay(word: AnyVocabWord): string {
  const mappings = word.examMappings;
  if (!mappings) return `Level ${word.level}`;
  
  if (word.language === "zh" && mappings.hsk) {
    return `HSK ${mappings.hsk}`;
  }

  if (word.language === "zh" && mappings.tocfl) {
    return `TOCFL ${mappings.tocfl}`;
  }

  if (word.language === "de" && mappings.goethe) {
    return `Goethe ${mappings.goethe}`;
  }
  
  if (word.language === "en") {
    if (mappings.toefl) return `TOEFL ${mappings.toefl}`;
  }
  
  if (word.language === "ja" && mappings.jlpt) {
    return `JLPT ${mappings.jlpt}`;
  }
  
  return `Level ${word.level}`;
}

/**
 * Get primary exam type for a language
 */
export function getPrimaryExamType(language: "zh" | "de" | "en" | "ja"): string {
  const examMap = {
    zh: "hsk",
    de: "goethe",
    en: "toefl",
    ja: "jlpt",
  };
  return examMap[language];
}

/* ========================= Example Sentence Helpers ========================= */

/**
 * Get example sentence text
 */
export function getExampleText(example: VocabExample): string {
  return example.text;
}

/**
 * Get example sentence translation
 */
export function getExampleTranslation(example: VocabExample): string {
  return example.translation;
}

/**
 * Format example for display with romanization if available
 */
export function formatExample(example: VocabExample, language: string): string {
  if (language === "zh" && "romanization" in example) {
    return `${example.text}\n${example.romanization}\n${example.translation}`;
  }
  return `${example.text}\n${example.translation}`;
}

/* ========================= Character Helpers ========================= */

/**
 * Get character representation
 */
export function getCharText(char: HanziChar): string {
  return char.char;
}

/**
 * Get character pronunciation
 */
export function getCharPronunciation(char: HanziChar): string {
  return char.pinyin;
}

/**
 * Get character radical (Chinese only)
 */
export function getCharRadical(char: HanziChar): string | undefined {
  return char.radical;
}

/* ========================= Audio Helpers ========================= */

/**
 * Get audio URL for a word
 */
export function getWordAudio(word: AnyVocabWord): string | undefined {
  return word.audio;
}

/**
 * Generate audio key for TTS (if no audio file exists)
 */
export function generateAudioKey(word: AnyVocabWord): string {
  const text = word.text;
  const lang = word.language;
  // Format: <lang>_<text_hash>
  return `${lang}_${text.toLowerCase().replace(/\s+/g, "_")}`;
}

/* ========================= Search & Filter Helpers ========================= */

/**
 * Check if word matches search query (searches text, romanization, translation)
 */
export function matchesSearchQuery(word: AnyVocabWord, query: string): boolean {
  const q = query.toLowerCase();
  
  if (word.text.toLowerCase().includes(q)) return true;
  if (word.translation.toLowerCase().includes(q)) return true;
  
  if (word.language === "zh" && word.romanization?.toLowerCase().includes(q)) return true;
  if (word.language === "ja" && word.hiragana?.toLowerCase().includes(q)) return true;
  if (word.language === "ja" && word.kanji?.toLowerCase().includes(q)) return true;
  
  return false;
}

/**
 * Filter words by level range
 */
export function filterByLevel(words: AnyVocabWord[], minLevel: number, maxLevel: number): AnyVocabWord[] {
  return words.filter((w) => w.level >= minLevel && w.level <= maxLevel);
}

/**
 * Filter words by exam mapping
 */
export function filterByExam(
  words: AnyVocabWord[],
  examType: string,
  examLevel: string
): AnyVocabWord[] {
  return words.filter((w) => {
    if (!w.examMappings) return false;
    const mapping = (w.examMappings as unknown as Record<string, unknown>)[examType];
    return mapping === examLevel || String(mapping) === examLevel;
  });
}

/* ========================= Migration Helpers (Backward Compatibility) ========================= */

/**
 * Convert old Chinese VocabWord to new generic format.
 * Used during migration period when both schemas coexist.
 */
export function migrateChineseWord(oldWord: Record<string, unknown>): GeneralizedVocabWord {
  return {
    id: String(oldWord.id ?? ""),
    language: "zh",
    text: String(oldWord.hanzi ?? oldWord.text ?? ""),
    textVariant: oldWord.traditional as string | undefined,
    romanization: oldWord.pinyin as string | undefined,
    zhuyin: oldWord.zhuyin as string | undefined,
    tones: oldWord.tones as GeneralizedVocabWord["tones"],
    translation: String(oldWord.translation ?? ""),
    translation_en: String(oldWord.translation_en ?? oldWord.translation ?? ""),
    translation_id: String(oldWord.translation_id ?? ""),
    pos: String(oldWord.pos ?? ""),
    level: Number(oldWord.hsk ?? 0),
    examMappings: oldWord.examMappings as GeneralizedVocabWord["examMappings"],
    meanings: (oldWord.meanings as string[]) || [],
    examples: (oldWord.examples as VocabExample[]) || [],
    classifier: oldWord.classifier as string | undefined,
    synonyms: oldWord.synonyms as string[] | undefined,
    antonyms: oldWord.antonyms as string[] | undefined,
    related: oldWord.related as string[] | undefined,
    register: oldWord.register as GeneralizedVocabWord["register"],
    frequency: (oldWord.frequency as 1 | 2 | 3 | 4 | 5) ?? 3,
    tags: (oldWord.tags as string[]) || [],
    audio: oldWord.audio as string | undefined,
    image: oldWord.image as string | undefined,
  };
}

/**
 * Check if word uses old schema (for migration detection)
 */
export function isOldSchemaWord(word: object): boolean {
  return "hanzi" in word && !("language" in word);
}

/**
 * Auto-migrate word if needed (transitional helper)
 */
export function ensureNewSchema(word: Record<string, unknown>): GeneralizedVocabWord {
  if (isOldSchemaWord(word)) {
    return migrateChineseWord(word);
  }
  return word as unknown as GeneralizedVocabWord;
}
