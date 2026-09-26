/**
 * Exam types as they cross the wire.
 *
 * There are two shapes here and they are genuinely different, not two versions
 * of one thing:
 *
 * - The **session API** (`/exam/sessions`, `/cat/session`) serves questions the
 *   backend generates from the vocabulary bundle it fetches from the CDN. Its
 *   options are plain strings and the answer is the option's own text, because
 *   there is no option row to hold an id.
 * - The **content files** under `data/json/<lang>/assessments/` are authored
 *   or generated ahead of time and do carry stable option ids, which is what
 *   lets a question be referenced before it is ever served.
 *
 * The session shape below is the one both clients render, so it is the one
 * written out in full. A client that starts consuming the content-file shape
 * needs `ContentExercise` too — importing the wrong one of these is the mistake
 * this comment exists to prevent.
 */

/** The five exams that exist. See the content authoring rules. */
export type ExamTypeCode = "hsk" | "tocfl" | "goethe" | "jlpt" | "toefl"

export type ExamDifficulty = "easy" | "medium" | "hard"

export type ExamSessionStatus = "in_progress" | "completed" | "abandoned"

/**
 * Question types the backend can emit. The generator maps a requested type onto
 * one of these, and falls back to a meaning question for anything it does not
 * recognise, so the union is open on purpose.
 */
export type ExamQuestionType =
  | "multiple-choice"
  | "listening"
  | "reading"
  | "pronunciation"
  | "character"
  | "meaning"
  | "fill_blank"

/**
 * A question as the session API serves it.
 *
 * `options` are the answer texts themselves and `correctAnswer` is one of them
 * verbatim, so a client picks by value rather than by index — which also means
 * a client must not assume the correct answer sits anywhere in particular.
 */
export interface ExamQuestion {
  id: string
  type: ExamQuestionType | (string & {})
  difficulty?: ExamDifficulty | string
  prompt: string
  /** Chinese prompt. Not sent by the session API; kept for content-sourced questions. */
  prompt_chinese?: string
  examType?: string
  examLevel?: string
  /** Answer texts, including the correct one. */
  options?: string[]
  /** One of `options`, verbatim. */
  correctAnswer?: string
  explanation?: string
  /** Text to speak, for the listening type. */
  audioText?: string
  tags?: string[]
}

/** A question as the content files store it, with stable option ids. */
export interface ContentOption {
  id: string
  label: string
}

export interface ContentExercise {
  id: string
  type: string
  prompt: string
  options?: ContentOption[]
  /** An option id. */
  correct?: string
  skill?: string
  explanation?: string
  audioText?: string
  /** Pronunciation: the headword the reading belongs to. */
  target?: string
  pinyin?: string
  zhuyin?: string
}

export interface ExamSessionWire {
  id: number
  user_id: string
  exam_type: string
  exam_level: string
  status: ExamSessionStatus | string
  current_question_index: number
  questions?: ExamQuestion[]
  answers?: Record<string, unknown>
  started_at: string
  completed_at?: string
  time_limit?: number
  time_remaining?: number
  question_count: number
}

/** CAT session state. `tab_warnings` is kept server-side so a resume does not reset it. */
export interface CatSession {
  id: number
  user_id: string
  exam_type: string
  status: string
  start_theta: number
  engine_version?: string
  answers: unknown[]
  time_limit_sec?: number
  time_remaining_sec?: number
  tab_warnings?: number
  started_at?: string
}
