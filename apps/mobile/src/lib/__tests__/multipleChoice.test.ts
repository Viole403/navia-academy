import { describe, expect, it } from "vitest"

import { optionKey, optionViews, tally } from "../multipleChoice"

const q = (id: string, correct: string) => ({
  id,
  type: "multiple-choice",
  prompt: "p",
  options: [
    { id: "a", label: "one" },
    { id: "b", label: "two" },
    { id: "c", label: "three" },
  ],
  correct,
})

describe("optionKey", () => {
  it("uses the content id", () => {
    expect(optionKey({ id: "b", label: "two" }, 0)).toBe("b")
  })

  it("falls back to the position when the id is missing", () => {
    expect(optionKey({ label: "x" }, 2)).toBe("C")
  })
})

describe("optionViews", () => {
  it("leaves every option idle before an answer", () => {
    const v = optionViews(q("q1", "b"), null)
    expect(v.map((o) => o.state)).toEqual(["idle", "idle", "idle"])
  })

  it("marks the right one and dims the rest on a correct answer", () => {
    const v = optionViews(q("q1", "b"), "b")
    expect(v.map((o) => o.state)).toEqual(["dim", "correct", "dim"])
  })

  it("marks the chosen one wrong and still shows the right one", () => {
    const v = optionViews(q("q1", "b"), "a")
    expect(v.map((o) => o.state)).toEqual(["wrong", "correct", "dim"])
  })

  it("carries the label through for display", () => {
    expect(optionViews(q("q1", "a"), null).map((o) => o.label)).toEqual([
      "one",
      "two",
      "three",
    ])
  })

  it("survives a question with no options", () => {
    const v = optionViews({ options: [], correct: "a" }, "a")
    expect(v).toEqual([])
  })

  it("does not invent a correct option when the content omits one", () => {
    // Every option reads wrong or dim rather than one being shown as right.
    const v = optionViews({ options: [{ id: "a", label: "x" }] }, "a")
    expect(v[0].state).toBe("wrong")
  })
})

describe("tally", () => {
  it("counts nothing before any answer", () => {
    expect(tally([q("q1", "a"), q("q2", "b")], {})).toEqual({
      answered: 0,
      correct: 0,
    })
  })

  it("counts answered and correct separately", () => {
    const r = tally([q("q1", "a"), q("q2", "b"), q("q3", "c")], {
      q1: "a",
      q2: "c",
    })
    expect(r).toEqual({ answered: 2, correct: 1 })
  })

  it("does not count the same question twice", () => {
    // The map is keyed by id, so a later re-render cannot inflate the count
    // that decides how much study time to log.
    const r = tally([q("q1", "a")], { q1: "a" })
    expect(r.answered).toBe(1)
  })

  it("ignores answers to questions that are not present", () => {
    const r = tally([q("q1", "a")], { q1: "a", qX: "a" })
    expect(r.answered).toBe(1)
  })

  it("handles an empty question list", () => {
    expect(tally([], { q1: "a" })).toEqual({ answered: 0, correct: 0 })
  })
})
