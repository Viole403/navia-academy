const DEFAULT_HEALTH_URL = "http://localhost:8080/api/v1/health"
const GUARD_TIMEOUT_MS = 1500

/**
 * Mutual-exclusion preflight for batch generation.
 *
 * api and media batches share one VPS resource budget (each sized to ~90% CPU /
 * the RAM budget standalone) on the assumption they NEVER run concurrently:
 * the batch completes first, then the api starts and stays up. This guard makes
 * that assumption loud instead of silent — if the api appears to be running,
 * an accidental overlap at least becomes a deliberate decision.
 *
 * Any HTTP response counts as "api is up" (even a non-2xx — something is
 * serving); connection refused / timeout / DNS failure means it is not.
 *
 * Two layers:
 *   - checkApiRunning(): pure probe, no side effects — safe inside Next.js API
 *     routes where process.exit would kill the whole server.
 *   - guardApiNotRunningCli(): the original CLI behaviour on top of it —
 *       default                 warn loudly and continue
 *       MEDIA_BATCH_GUARD=strict refuse: process.exit(1)
 *       MEDIA_BATCH_GUARD=off    skip the check entirely (deliberate overlap)
 */

/** Probe the backend health endpoint. True when anything answered. */
export async function checkApiRunning(): Promise<boolean> {
  const url = process.env.MEDIA_API_HEALTH_URL || DEFAULT_HEALTH_URL
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GUARD_TIMEOUT_MS)
  try {
    await fetch(url, { signal: controller.signal })
    return true
  } catch {
    // Nothing answered the probe -> api is down -> sequential model holds.
    return false
  } finally {
    clearTimeout(timer)
  }
}

function warnOverlap(url: string): void {
  console.warn(
    [
      "",
      "WARNING: the API appears to be RUNNING (" + url + ").",
      "  api and media batches share one VPS budget (~90% CPU) and are sized",
      "  to never run concurrently. Overlap degrades both and pushes toward",
      "  the provider auto-suspend line (>95% sustained CPU).",
      "  Proceed only deliberately — or stop the api / set MEDIA_BATCH_GUARD=off.",
      "",
    ].join("\n")
  )
}

/**
 * CLI entrypoint wrapper — byte-for-byte the historical behaviour of the old
 * single-function guard. Route handlers must use checkApiRunning() directly
 * instead (process.exit here would take down a server process, which is fine
 * only because CLIs are short-lived processes).
 */
export async function guardApiNotRunningCli(): Promise<void> {
  const mode = (process.env.MEDIA_BATCH_GUARD ?? "").toLowerCase()
  if (mode === "off") return

  const url = process.env.MEDIA_API_HEALTH_URL || DEFAULT_HEALTH_URL
  if (!(await checkApiRunning())) return

  warnOverlap(url)
  if (mode === "strict") {
    console.error(
      "MEDIA_BATCH_GUARD=strict — refusing to start while the api is up."
    )
    process.exit(1)
  }
}
