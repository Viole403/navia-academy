import type { VocabWord, ExamType, ExamMappings } from "@/types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const EXAM_LEVELS: Record<ExamType, (string | number)[]> = {
  hsk: [1, 2, 3, 4, 5, 6, 7],
  tocfl: ["Novice 1", "Novice 2", "Level 1", "Level 2", "Level 3", "Level 4", "Level 5"],
  goethe: ["A1", "A2", "B1", "B2", "C1", "C2"],
  jlpt: ["N5", "N4", "N3", "N2", "N1"],
  toefl: ["0-30", "31-60", "61-80", "81-100", "101-120"],
};

export class ExamValidator {
  // Validate if a level is valid for a given exam
  static validateLevel(examType: ExamType, level: string): boolean {
    return (EXAM_LEVELS[examType] ?? []).includes(level);
  }

  // Validate if a word belongs to a specific exam level
  static validateWordForExam(word: VocabWord, examType: ExamType, level: string): boolean {
    const mapping = word.examMappings?.[examType];
    if (mapping === undefined || mapping === null) return false;

    if (Array.isArray(mapping)) {
      return mapping.some((m) => String(m) === level);
    }

    return String(mapping) === level;
  }

  // Validate exam mappings object
  static validateMappings(mappings: ExamMappings): ValidationResult {
    const errors: string[] = [];

    for (const [examType, level] of Object.entries(mappings)) {
      if (examType === "metadata") continue;
      if (level === undefined || level === null) continue;

      const validLevels = EXAM_LEVELS[examType as ExamType];
      if (validLevels && !validLevels.map(String).includes(String(level))) {
        errors.push(`Invalid ${examType.toUpperCase()} level: ${level}`);
      }
    }

    // Check metadata if present
    if (mappings.metadata) {
      if (mappings.metadata.source && !["official", "community", "auto-mapped", "manual"].includes(mappings.metadata.source)) {
        errors.push(`Invalid source: ${mappings.metadata.source}`);
      }

      if (mappings.metadata.confidence !== undefined && (mappings.metadata.confidence < 0 || mappings.metadata.confidence > 1)) {
        errors.push("Confidence must be between 0 and 1");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  // Bulk validate multiple words
  static bulkValidate(words: VocabWord[]): {
    total: number;
    valid: number;
    invalid: number;
    issues: Record<string, string[]>;
    warnings: Record<string, string[]>;
  } {
    const issues: Record<string, string[]> = {};
    const warnings: Record<string, string[]> = {};
    let valid = 0;
    let invalid = 0;
    for (const word of words) {
      const result = this.validateWordStructure(word);
      if (!result.valid) {
        invalid++;
        issues[word.id] = result.errors;
      } else {
        valid++;
      }
      if (result.warnings.length > 0) {
        warnings[word.id] = result.warnings;
      }
    }

    return {
      total: words.length,
      valid,
      invalid,
      issues,
      warnings,
    };
  }

  // Validate word structure
  static validateWordStructure(word: VocabWord): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!word.id) errors.push("Missing id");
    if (!word.hanzi) errors.push("Missing hanzi");
    if (!word.pinyin) errors.push("Missing pinyin");
    if (!word.translation) errors.push("Missing translation");
    if (!word.pos) errors.push("Missing part of speech");

    // Validate frequency
    if (word.frequency !== undefined && ![1, 2, 3, 4, 5].includes(word.frequency)) {
      errors.push(`Invalid frequency: ${word.frequency}`);
    }

    // Validate exam mappings if present
    if (word.examMappings) {
      const mappingResult = this.validateMappings(word.examMappings);
      errors.push(...mappingResult.errors);
      warnings.push(...mappingResult.warnings);
    }

    // Check examples
    if (!word.examples || word.examples.length === 0) {
      warnings.push("No examples provided");
    }

    // Check meanings
    if (!word.meanings || word.meanings.length === 0) {
      warnings.push("No meanings provided");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
