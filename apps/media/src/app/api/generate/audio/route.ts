import { NextRequest } from "next/server"
import { generateAudioBatch } from "@/lib/runner-audio"

export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    // Cap the trickle-run size (see generate/images/route.ts — same rationale:
    // protect provider cost if the admin session is ever leaked). Full runs go
    // through the GitHub Actions workflow instead.
    const requested = typeof body?.limit === "number" ? body.limit : 10
    const limit = Math.min(Math.max(1, Math.floor(requested)), 500)
    const dryRun = body?.dryRun === true
    const res = await generateAudioBatch({ limit, dryRun })
    return Response.json(res)
  } catch (err) {
    console.error("[generate/audio]", err)
    return Response.json({ error: "audio generation failed" }, { status: 500 })
  }
}
