// ─── Envelope ───────────────────────────────────────────────────────────────
// Backend (Go/Fiber) returns most resources directly (no {data} wrapper). List
// endpoints return `{ data: T[], count?: number }`.
export interface ApiEnvelope<T> {
  data: T;
  count?: number;
}

// ─── Auth (Supabase Auth via backend) ───────────────────────────────────────
export interface SupabaseUserMetadata {
  name?: string;
  role?: string;
  [k: string]: unknown;
}

export interface SupabaseUser {
  id: string;
  name: string;
  email: string | null;
  email_verified: boolean;
  image?: string | null;
  role: string;
  aud?: string;
  email_confirmed_at?: string | null;
  user_metadata: SupabaseUserMetadata;
  app_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  user: SupabaseUser;
}

export interface LoginResponse {
  user: SupabaseUser;
  session: SupabaseSession;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

// ─── Progress / SRS ─────────────────────────────────────────────────────────
export interface OnboardingState {
  completed: boolean;
  step: number;
  goal?: string;
  examType?: string;
  dailyMinutes?: number;
}

export interface UserProgress {
  id: string;
  user_id: string;
  xp: number;
  streak: number;
  best_streak: number;
  last_study_date?: string;
  started_at: string;
  onboarding?: OnboardingState;
  placement?: unknown;
  saved_word_ids: string[];
  difficult_item_ids: string[];
  data?: unknown;
}

export interface SrsCard {
  id: string;
  user_id: string;
  item_id: string;
  kind: "word" | "character" | "grammar";
  mastery: number;
  interval: number;
  ease: number;
  due_date: string;
  total_reviews: number;
  correct_streak: number;
  last_review?: string;
}

export interface SrsStats {
  total: number;
  due: number;
  by_kind?: Record<string, number>;
}

export interface StudySession {
  id: string;
  user_id: string;
  date: string;
  minutes: number;
  xp: number;
}

export interface Achievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  content: string;
  completed: boolean;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

// ─── Vocabulary ─────────────────────────────────────────────────────────────
export interface VocabWord {
  id: string;
  hanzi: string;
  pinyin: string;
  translation: string;
  traditional?: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  examMappings?: Record<string, string | number>;
  audioUrl?: string;
  [key: string]: unknown;
}

// ─── Exam ───────────────────────────────────────────────────────────────────
export interface ExamQuestion {
  id: string;
  type: string;
  difficulty?: string;
  prompt: string;
  prompt_chinese?: string;
  options?: string[];
  explanation?: string;
}

export interface ExamSession {
  id: number;
  user_id: string;
  exam_type: string;
  exam_level: string;
  status: "active" | "completed" | "abandoned";
  current_question_index: number;
  questions?: ExamQuestion[];
  answers?: Record<string, unknown>;
  started_at: string;
  completed_at?: string;
  time_limit?: number;
  time_remaining?: number;
  question_count: number;
}

export interface ExamResult {
  id: number;
  session_id: number;
  exam_type: string;
  exam_level: string;
  total_questions: number;
  correct_answers: number;
  score: number;
  passing_score: number;
  time_taken: number;
  recommended_next_level?: string;
  created_at: string;
}

export interface ExamProgress {
  exam_type: string;
  current_level?: string;
  highest_score: number;
  average_score: number;
  total_attempts: number;
}

// ─── Settings ───────────────────────────────────────────────────────────────
export interface UserSettings {
  theme: string;
  mode: string;
  locale: string;
  audio_rate: number;
  autoplay_audio: boolean;
  sound_effects: boolean;
  daily_goal_min: number;
  new_words_per_day: number;
  max_reviews_per_day: number;
  voice_gender: string;
  daily_reminder: boolean;
  reminder_time?: string;
  weekly_summary: boolean;
  streak_alerts: boolean;
  active_exam_type: string;
  reduce_motion: boolean;
  focus_mode: boolean;
}

// ─── TTS ────────────────────────────────────────────────────────────────────
export interface TTSResponse {
  url: string;
  text: string;
  locale: string;
  gender: string;
  provider: string;
}

export interface TTSCacheStats {
  total_cached: number;
}

// ─── Contributors & Sponsors ────────────────────────────────────────────────
export interface Contributor {
  id: string;
  name: string;
  avatar?: string;
  contributions: string[];
  mandarin_level?: string;
  portfolio?: string;
  bio?: string;
  joined_at: string;
}

export interface Sponsor {
  id: string;
  name: string;
  logo?: string;
  website?: string;
  tier?: string;
  description?: string;
  started_at: string;
}
