// Web is a pure frontend: every data request goes to the Go/Fiber backend
// (NEXT_PUBLIC_API_BASE_URL) authenticated with the custom JWT access token.
//
// This file is the single API module — transport layer (api<T>), domain types,
// and typed domain wrappers (admin, content, community, cat), mirroring the
// structure of apps/mobile/src/api/ (client.ts + endpoints.ts).

import { getAccessToken, refreshSession } from "@/lib/auth-client"

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080"
).replace(/\/+$/, "")

/** Headers with the Bearer access token attached. */
export function authHeaders(
  extra: Record<string, string> = {}
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  }
  const token = getAccessToken()
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

/** fetch() to the backend that automatically attaches the Bearer token. */
export function authFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: authHeaders(init?.headers as Record<string, string>),
  })
}

interface Envelope<T> {
  success: boolean
  data?: T
  error?: { code?: string; message?: string }
}

export async function api<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  return apiWithRetry<T>(path, init, 0)
}

/**
 * fetch wrapper that:
 *  - attaches the Bearer token
 *  - unwraps the {success, data} envelope and throws typed errors
 *  - on 401, refreshes the token pair once and retries (parity with the
 *    mobile apiClient interceptor)
 */
async function apiWithRetry<T>(
  path: string,
  init: RequestInit | undefined,
  retried: number
): Promise<T> {
  const res = await authFetch(path, init)
  if (res.status === 401 && retried === 0) {
    const next = await refreshSession()
    if (next) return apiWithRetry<T>(path, init, 1)
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Envelope<unknown>
    const err = new Error(
      body.error?.message ?? `Request failed: ${res.status}`
    ) as Error & {
      status: number
      code?: string
    }
    err.status = res.status
    err.code = body.error?.code
    throw err
  }
  if (res.status === 204) return undefined as T
  const body = (await res.json()) as Envelope<T>
  if (body.success !== false) return (body.data ?? body) as T
  const err = new Error(
    body.error?.message ?? `Request failed: ${res.status}`
  ) as Error & {
    status: number
    code?: string
  }
  err.status = res.status
  err.code = body.error?.code
  throw err
}

// ─── Domain types (mirror mobile's @/types/api) ────────────────────────────

export interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  created_at: string
}

export interface ContentRow {
  lang: string
  domain: string
  ref: string
  pos: number
  id: string
  kind: "list" | "object"
  payload: unknown
  status: string
  created_by: string | null
  created_at: string
  updated_at: string
  review_note?: string | null
}

export interface Contributor {
  id: string
  name: string
  avatar: string | null
  contributions: string[]
  mandarin_level: string | null
  portfolio: string | null
  bio: string | null
  is_active: boolean
  joined_at: string
}

export interface TestimonialItem {
  id: string
  name: string
  role_label?: string
  quote: string
  avatar?: string
}

export interface CatSessionDTO {
  id: number
  status: string
  exam_type: string
  start_theta: number
  engine_version?: string
  answers: unknown[]
  time_limit_sec?: number
  time_remaining_sec?: number
  started_at?: string
  [k: string]: unknown
}

// ─── Admin ─────────────────────────────────────────────────────────────────
export const admin = {
  users: () => api<AdminUser[]>("/api/v1/admin/users"),
  createUser: (body: Record<string, string>) =>
    api<{ ok: boolean }>("/api/v1/admin/users", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  setRole: (id: string, role: string) =>
    api<{ ok: boolean }>(`/api/v1/admin/users/${id}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    }),
}

// ─── Content (contributor & admin) ─────────────────────────────────────────
export const content = {
  list: (query: string | URLSearchParams) =>
    api<ContentRow[]>(`/api/v1/content?${query}`),
  create: (body: Record<string, unknown>) =>
    api<{ ok: boolean }>("/api/v1/content", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (
    lang: string,
    domain: string,
    id: string,
    body: Record<string, unknown>
  ) =>
    api<{ ok: boolean }>(`/api/v1/content/${lang}/${domain}/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  review: (
    lang: string,
    domain: string,
    id: string,
    body: { status: string; review_note?: string; ref?: string }
  ) =>
    api<{ ok: boolean }>(`/api/v1/content/${lang}/${domain}/${id}/review`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
}

// ─── Community ─────────────────────────────────────────────────────────────
export const community = {
  contributors: (limit = 50) =>
    api<Contributor[]>(`/api/v1/contributors?limit=${limit}`),
  apply: (body: Record<string, string | null>) =>
    api<{ ok: boolean }>("/api/v1/contributors/apply", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  testimonials: (limit = 9) =>
    api<TestimonialItem[]>(`/api/v1/testimonials?limit=${limit}`),
}

// ─── CAT (Computer-Adaptive Testing) ───────────────────────────────────────
export const cat = {
  /** Create a new session or resume an existing one. */
  session: (body: Record<string, unknown>) =>
    api<{ id: number }>("/cat/session", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  /** Submit an answer for the current question. */
  answer: (sessionId: number, body: Record<string, unknown>) =>
    api<CatSessionDTO>(`/cat/session/${sessionId}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  /** Autosave: persist progress without submitting an answer. */
  saveSession: (sessionId: number, body: Record<string, unknown>) =>
    api<{ ok: boolean }>(`/cat/session/${sessionId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  /** Get the current session state. */
  getSession: (sessionId: number) =>
    api<CatSessionDTO>(`/cat/session/${sessionId}`),
  /** Submit the result at the end of a session. */
  result: (body: Record<string, unknown>) =>
    api<CatSessionDTO>("/cat/result", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  /** Get progress summary across all CAT sessions. */
  progress: () => api<{ elo_estimate: number }[]>("/cat/progress"),
}

// ─── Convenience export ────────────────────────────────────────────────────
export const apiClient = { admin, content, community, cat }
