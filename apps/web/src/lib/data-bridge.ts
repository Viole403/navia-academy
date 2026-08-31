/**
 * Runtime bridge layer for backward compatibility.
 *
 * Automatically aliases old Chinese-specific field names to new generic names.
 * Enables zero-cost migration — existing data files work without changes.
 *
 * Features:
 * - Auto-detect old vs new schema
 * - Bidirectional field mapping (hanzi ↔ text, pinyin ↔ romanization)
 * - Preserves both old and new fields during transition
 * - Type-safe transformations
 *
 * Usage:
 * ```typescript
 * import { aliasVocabFields } from "@/lib/data-bridge";
 *
 * const rawData = await fetchBundle("zh/vocabulary/index");
 * const vocabulary = rawData.map(aliasVocabFields);
 * // Works with both old and new schemas
 * ```
 *
 * @see TYPE_GENERALIZATION_V2.md
 * @version 2.0
 * @date 2026-08-02
 */

import type { VocabWord, VocabExample, GrammarPoint } from "@/types"

/* ========================= Schema Detection ========================= */

/**
 * Check if vocabulary word uses old Chinese schema.
 * Old schema has: hanzi, pinyin, hsk
 * New schema has: text, romanization, level, language
 */
export function isOldSchemaVocab(data: object): boolean {
  return "hanzi" in data && !("text" in data) && !("language" in data)
}

/**
 * Check if example uses old schema
 */
export function isOldSchemaExample(data: object): boolean {
  return "hanzi" in data && !("text" in data)
}

/* ========================= Vocabulary Field Aliasing ========================= */

/**
 * Transform vocabulary word to support both old and new schemas.
 *
 * Strategy:
 * 1. Detect schema version (old vs new)
 * 2. Create unified object with both old and new field names
 * 3. Map values bidirectionally for compatibility
 *
 * Result: Code can use either `.hanzi` or `.text` and both work.
 */
export function aliasVocabFields(raw: Record<string, unknown>): VocabWord {
  const isOld = isOldSchemaVocab(raw)

  if (isOld) {
    // Old schema → Add new fields, keep old ones
    return {
      ...raw,
      // New generic fields
      language: (raw.language as VocabWord["language"]) ?? "zh",
      text: raw.hanzi as string,
      textVariant: raw.traditional as string | undefined,
      romanization: raw.pinyin as string | undefined,
      pronunciation: raw.tones as number[] | undefined,
      level: raw.hsk as number,

      // Keep old fields for backward compat
      hanzi: raw.hanzi as string | undefined,
      traditional: raw.traditional as string | undefined,
      pinyin: raw.pinyin as string | undefined,
      tones: raw.tones as number[] | undefined,
      hsk: raw.hsk as number | undefined,

      // Required gloss fields (schema)
      translation_id: (raw.translation_id as string) ?? "",
      translation_en:
        (raw.translation_en as string) ?? (raw.translation as string) ?? "",
    } as unknown as VocabWord
  } else {
    // New schema → Add old field aliases if missing
    return {
      ...raw,
      // Ensure language is set
      language: (raw.language as VocabWord["language"]) ?? "zh",

      // Add old field aliases for backward compat
      hanzi: (raw.hanzi as string) ?? (raw.text as string),
      traditional: (raw.traditional as string) ?? (raw.textVariant as string),
      pinyin: (raw.pinyin as string) ?? (raw.romanization as string),
      tones:
        (raw.tones as number[] | undefined) ??
        (raw.pronunciation as number[] | undefined),
      hsk: (raw.hsk as number | undefined) ?? (raw.level as number),
      translation_id: (raw.translation_id as string) ?? "",
      translation_en:
        (raw.translation_en as string) ?? (raw.translation as string) ?? "",
    } as unknown as VocabWord
  }
}

/**
 * Transform array of vocabulary words
 */
export function aliasVocabArray(data: Record<string, unknown>[]): VocabWord[] {
  return data.map(aliasVocabFields)
}

/* ========================= Example Field Aliasing ========================= */

/**
 * Transform example sentence to support both schemas
 */
export function aliasExampleFields(raw: Record<string, unknown>): VocabExample {
  const isOld = isOldSchemaExample(raw)

  if (isOld) {
    return {
      ...raw,
      text: raw.hanzi as string,
      romanization: raw.pinyin as string | undefined,
      hanzi: raw.hanzi as string | undefined,
      pinyin: raw.pinyin as string | undefined,
      translation: (raw.translation as string) ?? "",
      translation_id: (raw.translation_id as string) ?? "",
      translation_en:
        (raw.translation_en as string) ?? (raw.translation as string) ?? "",
    }
  } else {
    return {
      ...raw,
      text: (raw.text as string) ?? "",
      translation: (raw.translation as string) ?? "",
      hanzi: (raw.hanzi as string | undefined) ?? (raw.text as string),
      pinyin:
        (raw.pinyin as string | undefined) ?? (raw.romanization as string),
      translation_id: (raw.translation_id as string) ?? "",
      translation_en:
        (raw.translation_en as string) ?? (raw.translation as string) ?? "",
    }
  }
}

/**
 * Transform array of examples
 */
export function aliasExampleArray(
  data: Record<string, unknown>[]
): VocabExample[] {
  return data.map(aliasExampleFields)
}

/* ========================= Grammar Field Aliasing ========================= */

/**
 * Transform grammar point to support both schemas
 */
export function aliasGrammarFields(raw: Record<string, unknown>): GrammarPoint {
  return {
    ...raw,
    language: (raw.language as string) ?? "zh",
    level: (raw.level as number | undefined) ?? (raw.hsk as number),
    hsk: (raw.hsk as number | undefined) ?? (raw.level as number),

    // Transform examples if present
    examples: raw.examples
      ? aliasExampleArray(raw.examples as Record<string, unknown>[])
      : [],
  } as unknown as GrammarPoint
}

/**
 * Transform array of grammar points
 */
export function aliasGrammarArray(
  data: Record<string, unknown>[]
): GrammarPoint[] {
  return data.map(aliasGrammarFields)
}

/* ========================= Batch Processing ========================= */

/**
 * Transform entire data bundle (auto-detect type)
 */
export function aliasBundleData(data: unknown): unknown {
  if (Array.isArray(data)) {
    // Detect data type from first item
    if (data.length === 0) return data

    const first = data[0]
    if (
      first &&
      typeof first === "object" &&
      ("hanzi" in first || "text" in first)
    ) {
      // Vocabulary
      return aliasVocabArray(data as Record<string, unknown>[])
    }
    if (first && typeof first === "object" && "pattern" in first) {
      // Grammar
      return aliasGrammarArray(data as Record<string, unknown>[])
    }

    // Generic array (readings, characters, etc.)
    return data
  }

  // Object (curriculum bundle, etc.)
  return data
}

/* ========================= Migration Helpers ========================= */

/**
 * Convert old Chinese word to new schema (one-way migration).
 * Use this when you want to permanently migrate data files.
 */
export function migrateVocabToNewSchema(
  old: Record<string, unknown>
): VocabWord {
  return {
    id: String(old.id ?? ""),
    language: "zh",
    text: String(old.hanzi ?? ""),
    textVariant: old.traditional as string | undefined,
    romanization: old.pinyin as string | undefined,
    zhuyin: old.zhuyin as string | undefined,
    pronunciation: old.tones as number[] | undefined,
    translation: String(old.translation ?? ""),
    translation_en: String(old.translation_en ?? old.translation ?? ""),
    translation_id: String(old.translation_id ?? ""),
    pos: String(old.pos ?? ""),
    level: Number(old.hsk ?? 0),
    examMappings: old.examMappings as VocabWord["examMappings"],
    meanings: (old.meanings as string[]) || [],
    examples: ((old.examples as Record<string, unknown>[]) || []).map((ex) => ({
      text: String(ex.hanzi ?? ex.text ?? ""),
      romanization: ex.pinyin as string | undefined,
      zhuyin: ex.zhuyin as string | undefined,
      translation: String(ex.translation ?? ""),
      translation_en: String(ex.translation_en ?? ex.translation ?? ""),
      translation_id: String(ex.translation_id ?? ""),
      audio: ex.audio as string | undefined,
    })),
    classifier: old.classifier as string | undefined,
    radicals: old.radical ? [old.radical as string] : undefined,
    strokes: old.strokes as number | undefined,
    synonyms: old.synonyms as string[] | undefined,
    antonyms: old.antonyms as string[] | undefined,
    related: old.related as string[] | undefined,
    register: old.register as VocabWord["register"],
    frequency: (old.frequency as 1 | 2 | 3 | 4 | 5) ?? 3,
    tags: (old.tags as string[]) || [],
    audio: old.audio as string | undefined,
    image: old.image as string | undefined,
  } as VocabWord
}

/**
 * Batch migrate vocabulary array to new schema
 */
export function migrateVocabBatch(
  oldData: Record<string, unknown>[]
): VocabWord[] {
  return oldData.map(migrateVocabToNewSchema)
}

/* ========================= Validation ========================= */

/**
 * Validate that a word has all required fields
 */
export function validateVocabWord(word: VocabWord): string[] {
  const errors: string[] = []

  if (!word.id) errors.push("Missing id")
  if (!word.language) errors.push("Missing language")
  if (!word.text) errors.push("Missing text")
  if (!word.translation) errors.push("Missing translation")
  if (!word.level || word.level < 1 || word.level > 7) {
    errors.push("Invalid level (must be 1-7)")
  }

  // Language-specific validation
  if (word.language === "zh") {
    if (!word.romanization)
      errors.push("Chinese word missing romanization (pinyin)")
    if (!word.tones || word.tones.length === 0) {
      errors.push("Chinese word missing pronunciation (tones)")
    }
  }

  return errors
}

/**
 * Check if word is valid
 */
export function isValidVocabWord(word: VocabWord): boolean {
  return validateVocabWord(word).length === 0
}

/* ========================= Type Utilities ========================= */

/**
 * Ensure word has new schema fields populated.
 * If using old data, this forces the new fields to be present.
 */
export function ensureNewSchemaFields(word: VocabWord): VocabWord {
  return {
    ...word,
    text: word.text || word.hanzi || "",
    romanization: word.romanization || word.pinyin,
    level: word.level || word.hsk || 1,
    language: word.language || "zh",
  }
}

/**
 * Get the "canonical" text representation (prefers new schema)
 */
export function getCanonicalText(word: VocabWord): string {
  return word.text || word.hanzi || ""
}

/**
 * Get the "canonical" romanization (prefers new schema)
 */
export function getCanonicalRomanization(word: VocabWord): string | undefined {
  return word.romanization || word.pinyin
}

/**
 * Get the "canonical" level (prefers new schema)
 */
export function getCanonicalLevel(word: VocabWord): number {
  return word.level || word.hsk || 1
}
