/**
 * Deciding how many tab warnings to send, and when they have landed.
 *
 * The session endpoint adds the count it receives to the one it already holds,
 * because it cannot see the browser tab itself and has to trust the client for
 * the difference. Sending the running total instead of the difference made
 * every answer re-add the warnings already recorded, so a learner who left the
 * tab once was flagged on their next answer.
 *
 * A send that fails is not forgotten and is not resent from scratch — it is
 * retried as the same batch. Forgetting it loses a warning, which is the
 * mechanism failing, and resending from scratch counts warnings the server
 * already has, which is the failure this file exists to remove.
 */

/** A batch of warnings in flight, or the point the server has been told up to. */
export type WarningSync =
  | { kind: "idle"; sent: number }
  | { kind: "pending"; sent: number; batch: number }

export function initialSync(alreadyOnServer = 0): WarningSync {
  return { kind: "idle", sent: alreadyOnServer }
}

/**
 * Take the warnings the server has not been told about.
 *
 * Returns zero when there is nothing to say, so a caller can skip the request
 * entirely rather than sending a no-op. A batch already in flight is returned
 * unchanged — that is the retry path, and it must not be recomputed, or a
 * failure would escalate into a double count.
 */
export function takeWarnings(
  sync: WarningSync,
  total: number
): {
  sync: WarningSync
  delta: number
} {
  if (sync.kind === "pending") {
    return { sync, delta: sync.batch }
  }
  const unsent = total - sync.sent
  if (unsent <= 0) return { sync, delta: 0 }
  return {
    sync: { kind: "pending", sent: sync.sent, batch: unsent },
    delta: unsent,
  }
}

/** The request landed. The server now holds everything up to `total`. */
export function ackWarnings(sync: WarningSync, total: number): WarningSync {
  return { kind: "idle", sent: total }
}

/**
 * The request failed. Nothing changes, so the next attempt carries the same
 * batch again.
 */
export function failWarnings(sync: WarningSync): WarningSync {
  return sync
}
