/**
 * Thin GitHub Actions trigger/status client for the media-generate workflow.
 *
 * The dashboard NEVER runs generation itself — it only dispatches the same
 * workflow the VPS CLI / GitHub UI use, and polls run status. Auth = a
 * fine-grained PAT with single-repo "Actions: read & write" scope.
 *
 * Env (Vercel project settings for apps/media):
 *   GH_PAT       — the PAT token
 *   GH_REPO      — "owner/repo"
 *   GH_WORKFLOW  — workflow file name (default: media-generate.yml)
 *   GH_REF       — branch to dispatch against (default: main)
 */

export interface DispatchInputs {
  scope: "audio" | "images" | "manifest" | "all"
  engine?: string
}

export function ghConfigured(): boolean {
  return Boolean(process.env.GH_PAT && process.env.GH_REPO)
}

function ghBase(): { api: string; headers: Record<string, string> } {
  const token = process.env.GH_PAT ?? ""
  return {
    api: "https://api.github.com",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
  }
}

function workflowUrl(kind: "dispatches" | "runs"): string {
  const repo = (process.env.GH_REPO ?? "").replace(/\/+$/, "")
  const workflow = process.env.GH_WORKFLOW ?? "media-generate.yml"
  return `${ghBase().api}/repos/${repo}/actions/workflows/${workflow}/${kind}`
}

/** POST /dispatches — GitHub answers 204 (empty) when the run is queued. */
export async function dispatchMediaGenerate(
  inputs: DispatchInputs
): Promise<{ ok: boolean; status: number; message?: string }> {
  if (!ghConfigured()) {
    return {
      ok: false,
      status: 503,
      message: "GitHub not configured (set GH_PAT / GH_REPO)",
    }
  }
  const { headers } = ghBase()
  const res = await fetch(workflowUrl("dispatches"), {
    method: "POST",
    headers,
    body: JSON.stringify({
      ref: process.env.GH_REF ?? "main",
      inputs: {
        scope: inputs.scope,
        upload: "yes",
        engine: inputs.engine ?? "",
      },
    }),
    signal: AbortSignal.timeout(15_000),
  })
  if (res.status === 204) return { ok: true, status: 204 }
  return {
    ok: false,
    status: res.status,
    message: (await res.text()).slice(0, 300),
  }
}

export interface LatestRun {
  status: string
  conclusion: string | null
  created_at: string
  html_url: string
  run_number: number
}

/** Latest workflow run, or null when the workflow has never run. */
export async function latestMediaGenerateRun(): Promise<LatestRun | null> {
  if (!ghConfigured()) return null
  const res = await fetch(`${workflowUrl("runs")}?per_page=1`, {
    headers: ghBase().headers,
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`GitHub runs API ${res.status}`)
  const body = (await res.json()) as {
    workflow_runs?: {
      status: string
      conclusion: string | null
      created_at: string
      html_url: string
      run_number: number
    }[]
  }
  const run = body.workflow_runs?.[0]
  if (!run) return null
  return {
    status: run.status,
    conclusion: run.conclusion,
    created_at: run.created_at,
    html_url: run.html_url,
    run_number: run.run_number,
  }
}
