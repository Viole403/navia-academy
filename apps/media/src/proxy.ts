import { NextRequest, NextResponse } from "next/server"
import { ADMIN_COOKIE, adminAuthEnabled, safeEqual } from "@/lib/admin-auth"

/**
 * Shared-secret gate for the whole Media Studio dashboard.
 *
 * - `MEDIA_ADMIN_TOKEN` not set → dev mode, everything open (local convenience).
 * - Set → every page/API requires the session cookie (issued at /api/auth/login).
 *   Pages redirect to /login; API routes return 401.
 *
 * `api/auth/login`, `api/auth/logout`, static assets, and the login page are
 * exempt. Everything else (dashboard, /api/generate/*, /api/status, /api/anki/*,
 * /api/import/*, and any future key-management routes) is gated here.
 */
export async function proxy(req: NextRequest) {
  // Dev convenience: without MEDIA_ADMIN_TOKEN the dashboard is open locally.
  // In production that is a misconfiguration, not a feature — fail closed so a
  // missing env var can never expose the keys/generate surfaces publicly.
  if (!adminAuthEnabled()) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[media] MEDIA_ADMIN_TOKEN is NOT set in production — refusing to serve the dashboard (fail-closed)."
      )
      if (req.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "AUTH_MISCONFIGURED",
              message: "Media Studio: MEDIA_ADMIN_TOKEN not configured",
            },
          },
          { status: 503 }
        )
      }
      return new NextResponse(
        "Media Studio is not configured (MEDIA_ADMIN_TOKEN missing).",
        { status: 503 }
      )
    }
    return NextResponse.next()
  }

  const { pathname } = req.nextUrl
  const isPublic =
    pathname === "/login" ||
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/logout" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")

  const cookie = req.cookies.get(ADMIN_COOKIE)?.value ?? ""
  const authorized =
    isPublic ||
    (cookie.length > 0 &&
      safeEqual(cookie, process.env.MEDIA_ADMIN_TOKEN ?? ""))

  if (authorized) return NextResponse.next()

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Media Studio: invalid session",
        },
      },
      { status: 401 }
    )
  }
  const url = req.nextUrl.clone()
  url.pathname = "/login"
  url.searchParams.set("next", pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)",
  ],
}
