import { NextRequest } from "next/server"
import { dispatchMediaGenerate } from "@/lib/github-actions"

/**
 * Remote trigger for the media-generate GitHub Actions workflow — the SAME
 * workflow the VPS CLI and the GitHub UI use. Zero generation logic here:
 * Vercel serverless caps make it suitable only as a trigger + status surface.
 *
 * Auth: covered by src/proxy.ts (MEDIA_ADMIN_TOKEN cookie) like every other
 * /api/* route — no per-route auth needed.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const scope = body?.scope
  if (
    scope !== "audio" &&
    scope !== "images" &&
    scope !== "manifest" &&
    scope !== "all"
  ) {
    return Response.json(
      {
        error: "INVALID_SCOPE",
        message: 'scope must be "audio" | "images" | "manifest" | "all"',
      },
      { status: 400 }
    )
  }
  const engine = typeof body?.engine === "string" ? body.engine : undefined

  try {
    const res = await dispatchMediaGenerate({ scope, engine })
    if (!res.ok) {
      return Response.json(
        {
          error: "DISPATCH_FAILED",
          message: res.message ?? `GitHub returned ${res.status}`,
        },
        { status: res.status === 503 ? 503 : 502 }
      )
    }
    // 204 from GitHub = run queued. Surface as 202: accepted, not yet running.
    return Response.json({ ok: true, scope }, { status: 202 })
  } catch (err) {
    return Response.json(
      {
        error: "GITHUB_UNREACHABLE",
        message: err instanceof Error ? err.message : "dispatch failed",
      },
      { status: 502 }
    )
  }
}
