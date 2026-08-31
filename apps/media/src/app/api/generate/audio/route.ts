import { NextRequest } from "next/server"
import { generateAudioBatch } from "@/lib/runner-audio"

export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const limit = typeof body?.limit === "number" ? body.limit : 10
    const dryRun = body?.dryRun === true
    const res = await generateAudioBatch({ limit, dryRun })
    return Response.json(res)
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "audio generation failed" },
      { status: 500 }
    )
  }
}
