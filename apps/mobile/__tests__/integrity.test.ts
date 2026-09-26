import { describe, it, expect } from "vitest"

import {
  isLeaving,
  nextWarning,
  safeTally,
  WARNING_LIMIT,
} from "@/lib/integrity"

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

describe("isLeaving", () => {
  // One interruption is a sequence of states, not one state. Counting each step
  // reached the limit on a single swipe, which flagged a learner who had not
  // done anything.
  it("counts one departure for an iOS swipe that runs active → inactive → background", () => {
    const states = ["active", "inactive", "background"] as const
    const counted = states.filter(
      (s, i) => i > 0 && isLeaving(states[i - 1], s)
    )
    expect(counted).toHaveLength(1)
  })

  it("does not count the inactive step on its own", () => {
    expect(isLeaving("active", "inactive")).toBe(false)
  })

  it("does not count a notification banner that never leaves", () => {
    // Android produces inactive for a banner without the app being left.
    expect(isLeaving("active", "inactive")).toBe(false)
    expect(isLeaving("inactive", "active")).toBe(false)
  })

  it("counts entering the background", () => {
    expect(isLeaving("active", "background")).toBe(true)
    expect(isLeaving("inactive", "background")).toBe(true)
  })

  it("ignores a repeated background state", () => {
    // Some devices emit it more than once for one departure.
    expect(isLeaving("background", "background")).toBe(false)
  })

  it("counts a second, separate departure", () => {
    expect(isLeaving("background", "active")).toBe(false)
    expect(isLeaving("active", "background")).toBe(true)
  })

  it("treats unknown as a departure only when it reaches the background", () => {
    expect(isLeaving("unknown", "background")).toBe(true)
    expect(isLeaving("unknown", "active")).toBe(false)
  })
})

describe("safeTally", () => {
  it("passes a real tally through", () => {
    expect(safeTally(1)).toBe(1)
  })

  it("floors a negative value instead of carrying it", () => {
    // A negative tally would make the next leave jump past the limit.
    expect(safeTally(-5)).toBe(0)
  })

  it("drops a value that is not a number", () => {
    expect(safeTally(undefined)).toBe(0)
    expect(safeTally(NaN)).toBe(0)
    expect(safeTally(Infinity)).toBe(0)
  })

  it("rounds a fractional tally down", () => {
    expect(safeTally(1.9)).toBe(1)
  })
})
