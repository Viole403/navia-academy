import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, adminAuthEnabled, safeEqual } from "@/lib/admin-auth";

const SESSION_DAYS = 30;

export async function POST(request: NextRequest) {
  if (!adminAuthEnabled()) {
    return Response.json({ success: false, error: { code: "AUTH_DISABLED", message: "MEDIA_ADMIN_TOKEN not set — auth disabled" } }, { status: 200 });
  }
  const body = await request.json().catch(() => ({}));
  const token = typeof body?.token === "string" ? body.token : "";
  if (!safeEqual(token, process.env.MEDIA_ADMIN_TOKEN ?? "")) {
    return Response.json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } }, { status: 401 });
  }
  const res = NextResponse.json({ success: true, data: { ok: true } });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return res;
}
