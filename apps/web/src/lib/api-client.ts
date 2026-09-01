// Type-safe API client wrapping the backend envelope contract.
// Mirrors the structure of apps/mobile/src/api/endpoints.ts so both
// platforms speak the same shapely API language.
//
// Every function calls api<T>() from @/lib/api which attaches the Bearer
// token, unwraps the {success, data} envelope, and auto-refreshes on 401.

import { api } from "@/lib/api"

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
  setRole: (id: string, role: string) =>
    api<{ ok: boolean }>(`/api/v1/admin/users/${id}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    }),
}

// ─── Content (contributor & admin) ─────────────────────────────────────────
export const content = {
  list: (query: string) => api<ContentRow[]>(`/api/v1/content?${query}`),
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
  review: (lang: string, domain: string, id: string) =>
    api<{ ok: boolean }>(`/api/v1/content/${lang}/${domain}/${id}/review`, {
      method: "POST",
      body: "{}",
    }),
}

// ─── Community ─────────────────────────────────────────────────────────────
export const community = {
  contributors: (limit = 50) =>
    api<Contributor[]>(`/api/v1/contributors?limit=${limit}`),
  apply: (body: Record<string, string>) =>
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
  progress: () => api<unknown[]>("/cat/progress"),
}

// ─── Convenience export ────────────────────────────────────────────────────
export const apiClient = { admin, content, community, cat }
