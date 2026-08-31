import apiClient from "./client"
import type {
  Achievement,
  Contributor,
  ExamProgress,
  ExamResult,
  ExamSession,
  LoginResponse,
  RegisterRequest,
  Sponsor,
  SrsCard,
  SrsStats,
  StudySession,
  Task,
  TTSCacheStats,
  TTSResponse,
  SupabaseUser,
  UserProgress,
  UserSettings,
} from "@/types/api"

/** Backend (Go/Fiber): list endpoints return `{ data: T[], count? }`. */
async function unwrapList<T>(
  p: Promise<{ data: { data: T[]; count?: number } }>
): Promise<T[]> {
  const res = await p
  return res.data.data ?? []
}

/** Backend (Go/Fiber): single resources are returned directly. */
async function unwrapDirect<T>(p: Promise<{ data: T }>): Promise<T> {
  const res = await p
  return res.data
}

// ─── Auth ──────────────────────────────────────────────────────────────────
export const auth = {
  login: (email: string, password: string) =>
    unwrapDirect<LoginResponse>(
      apiClient.post("/auth/login", { email, password })
    ),
  register: (body: RegisterRequest) =>
    unwrapDirect<LoginResponse>(apiClient.post("/auth/register", body)),
  me: () =>
    unwrapDirect<SupabaseUser>(
      apiClient.get("/me").then((r) => ({ data: r.data.user }))
    ),
}

// ─── Progress & SRS ────────────────────────────────────────────────────────
export const progress = {
  get: () => unwrapDirect<UserProgress>(apiClient.get("/progress")),
  update: (body: Record<string, unknown>) =>
    unwrapDirect<{ ok: boolean }>(apiClient.put("/progress", body)),
  dueCards: (limit = 50) =>
    unwrapList<SrsCard>(apiClient.get(`/progress/due-cards?limit=${limit}`)),
  review: (
    item_id: string,
    kind: "word" | "character" | "grammar",
    grade: 0 | 1 | 2 | 3
  ) =>
    unwrapDirect<SrsCard>(
      apiClient
        .post("/progress/review", { item_id, kind, grade })
        .then((r) => ({ data: r.data.data }))
    ),
  achievements: () =>
    unwrapList<Achievement>(apiClient.get("/progress/achievements")),
  logStudy: (minutes: number, xp: number) =>
    unwrapDirect<{ ok: boolean }>(
      apiClient.post("/progress/study-session", { minutes, xp })
    ),
  studySessions: (limit = 50, offset = 0) =>
    unwrapList<StudySession>(
      apiClient.get(`/progress/study-sessions?limit=${limit}&offset=${offset}`)
    ),
  srsStats: () =>
    unwrapDirect<SrsStats>(
      apiClient.get("/srs/stats").then((r) => ({ data: r.data }))
    ),
  ensureCard: (item_id: string, kind: "word" | "character" | "grammar") =>
    unwrapDirect<SrsCard>(
      apiClient
        .post("/srs/cards", { item_id, kind })
        .then((r) => ({ data: r.data.data }))
    ),
}

// ─── Tasks ─────────────────────────────────────────────────────────────────
export const tasks = {
  list: () => unwrapList<Task>(apiClient.get("/tasks")),
  create: (content: string, due_date?: string) =>
    unwrapDirect<Task>(
      apiClient
        .post("/tasks", { title: content, due_date })
        .then((r) => ({ data: r.data.data }))
    ),
  update: (id: string, body: { content?: string; completed?: boolean }) =>
    unwrapDirect<{ ok: boolean }>(apiClient.put(`/tasks/${id}`, body)),
  remove: (id: string) =>
    unwrapDirect<{ ok: boolean }>(apiClient.delete(`/tasks/${id}`)),
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
    unwrapDirect<{ exam_type: string; exam_level: string } | null>(
      apiClient.get("/exam/sessions?type=recommended")
    ),
  get: (sessionId: number) =>
    unwrapDirect<ExamSession>(
      apiClient.get(`/exam/sessions?sessionId=${sessionId}`)
    ),
  create: (
    exam_type: string,
    exam_level: string,
    settings?: Record<string, unknown>
  ) =>
    unwrapDirect<ExamSession>(
      apiClient
        .post("/exam/sessions", { exam_type, exam_level, settings })
        .then((r) => ({ data: r.data.data }))
    ),
  answer: (session_id: number, question_id: string, answer: unknown) =>
    unwrapDirect<ExamSession>(
      apiClient.put("/exam/sessions?action=answer", {
        session_id,
        question_id,
        answer,
      })
    ),
  submit: (session_id: number) =>
    unwrapDirect<ExamResult>(
      apiClient.put("/exam/sessions?action=submit", { session_id })
    ),
  abandon: (session_id: number) =>
    unwrapDirect<ExamSession>(
      apiClient.put("/exam/sessions?action=abandon", { session_id })
    ),
}

// ─── Games ─────────────────────────────────────────────────────────────────
export const game = {
  addGameResult: (game_id: string, accuracy: number, score: number) =>
    unwrapDirect<{ ok: boolean }>(
      apiClient
        .post("/games", { game_id, accuracy, score })
        .then((r) => ({ data: r.data.data }))
    ),
}

// ─── Settings ──────────────────────────────────────────────────────────────
export const settings = {
  get: () => unwrapDirect<UserSettings>(apiClient.get("/settings")),
  update: (body: Partial<UserSettings>) =>
    unwrapDirect<{ ok: boolean }>(apiClient.put("/settings", body)),
}

// ─── TTS ───────────────────────────────────────────────────────────────────
export const tts = {
  /** POST /tts — works with or without auth (backend is optional-auth). */
  say: (text: string, locale = "zh-CN", gender = "female") =>
    unwrapDirect<TTSResponse>(apiClient.post("/tts", { text, locale, gender })),
  /** GET /tts/cache/stats — admin/diagnostic, requires auth. */
  cacheStats: () =>
    unwrapDirect<TTSCacheStats>(apiClient.get("/tts/cache/stats")),
}

// ─── Contributors & Sponsors (public, mostly informational) ───────────────
export const community = {
  contributors: (limit = 50) =>
    unwrapList<Contributor>(apiClient.get(`/contributors?limit=${limit}`)),
  contributor: (id: string) =>
    unwrapDirect<Contributor>(apiClient.get(`/contributors/${id}`)),
  sponsors: (limit = 50) =>
    unwrapList<Sponsor>(apiClient.get(`/sponsors?limit=${limit}`)),
  sponsor: (id: string) =>
    unwrapDirect<Sponsor>(apiClient.get(`/sponsors/${id}`)),
  applyContributor: (body: {
    name: string
    email: string
    contribution_area: string
    mandarin_level?: string
    portfolio?: string
    message?: string
  }) =>
    unwrapDirect<{ ok: boolean }>(apiClient.post("/contributors/apply", body)),
  applySponsor: (body: {
    company_name: string
    email: string
    website?: string
    message?: string
    tier_interest?: string
  }) => unwrapDirect<{ ok: boolean }>(apiClient.post("/sponsors/apply", body)),
}

// ─── Health (public, ops) ─────────────────────────────────────────────────
export const health = {
  check: () =>
    unwrapDirect<{ status: string; version: string }>(apiClient.get("/health")),
}
