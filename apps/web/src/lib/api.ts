// Web is a pure frontend: every data request goes to the Go/Fiber backend
// (NEXT_PUBLIC_API_BASE_URL) authenticated with the custom JWT access token.

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
