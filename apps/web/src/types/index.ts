/** Core domain types for Navia. Language-agnostic where possible so
 *  additional languages can be added without reshaping the model. */

export type LanguageCode = "zh" | "de" | "en" | "ja";

export type HskLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type ExamType = "hsk" | "tocfl"
  | "goethe"
  | "jlpt"
  | "toefl";

export type TocflLevel = "Novice 1" | "Novice 2" | "Level 1" | "Level 2" | "Level 3" | "Level 4" | "Level 5";
export type GoetheLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type JLPTLevel = "N5" | "N4" | "N3" | "N2" | "N1";

export type TOEFLScore = number; // 0-120

export interface ExamMappings {
  // Chinese exams
  hsk?: HskLevel;
  tocfl?: TocflLevel;

  // German exams
  goethe?: GoetheLevel;
  
  // Japanese exams
  jlpt?: JLPTLevel;
  
  // English exams
  toefl?: TOEFLScore;

  metadata?: {
    source: "official" | "community" | "auto-mapped" | "manual";
    lastVerified?: Date;
    confidence?: number;
    notes?: string;
  };
}

export type GeneralLevel =
  | "beginner"
  | "elementary"
  | "intermediate"
  | "advanced"
  | "mastery";

export const HSK_TO_GENERAL: Record<HskLevel, GeneralLevel> = {
  1: "beginner",
  2: "elementary",
  3: "intermediate",
  4: "intermediate",
  5: "advanced",
  6: "advanced",
  7: "mastery",
};

export const GENERAL_LEVEL_LABELS: Record<GeneralLevel, string> = {
  beginner: "Beginner",
  elementary: "Elementary",
  intermediate: "Intermediate",
  advanced: "Advanced",
  mastery: "Mastery",
};

export type Skill =
  | "pronunciation"
  | "listening"
  | "speaking"
  | "reading"
  | "writing"
  | "vocabulary"
  | "grammar"
  | "characters"
  | "culture";

export const SKILL_LABELS: Record<Skill, string> = {
  pronunciation: "Pronunciation",
  listening: "Listening comprehension",
  speaking: "Speaking",
  reading: "Reading",
  writing: "Writing",
  vocabulary: "Vocabulary",
  grammar: "Grammar",
  characters: "Characters",
  culture: "Culture",
};

/* ------------------------------ Content ------------------------------ */

export interface Course {
  id: string;
  language: LanguageCode;
  title: string;
  description: string;
  levelIds: string[];
  status: "published" | "draft";
}

export interface Level {
  id: string;
  courseId: string;
  examType: ExamType;
  hsk: HskLevel;
  examMappings?: ExamMappings;
  title: string;
  subtitle: string;
  description: string;
  objectives: string[];
  unitIds: string[];
  estimatedHours: number;
}

export interface Unit {
  id: string;
  levelId: string;
  order: number;
  title: string;
  subtitle: string;
  description: string;
  lessonIds: string[];
  skills?: Skill[];
}

export type LessonStepType =
  | "intro"
  | "objectives"
  | "explanation"
  | "dialogue"
  | "vocabulary"
  | "grammar"
  | "pronunciation"
  | "writing"
  | "exercise"
  | "summary"
  | "reading";

export interface ReadingParagraph {
  hanzi: string;
  pinyin?: string;
  zhuyin?: string;
  translation?: string;
  translation_en?: string;
  translation_id?: string;
  audio?: string;
}

export interface DialogueLine {
  speaker: string;
  text: string;
  romanization?: string;
  zhuyin?: string;
  translation: string;
  audio?: string;
  /** @deprecated use `text` */
  hanzi?: string;
  /** @deprecated use `romanization` */
  pinyin?: string;
}

export interface LessonStep {
  id: string;
  type: LessonStepType;
  title: string;
  /** Markdown-ish body paragraphs */
  body?: string[];
  dialogue?: DialogueLine[];
  paragraphs?: ReadingParagraph[];
  vocabIds?: string[];
  grammarIds?: string[];
  characterIds?: string[];
  exercise?: Exercise;
}

export interface Lesson {
  id: string;
  unitId: string;
  order: number;
  title: string;
  subtitle: string;
  durationMin: number;
  skills: Skill[];
  steps: LessonStep[];
  xp: number;
}

export type ExerciseType =
  | "multiple-choice"
  | "listening-choice"
  | "tone-id"
  | "order-words"
  | "fill-blank"
  | "match-pairs"
  | "translate-choice"
  | "write-pinyin";

export interface ExerciseOption {
  id: string;
  label: string;
  sublabel?: string;
}

export interface Exercise {
  id: string;
  type: ExerciseType;
  prompt: string;
  /** Hanzi or audio text depending on type */
  subject?: string;
  subjectPinyin?: string;
  audioText?: string;
  options?: ExerciseOption[];
  /** For order-words: token list; correct = ordered ids */
  tokens?: ExerciseOption[];
  correct: string | string[];
  explanation?: string;
  skill: Skill;
  hsk: HskLevel;
  examMappings?: ExamMappings;
}

/* ----------------------------- Vocabulary ---------------------------- */

export type Tone = 0 | 1 | 2 | 3 | 4;

/**
 * Language-agnostic vocabulary example sentence.
 *
 * `text` / `romanization` are the canonical fields. The deprecated Chinese
 * aliases (`hanzi` / `pinyin`) remain optional so legacy zh data keeps working
 * unchanged and the data-bridge can alias them.
 */
export interface VocabExample {
  text: string;
  translation: string;
  /** Indonesian gloss. Required by schema; empty until the language is migrated. */
  translation_id: string;
  /** Explicit English gloss. Required by schema (copy of `translation` on migrated items). */
  translation_en: string;
  romanization?: string;
  zhuyin?: string;
  audio?: string;
  /** @deprecated use `text` */
  hanzi?: string;
  /** @deprecated use `romanization` */
  pinyin?: string;
}

/**
 * Language-agnostic vocabulary word.
 *
 * Canonical fields: `text` (script form), `romanization`, `level`,
 * `language`. Chinese fields (`hanzi`, `pinyin`, `tones`, `hsk`,
 * `traditional`, `classifier`, …) and other-languages fields (`gender`,
 * `article`, `plural`, `kanji`, `hiragana`, …) are optional and only present
 * for their language.
 */
export interface VocabWord {
  id: string;
  language: LanguageCode;
  /** Script form of the word (hanzi for zh, the word itself for Latin scripts). */
  text: string;
  /** Romanization/transliteration: pinyin (zh), romaji (ja), undefined for Latin scripts. */
  romanization?: string;
  translation: string;
  /** Indonesian gloss. Required by schema; empty until the language is migrated. */
  translation_id: string;
  /** Explicit English gloss. Required by schema (copy of `translation` on migrated items). */
  translation_en: string;
  pos: string; // part of speech
  /** Generic proficiency level, 1-7. */
  level: number;
  examMappings?: ExamMappings;
  meanings: string[];
  examples: VocabExample[];
  synonyms?: string[];
  antonyms?: string[];
  related?: string[];
  register?: "neutral" | "formal" | "informal";
  /** 5 = very frequent */
  frequency: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  audio?: string;
  image?: string;

  /* ---- zh / ja (non-Latin scripts) ---- */
  /** Generic writing-system form: traditional hanzi, kanji rendering, etc. */
  textVariant?: string;
  zhuyin?: string;
  /** Reading aid for Japanese (hiragana). */
  hiragana?: string;
  katakana?: string;
  kanji?: string;

  /* ---- Chinese-specific ---- */
  /** @deprecated use `text` */
  hanzi?: string;
  /** @deprecated use `textVariant` */
  traditional?: string;
  /** @deprecated use `romanization` */
  pinyin?: string;
  /** @deprecated superseded by `level` */
  hsk?: HskLevel;
  tones?: Tone[];
  classifier?: string;
  
  /* ---- German-specific ---- */
  /** Article for German nouns: der (m), die (f), das (n) */
  article?: "der" | "die" | "das";
  /** Grammatical gender for German nouns */
  gender?: "m" | "f" | "n";
  /** Plural form for German nouns */
  plural?: string;
}

export interface HanziChar {
  id: string;
  char: string;
  traditional?: string;
  pinyin: string;
  zhuyin?: string;
  tone: Tone;
  meaning: string;
  strokes: number;
  radical: string;
  radicalMeaning: string;
  components: string[];
  hsk: HskLevel;
  examMappings?: ExamMappings;
  words: string[]; // vocab ids containing this char
  similar?: string[]; // visually similar chars
  mnemonic?: string;
  audio?: string;
}

/* ------------------------------ Grammar ------------------------------ */

export interface GrammarPoint {
  id: string;
  title: string;
  pattern: string;
  /** Generic proficiency level, 1-7 (canonical). */
  level?: number;
  examMappings?: ExamMappings;
  difficulty: 1 | 2 | 3 | 4 | 5;
  simpleExplanation: string;
  technicalExplanation: string;
  usage: string;
  avoidWhen: string;
  examples: VocabExample[];
  negativeExamples: { hanzi: string; note: string }[];
  commonMistakes: string[];
  comparedWith?: { pointId: string; note: string }[];
  dependsOn?: string[];
  /** @deprecated use `level` */
  hsk?: HskLevel;
}

/* ------------------------------ Readings ------------------------------ */

export interface Reading {
  id: string;
  title: string;
  type: "sentences" | "conversation" | "story" | "news" | "culture" | "professional";
  /** Generic proficiency level, 1-7 (canonical). */
  level?: number;
  examMappings?: ExamMappings;
  wordCount: number;
  paragraphs: VocabExample[];
  questions: Exercise[];
  summary: string;
  /** @deprecated use `level` */
  hsk?: HskLevel;
}

/* --------------------------- Conversations ---------------------------- */

export interface ConversationTurn {
  speaker: "tutor" | "user";
  text: string;
  romanization?: string;
  zhuyin?: string;
  translation: string;
  audio?: string;
  /** For user turns: acceptable choices */
  choices?: { text: string; romanization?: string; zhuyin?: string; translation: string; natural: boolean; feedback: string; /** @deprecated use `text` */ hanzi?: string; /** @deprecated use `romanization` */ pinyin?: string }[];
  /** @deprecated use `text` */
  hanzi?: string;
  /** @deprecated use `romanization` */
  pinyin?: string;
}

export interface ConversationScenario {
  id: string;
  title: string;
  context: string;
  /** Generic proficiency level, 1-7 (canonical). */
  level?: number;
  examMappings?: ExamMappings;
  formality: "informal" | "neutral" | "formal";
  turns: ConversationTurn[];
  /** @deprecated use `level` */
  hsk?: HskLevel;
}

/* -------------------------------- SRS -------------------------------- */

export type SrsGrade = 0 | 1 | 2 | 3; // again / hard / good / easy

export type SrsItemKind = "word" | "character" | "grammar";

export interface SrsCard {
  itemId: string;
  kind: SrsItemKind;
  ease: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  due: string; // ISO date
  lastReviewed?: string;
  /** 0-100 heuristic mastery */
  mastery: number;
}

/* ------------------------------- User -------------------------------- */

export type ThemeId = "bauhaus" | "scholar" | "ink" | "jade" | "midnight" | "paper" | "dusk" | "focus";

export interface OnboardingData {
  completed: boolean;
  step: number;
  motivation?: string;
  experience?: "none" | "some-pinyin" | "beginner" | "conversational" | "intermediate" | "advanced";
  studyType?: "structured" | "exam-focused" | "free-exploration" | "review-only";
  minutesPerDay?: number;
  daysPerWeek?: number;
  goal?: string;
  intensity?: "light" | "balanced" | "intensive" | "academy";
  method?: "visual" | "audio" | "reading" | "speaking" | "practice" | "mixed";
  reminders?: boolean;
}

export interface PlacementResult {
  estimatedHsk: HskLevel;
  generalLevel: GeneralLevel;
  confidence: "low" | "medium" | "high";
  strengths: Skill[];
  weaknesses: Skill[];
  notEvaluated: Skill[];
  recommendedUnitId: string;
  suggestedHoursPerWeek: number;
  answeredCount: number;
  correctCount: number;
  takenAt: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: "start" | "consistency" | "vocabulary" | "characters" | "hsk" | "skill" | "dedication";
  condition: { type: string; value: number };
  xp: number;
}

export interface StudyTask {
  id: string;
  title: string;
  description: string;
  skill: Skill;
  type: "lesson" | "vocabulary" | "writing" | "listening" | "speaking" | "reading" | "review" | "exam";
  dueDate: string; // ISO date
  estimatedMin: number;
  priority: "low" | "medium" | "high";
  status: "pending" | "in-progress" | "done" | "overdue";
  linkedRoute?: string;
  createdAt: string;
  completedAt?: string;
  /** Learning language this task belongs to (defaults to the language it was created under). */
  language?: string;
}

export interface StudySessionLog {
  date: string; // ISO date (day)
  minutes: number;
  xp: number;
  skills: Partial<Record<Skill, number>>; // minutes per skill
}

export interface AssessmentDef {
  id: string;
  title: string;
  description: string;
  kind: "quick" | "unit" | "monthly" | "hsk-mock" | "vocabulary" | "grammar" | "listening";
  hsk: HskLevel;
  examMappings?: ExamMappings;
  durationMin: number;
  exercises: Exercise[];
  passScore: number; // percentage
}

export interface AssessmentAttempt {
  id: string;
  assessmentId: string;
  startedAt: string;
  finishedAt?: string;
  score: number;
  correct: number;
  total: number;
  timeSec: number;
  bySkill: Partial<Record<Skill, { correct: number; total: number }>>;
  wrongExerciseIds: string[];
}

/* -------------------------- Display Mode --------------------------- */

export type DisplayModeScript = "simplified" | "traditional";

export type DisplayModeMode =
  | "none"
  | "hanyu"
  | "zhuyin"
  | "hanyu+trans"
  | "zhuyin+trans"
  | "all";

export interface DisplayMode {
  script: DisplayModeScript;
  mode: DisplayModeMode;
  adaptiveByLevel: boolean;
  levelOverrides: Partial<Record<1 | 2 | 3 | 4 | 5 | 6 | 7, DisplayModeMode>>;
}
