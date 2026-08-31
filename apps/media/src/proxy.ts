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
  if (!adminAuthEnabled()) return NextResponse.next()

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
