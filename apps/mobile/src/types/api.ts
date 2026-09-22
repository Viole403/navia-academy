// ─── Envelope ───────────────────────────────────────────────────────────────
// Backend (Go/Fiber) returns most resources directly (no {data} wrapper). List
// endpoints return `{ data: T[], count?: number }`.
export interface ApiEnvelope<T> {
  data: T
  count?: number
}

// ─── Auth (Supabase Auth via backend) ───────────────────────────────────────
export interface SupabaseUserMetadata {
  name?: string
  role?: string
  [k: string]: unknown
}

export interface SupabaseUser {
  id: string
  name: string
  email: string | null
  email_verified: boolean
  image?: string | null
  role: string
  aud?: string
  email_confirmed_at?: string | null
  user_metadata: SupabaseUserMetadata
  app_metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface SupabaseSession {
  access_token: string
  refresh_token: string
  expires_in?: number
  expires_at?: number
  token_type?: string
  user: SupabaseUser
}

export interface LoginResponse {
  user: SupabaseUser
  session: SupabaseSession
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

// ─── Progress / SRS ─────────────────────────────────────────────────────────
export interface OnboardingState {
  completed: boolean
  step: number
  goal?: string
  examType?: string
  dailyMinutes?: number
}

export interface UserProgress {
  id: string
  user_id: string
  xp: number
  streak: number
  best_streak: number
  last_study_date?: string
  started_at: string
  onboarding?: OnboardingState
  placement?: unknown
  saved_word_ids: string[]
  difficult_item_ids: string[]
  data?: unknown
}

export interface SrsCard {
  id: string
  user_id: string
  item_id: string
  kind: "word" | "character" | "grammar"
  mastery: number
  interval: number
  ease: number
  due_date: string
  total_reviews: number
  correct_streak: number
  last_review?: string
}

export interface SrsStats {
  total: number
  due: number
  by_kind?: Record<string, number>
}

export interface StudySession {
  id: string
  user_id: string
  date: string
  minutes: number
  xp: number
}

export interface Achievement {
  id: string
  user_id: string
  achievement_id: string
  unlocked_at: string
}

export interface Task {
  id: string
  user_id: string
  content: string
  completed: boolean
  due_date?: string
  created_at: string
  updated_at: string
}

// ─── Vocabulary (all learning languages, not just zh) ──────────────────────
export interface VocabWord {
  id: string
  /**
   * Headword. Chinese items use `hanzi`; other languages use `text`
   * (media schema: `text`, `pronunciation[]`, `language`).
   */
  hanzi: string
  /** Optional reading/pronunciation. zh = pinyin; de/ja/en use `pronunciation`. */
  pinyin?: string
  translation: string
  language?: string
  text?: string
  pronunciation?: string[]
  traditional?: string
  exampleSentence?: string
  exampleTranslation?: string
  examMappings?: Record<string, string | number>
  audioUrl?: string
  [key: string]: unknown
}

// ─── Exam ───────────────────────────────────────────────────────────────────
export interface ExamQuestion {
  id: string
  type: string
  difficulty?: string
  prompt: string
  prompt_chinese?: string
  options?: string[]
  explanation?: string
}

export interface ExamSession {
  id: number
  user_id: string
  exam_type: string
  exam_level: string
  status: "active" | "completed" | "abandoned"
  current_question_index: number
  questions?: ExamQuestion[]
  answers?: Record<string, unknown>
  started_at: string
  completed_at?: string
  time_limit?: number
  time_remaining?: number
  question_count: number
}

export interface ExamResult {
  id: number
  session_id: number
  exam_type: string
  exam_level: string
  total_questions: number
  correct_answers: number
  score: number
  passing_score: number
  time_taken: number
  recommended_next_level?: string
  created_at: string
}

export interface ExamProgress {
  exam_type: string
  current_level?: string
  highest_score: number
  average_score: number
  total_attempts: number
}

// ─── Settings ───────────────────────────────────────────────────────────────
export interface UserSettings {
  theme: string
  mode: string
  locale: string
  audio_rate: number
  autoplay_audio: boolean
  sound_effects: boolean
  daily_goal_min: number
  new_words_per_day: number
  max_reviews_per_day: number
  voice_gender: string
  daily_reminder: boolean
  reminder_time?: string
  weekly_summary: boolean
  streak_alerts: boolean
  active_exam_type: string
  reduce_motion: boolean
  focus_mode: boolean
}

// ─── TTS ────────────────────────────────────────────────────────────────────
export interface TTSResponse {
  url: string
  text: string
  locale: string
  gender: string
  provider: string
}

export interface TTSCacheStats {
  total_cached: number
}

// ─── Contributors & Sponsors ────────────────────────────────────────────────
export interface Contributor {
  id: string
  name: string
  avatar?: string
  contributions: string[]
  mandarin_level?: string
  portfolio?: string
  bio?: string
  joined_at: string
}

export interface Sponsor {
  id: string
  name: string
  logo?: string
  website?: string
  tier?: string
  description?: string
  started_at: string
}

// ─── Content bundles (mirrors media data/json/<lang>/<group>/index) ─────────
// ponytail: index-signature fields ([key: string]: unknown) accept media
// extras without breaking tsc; tighten when bundles get a JSON schema.
export interface GrammarExample {
  hanzi?: string
  text?: string
  pinyin?: string
  romanization?: string
  translation?: string
  [key: string]: unknown
}

export interface GrammarPoint {
  id: string
  title: string
  pattern?: string
  level?: string
  hsk?: number
  difficulty?: string
  simpleExplanation?: string
  examples?: GrammarExample[]
  [key: string]: unknown
}

export interface ReadingParagraph {
  hanzi?: string
  text?: string
  pinyin?: string
  romanization?: string
  zhuyin?: string
  translation?: string
  [key: string]: unknown
}

export interface Reading {
  id: string
  title: string
  type?: string
  hsk?: number
  level?: string
  wordCount?: number
  summary?: string
  paragraphs?: ReadingParagraph[]
  [key: string]: unknown
}

export interface DialogueTurn {
  speaker?: string
  hanzi?: string
  text?: string
  pinyin?: string
  romanization?: string
  zhuyin?: string
  translation?: string
  [key: string]: unknown
}

export interface ConversationScenario {
  id: string
  title: string
  context?: string
  hsk?: number
  level?: string
  formality?: string
  turns?: DialogueTurn[]
  [key: string]: unknown
}

export interface HanziChar {
  id: string
  char?: string
  hanzi?: string
  pinyin?: string
  tone?: number
  meaning?: string
  strokes?: number
  radical?: string
  [key: string]: unknown
}

export interface Course {
  id: string
  language?: string
  title: string
  description?: string
  levelIds?: string[]
  status?: string
  [key: string]: unknown
}

export interface CurriculumBundle {
  course?: Course
  levels?: unknown[]
  units?: unknown[]
  lessons?: unknown[]
  [key: string]: unknown
}

export interface PlacementOption {
  id: string
  label: string
}

export interface PlacementItem {
  id: string
  band: number
  type: string
  prompt: string
  options: PlacementOption[]
  correct: string
  skill?: string
  hsk?: number
  [key: string]: unknown
}

export type PlacementSkill =
  "listening" | "reading" | "grammar" | "vocabulary" | "speaking" | "writing"

export interface PlacementResult {
  estimatedBand: number
  estimatedHsk?: number
  confidence: "low" | "medium" | "high"
  strengths: string[]
  weaknesses: string[]
  correctCount: number
  totalCount: number
}

// ─── CAT (backend elo-v1, exam_handler.go + models/exam.go) ─────────────────
export interface CatAnswer {
  item_id: string
  item_elo?: number
  correct: boolean
  format?: string
}

export interface CatResult {
  id: number
  user_id: string
  exam_type: string
  exam_level?: string
  elo_estimate: number
  elo_sd?: number
  cefr_band?: string
  total_questions?: number
  correct_answers?: number
  time_taken?: number
  answers?: CatAnswer[]
  engine_version?: string
  integrity_flag?: boolean
  created_at: string
}

export interface CatSession {
  id: number
  user_id: string
  exam_type: string
  status: string
  start_theta?: number
  engine_version?: string
  answers?: CatAnswer[]
  elapsed_sec?: number
  time_remaining_sec?: number
  time_limit_sec?: number
  started_at: string
}
