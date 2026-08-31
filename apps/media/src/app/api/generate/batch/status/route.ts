import { ghConfigured, latestMediaGenerateRun } from "@/lib/github-actions"

/**
 * Status surface for the dashboard trigger UI: poll this (e.g. every 15–30s
 * while the panel is open — human-paced internal tool) and disable the
 * "trigger batch" action while status === "in_progress". The workflow's own
 * concurrency group remains the real serialization layer; this is UX sugar.
 */
export async function GET() {
  if (!ghConfigured()) {
    return Response.json(
      {
        error: "GITHUB_NOT_CONFIGURED",
        message: "set GH_PAT / GH_REPO (Vercel env)",
      },
      { status: 503 }
    )
  }
  try {
    const run = await latestMediaGenerateRun()
    if (!run) {
      return Response.json({ status: "never_run" })
    }
    return Response.json(run)
  } catch (err) {
    return Response.json(
      {
        error: "GITHUB_UNREACHABLE",
        message: err instanceof Error ? err.message : "status failed",
      },
      { status: 502 }
    )
  }
}
