import { describe, it, expect } from "vitest"

import { nextWarning, WARNING_LIMIT } from "@/lib/integrity"

/**
 * The tally decides whether a learner's result counts, so the counting rule is
 * pinned here rather than through a renderer: this package has no DOM and no
 * testing-library, and the arithmetic is the part with a wrong answer in it.
 */

describe("WARNING_LIMIT", () => {
  it("matches the threshold the server and the web client use", () => {
    expect(WARNING_LIMIT).toBe(2)
  })
})

describe("nextWarning", () => {
  it("moves once and stops at the limit", () => {
    expect(nextWarning(0)).toEqual({ total: 1, changed: true })
    expect(nextWarning(1)).toEqual({ total: 2, changed: true })
    expect(nextWarning(2)).toEqual({ total: 2, changed: false })
    expect(nextWarning(9)).toEqual({ total: 9, changed: false })
  })

  it("does not flag on the first warning", () => {
    // Two is the threshold, so one leave is a question, not a verdict.
    expect(nextWarning(0).total).toBeLessThan(WARNING_LIMIT)
  })

  it("ignores a negative tally from the server", () => {
    // A bad value must not become extra warnings on the next leave.
    expect(nextWarning(-3)).toEqual({ total: 1, changed: true })
    expect(nextWarning(-1, 0)).toEqual({ total: 0, changed: false })
  })

  it("respects a custom limit", () => {
    expect(nextWarning(0, 1)).toEqual({ total: 1, changed: true })
    expect(nextWarning(1, 1)).toEqual({ total: 1, changed: false })
    expect(nextWarning(0, 5).total).toBe(1)
  })

  it("never exceeds the limit however many times it is called", () => {
    let total = 0
    for (let i = 0; i < 50; i++) {
      total = nextWarning(total).total
    }
    expect(total).toBe(WARNING_LIMIT)
  })
})
