import apiClient from "./client"
import type {
  Achievement,
  ApiUser,
  AuthResultResponse,
  CatAnswer,
  CatResult,
  CatSession,
  Contributor,
  ContributorApplication,
  ExamProgress,
  ExamResult,
  ExamSession,
  RecommendedExam,
  RegisterRequest,
  Sponsor,
  SponsorApplication,
  SrsCard,
  SrsStats,
  StudySession,
  Task,
  TTSCacheStats,
  TTSResponse,
  UserProgress,
  UserSettings,
} from "@/types/api"

/** Backend (Go/Fiber): list endpoints put a raw JSON array in `data`. */
async function unwrapList<T>(
  p: Promise<{ data: { data: T[] } }>
): Promise<T[]> {
  const res = await p
  return res.data.data ?? []
}

/**
 * Backend (Go/Fiber): every response is an envelope
 * {success, data, meta?, error?, trace_id}. Unwrap the inner `data`.
 */
async function unwrapData<T>(p: Promise<{ data: { data: T } }>): Promise<T> {
  const res = await p
  return res.data.data
}

// ─── Auth ──────────────────────────────────────────────────────────────────
// Backend envelope is {success, data, trace_id}; register/login return
// data = {user, token_pair}, refresh returns data = TokenPair, /me returns
// data = User. Unwrap `data` then reshape to the callers' shape.
export const auth = {
  login: (email: string, password: string) =>
    apiClient
      .post("/auth/login", { email, password })
      .then((r) => r.data.data as AuthResultResponse),
  register: (body: RegisterRequest) =>
    apiClient
      .post("/auth/register", body)
      .then((r) => r.data.data as AuthResultResponse),
  me: () => apiClient.get("/me").then((r) => r.data.data as ApiUser),
}

// ─── Progress & SRS ────────────────────────────────────────────────────────
export const progress = {
  get: () => unwrapData<UserProgress>(apiClient.get("/progress")),
  update: (body: Record<string, unknown>) =>
    unwrapData<{ ok: boolean }>(apiClient.put("/progress", body)),
  dueCards: (limit = 50) =>
    unwrapList<SrsCard>(apiClient.get(`/progress/due-cards?limit=${limit}`)),
  review: (
    item_id: string,
    kind: "word" | "character" | "grammar",
    grade: 0 | 1 | 2 | 3
  ) =>
    unwrapData<SrsCard>(
      apiClient.post("/progress/review", { item_id, kind, grade })
    ),
  achievements: () =>
    unwrapList<Achievement>(apiClient.get("/progress/achievements")),
  logStudy: (minutes: number, xp: number) =>
    unwrapData<{ ok: boolean }>(
      apiClient.post("/progress/study-session", { minutes, xp })
    ),
  studySessions: (limit = 50, offset = 0) =>
    unwrapList<StudySession>(
      apiClient.get(`/progress/study-sessions?limit=${limit}&offset=${offset}`)
    ),
  srsStats: () => unwrapData<SrsStats>(apiClient.get("/srs/stats")),
  ensureCard: (item_id: string, kind: "word" | "character" | "grammar") =>
    unwrapData<SrsCard>(apiClient.post("/srs/cards", { item_id, kind })),
}

// ─── Tasks ─────────────────────────────────────────────────────────────────
export const tasks = {
  list: () => unwrapList<Task>(apiClient.get("/tasks")),
  create: (content: string, due_date?: string) =>
    unwrapData<Task>(apiClient.post("/tasks", { content, due_date })),
  update: (id: string, body: { content?: string; completed?: boolean }) =>
    unwrapData<{ ok: boolean }>(apiClient.put(`/tasks/${id}`, body)),
  remove: (id: string) =>
    unwrapData<{ ok: boolean }>(apiClient.delete(`/tasks/${id}`)),
}

// ─── Exam ──────────────────────────────────────────────────────────────────
export const exam = {
  active: () =>
    unwrapList<ExamSession>(apiClient.get("/exam/sessions?type=active")),
  history: (examType = "", limit = 50, offset = 0) =>
    unwrapList<ExamResult>(
      apiClient.get(
        `/exam/sessions?type=history&examType=${examType}&limit=${limit}&offset=${offset}`
      )
    ),
  progress: () =>
    unwrapList<ExamProgress>(apiClient.get("/exam/sessions?type=progress")),
  recommended: () =>
    unwrapData<RecommendedExam | null>(
      apiClient.get("/exam/sessions?type=recommended")
    ),
  get: (sessionId: number) =>
    unwrapData<ExamSession>(
      apiClient.get(`/exam/sessions?sessionId=${sessionId}`)
    ),
  create: (
    exam_type: string,
    exam_level: string,
    settings?: Record<string, unknown>
  ) =>
    unwrapData<ExamSession>(
      apiClient.post("/exam/sessions", { exam_type, exam_level, settings })
    ),
  answer: (session_id: number, question_id: string, answer: unknown) =>
    unwrapData<ExamSession>(
      apiClient.put("/exam/sessions?action=answer", {
        session_id,
        question_id,
        answer,
      })
    ),
  submit: (session_id: number) =>
    unwrapData<ExamResult>(
      apiClient.put("/exam/sessions?action=submit", { session_id })
    ),
  abandon: (session_id: number) =>
    unwrapData<ExamSession>(
      apiClient.put("/exam/sessions?action=abandon", { session_id })
    ),
}

// ─── CAT (adaptive engine elo-v1, exam_handler.go) ────────────────────────
export const cat = {
  submitResult: (body: {
    exam_type: string
    elo_estimate: number
    exam_level?: string
    start_theta?: number
    elo_sd?: number
    cefr_band?: string
    total_questions?: number
    correct_answers?: number
    time_taken?: number
    answers?: CatAnswer[]
    engine_version?: string
    integrity_flag?: boolean
  }) => unwrapData<CatResult>(apiClient.post("/cat/result", body)),
  progress: () => unwrapList<CatResult>(apiClient.get("/cat/progress")),
  startSession: (body: {
    exam_type: string
    start_theta?: number
    time_limit_sec?: number
  }) => unwrapData<CatSession>(apiClient.post("/cat/session", body)),
  // Backend PATCH answers with 204 No Content — no body to unwrap.
  updateSession: async (
    id: number,
    body: { answers: CatAnswer[]; elapsed_sec?: number; theta?: number }
  ): Promise<void> => {
    await apiClient.patch(`/cat/session/${id}`, body)
  },
  resume: (id: number) =>
    unwrapData<CatSession>(apiClient.get(`/cat/session/${id}`)),
}

// ─── Games ─────────────────────────────────────────────────────────────────
export const game = {
  addGameResult: (game_id: string, accuracy: number, score: number) =>
    unwrapData<{ ok: boolean }>(
      apiClient.post("/games", { game_id, accuracy, score })
    ),
}

// ─── Settings ──────────────────────────────────────────────────────────────
export const settings = {
  get: () => unwrapData<UserSettings>(apiClient.get("/settings")),
  update: (body: Partial<UserSettings>) =>
    unwrapData<{ ok: boolean }>(apiClient.put("/settings", body)),
}

// ─── TTS ───────────────────────────────────────────────────────────────────
export const tts = {
  /** POST /tts — works with or without auth (backend is optional-auth). */
  say: (text: string, locale = "zh-CN", gender = "female") =>
    unwrapData<TTSResponse>(apiClient.post("/tts", { text, locale, gender })),
  /** GET /tts/cache/stats — admin/diagnostic, requires auth. */
  cacheStats: () =>
    unwrapData<TTSCacheStats>(apiClient.get("/tts/cache/stats")),
}

// ─── Contributors & Sponsors (public, mostly informational) ───────────────
export const community = {
  contributors: (limit = 50) =>
    unwrapList<Contributor>(apiClient.get(`/contributors?limit=${limit}`)),
  contributor: (id: string) =>
    unwrapData<Contributor>(apiClient.get(`/contributors/${id}`)),
  sponsors: (limit = 50) =>
    unwrapList<Sponsor>(apiClient.get(`/sponsors?limit=${limit}`)),
  sponsor: (id: string) =>
    unwrapData<Sponsor>(apiClient.get(`/sponsors/${id}`)),
  applyContributor: (body: {
    name: string
    email: string
    contribution_area: string
    mandarin_level?: string
    portfolio?: string
    message?: string
  }) =>
    unwrapData<ContributorApplication>(
      apiClient.post("/contributors/apply", body)
    ),
  applySponsor: (body: {
    company_name: string
    email: string
    website?: string
    message?: string
    tier_interest?: string
  }) => unwrapData<SponsorApplication>(apiClient.post("/sponsors/apply", body)),
}

// ─── Health (public, ops) ─────────────────────────────────────────────────
export const health = {
  check: () =>
    unwrapData<{ status: string; version: string }>(apiClient.get("/health")),
}
