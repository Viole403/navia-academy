import { describe, it, expect } from "@jest/globals"

import {
  ackWarnings,
  failWarnings,
  initialSync,
  takeWarnings,
  type WarningSync,
} from "@/lib/tabWarnings"

/**
 * The endpoint adds what it is given rather than replacing it, so these pin the
 * property that actually matters: the server's tally equals the number of
 * warnings the learner accrued, and never more. The bug these guard was a
 * single tab switch turning into a flagged learner on the next answer.
 */

/**
 * Replays a session. A failed request is taken to mean the server did not
 * receive it, which is what a failure normally is; `storedButLost` models the
 * other case, where the write landed and only the response was lost.
 */
function run(
  steps: { total: number; ok: boolean; storedButLost?: boolean }[]
): {
  serverTally: number
  sent: WarningSync
} {
  let sync = initialSync()
  let serverTally = 0
  for (const step of steps) {
    const taken = takeWarnings(sync, step.total)
    if (taken.delta === 0) continue
    if (step.ok || step.storedButLost) serverTally += taken.delta
    sync = step.ok
      ? ackWarnings(taken.sync, step.total)
      : failWarnings(taken.sync)
  }
  return { serverTally, sent: sync }
}

describe("takeWarnings", () => {
  it("sends nothing when the tally has not moved", () => {
    const taken = takeWarnings(initialSync(), 0)
    expect(taken.delta).toBe(0)
  })

  it("sends the difference between the tally and what the server holds", () => {
    const taken = takeWarnings(initialSync(3), 5)
    expect(taken.delta).toBe(2)
  })

  it("sends zero when there is nothing outstanding", () => {
    expect(takeWarnings(initialSync(5), 5).delta).toBe(0)
  })
})

describe("acknowledging", () => {
  it("advances the point the server has been told", () => {
    const taken = takeWarnings(initialSync(), 1)
    const acked = ackWarnings(taken.sync, 1)
    expect(takeWarnings(acked, 1).delta).toBe(0)
  })

  it("sends only the new warning after an acknowledgement", () => {
    // The exact shape of the original bug: warning one acknowledged, then a
    // second warning, then an unrelated answer.
    const first = ackWarnings(takeWarnings(initialSync(), 1).sync, 1)
    const second = takeWarnings(first, 2)
    expect(second.delta).toBe(1)
    const after = takeWarnings(ackWarnings(second.sync, 2), 2)
    expect(after.delta).toBe(0)
  })
})

describe("failing", () => {
  it("retries the same batch rather than recomputing", () => {
    const taken = takeWarnings(initialSync(4), 6)
    expect(taken.delta).toBe(2)
    const failed = failWarnings(taken.sync)
    // A new warning arrived while the request was in flight. The retry must
    // still be the batch that failed, not the new total — recomputing here is
    // what turns a failure into a double count.
    expect(takeWarnings(failed, 9).delta).toBe(2)
  })

  it("does not lose the warning", () => {
    const taken = takeWarnings(initialSync(), 1)
    const retried = takeWarnings(failWarnings(taken.sync), 1)
    expect(retried.delta).toBe(1)
  })
})

describe("a whole session", () => {
  it("counts one leave once, however many answers follow", () => {
    // One warning, then three answers. The server must hold 1, not 4.
    const { serverTally } = run([
      { total: 1, ok: true },
      { total: 1, ok: true },
      { total: 1, ok: true },
      { total: 1, ok: true },
    ])
    expect(serverTally).toBe(1)
  })

  it("stays level with the warning threshold after a resume", () => {
    // Resuming restores the tally the server already holds, so the resumed
    // count is not re-sent as a fresh batch.
    let sync = initialSync(2)
    const taken = takeWarnings(sync, 2)
    expect(taken.delta).toBe(0)
    sync = ackWarnings(taken.sync, 2)
    expect(takeWarnings(sync, 3).delta).toBe(1)
  })

  it("ends level with the learner's own count", () => {
    const { serverTally } = run([
      { total: 1, ok: true },
      { total: 1, ok: false },
      { total: 1, ok: true },
      { total: 2, ok: true },
      { total: 2, ok: false },
      { total: 3, ok: true },
    ])
    expect(serverTally).toBe(3)
  })

  it("stays exact when requests simply fail", () => {
    // A failure the server never saw is retried as the same batch, so the tally
    // still lands on the learner's own count.
    const { serverTally } = run([
      { total: 1, ok: false },
      { total: 1, ok: false },
      { total: 1, ok: true },
      { total: 2, ok: false },
      { total: 2, ok: true },
    ])
    expect(serverTally).toBe(2)
  })

  it("can over-count by one when the write landed but the reply was lost", () => {
    // The deliberate trade. Delivery is at-least-once, because the alternative
    // is dropping a warning, and a warning that goes missing is the whole
    // mechanism failing silently. An extra warning is the safer error to make:
    // it only costs a learner one more chance before the tally is noticed,
    // whereas a lost one is invisible.
    const { serverTally } = run([
      { total: 1, ok: false, storedButLost: true },
      { total: 1, ok: true },
    ])
    expect(serverTally).toBe(2)
  })

  it("does not flag a learner who leaves once and answers", () => {
    const { serverTally } = run([
      { total: 1, ok: true },
      { total: 1, ok: true },
    ])
    // The threshold is two.
    expect(serverTally).toBeLessThan(2)
  })
})
