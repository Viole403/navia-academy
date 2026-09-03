import { NextRequest, NextResponse } from "next/server"
import { ADMIN_COOKIE, adminAuthEnabled, safeEqual } from "@/lib/admin-auth"

const SESSION_DAYS = 30

/**
 * Minimal in-memory brute-force protection for the shared-secret login.
 * Buckets by IP; each failed attempt records a timestamp and the window is
 * checked against the newest-first list. Not a distributed limiter — this is
 * an internal admin tool on a single instance, so process-local is enough.
 */
const MAX_ATTEMPTS = 5
const WINDOW_MS = 60_000
const COMPARE_DELAY_MS = 500
const attempts = new Map<string, number[]>() // ip -> failed timestamps

function ipOf(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  )
}

function allowIp(ip: string): boolean {
  const now = Date.now()
  const list = (attempts.get(ip) ?? []).filter((ts) => now - ts < WINDOW_MS)
  attempts.set(ip, list)
  return list.length < MAX_ATTEMPTS
}

function recordFailure(ip: string): void {
  const now = Date.now()
  const list = (attempts.get(ip) ?? []).filter((ts) => now - ts < WINDOW_MS)
  list.push(now)
  attempts.set(ip, list)
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function POST(request: NextRequest) {
  if (!adminAuthEnabled()) {
    return Response.json(
      {
        success: false,
        error: {
          code: "AUTH_DISABLED",
          message: "MEDIA_ADMIN_TOKEN not set — auth disabled",
        },
      },
      { status: 200 }
    )
  }
  const ip = ipOf(request)
  if (!allowIp(ip)) {
    return Response.json(
      {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many login attempts — try again in a minute",
        },
      },
      { status: 429 }
    )
  }
  const body = await request.json().catch(() => ({}))
  const token = typeof body?.token === "string" ? body.token : ""
  // Constant-ish compare delay: failed attempts cost the same as successful
  // ones, slowing brute force without a hard lockout.
  const started = Date.now()
  const ok = safeEqual(token, process.env.MEDIA_ADMIN_TOKEN ?? "")
  const elapsed = Date.now() - started
  if (elapsed < COMPARE_DELAY_MS) await sleep(COMPARE_DELAY_MS - elapsed)
  if (!ok) {
    recordFailure(ip)
    return Response.json(
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid token" },
      },
      { status: 401 }
    )
  }
  const res = NextResponse.json({ success: true, data: { ok: true } })
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  })
  return res
}
