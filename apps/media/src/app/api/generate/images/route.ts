import { NextRequest } from "next/server"
import { generateImageBatch } from "@/lib/runner-image"
import { checkApiRunning } from "../../../../../scripts/lib/api-running-guard"

export const maxDuration = 300

/**
 * Dashboard trickle-run (default limit 3). Shares the CLI's mutual-exclusion
 * preflight, but adapted to a request lifecycle: the probe never exits the
 * process — under MEDIA_BATCH_GUARD=strict an overlap answers 503 SERVICE_BUSY
 * instead; default/off just warns and continues.
 */
async function guard(): Promise<Response | null> {
  const mode = (process.env.MEDIA_BATCH_GUARD ?? "").toLowerCase()
  if (mode === "off") return null

  if (await checkApiRunning()) {
    const url =
      process.env.MEDIA_API_HEALTH_URL || "http://localhost:8080/api/v1/health"
    if (mode === "strict") {
      return Response.json(
        {
          error: "SERVICE_BUSY",
          message:
            "MEDIA_BATCH_GUARD=strict and the backend API is running — generation refused to protect the shared VPS budget. Stop the api or set MEDIA_BATCH_GUARD=off.",
        },
        { status: 503 }
      )
    }
    console.warn(
      `[generate/images] WARNING: the API appears to be RUNNING (${url}) — proceeding with a small batch (set MEDIA_BATCH_GUARD=off to silence).`
    )
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const blocked = await guard()
    if (blocked) return blocked

    const body = await request.json().catch(() => ({}))
    // Cap the trickle-run size: this route is gated by the admin cookie but a
    // compromised/leaked session must not be able to rack up unbounded provider
    // cost in one request. Full runs go through the GitHub Actions workflow.
    const requested = typeof body?.limit === "number" ? body.limit : 3
    const limit = Math.min(Math.max(1, Math.floor(requested)), 100)
    const dryRun = body?.dryRun === true
    const res = await generateImageBatch({ limit, dryRun })
    return Response.json(res)
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "image generation failed" },
      { status: 500 }
    )
  }
}
