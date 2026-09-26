import { describe, expect, it } from "vitest"

import {
  assignRight,
  availableRight,
  buildAnswer,
  isComplete,
  scoreMatching,
  selectLeft,
  unpair,
  type Assignment,
} from "../src/matching"

const pairs = [
  { id: "p1", left: "hello", right: "hallo" },
  { id: "p2", left: "goodbye", right: "tschüss" },
  { id: "p3", left: "please", right: "bitte" },
  { id: "p4", left: "thanks", right: "danke" },
]

const done: Assignment = {
  p1: "hallo",
  p2: "tschüss",
  p3: "bitte",
  p4: "danke",
}

describe("selectLeft", () => {
  it("picks a row up", () => {
    expect(selectLeft(null, "p1")).toBe("p1")
  })

  it("puts down the row already held", () => {
    expect(selectLeft("p1", "p1")).toBeNull()
  })

  it("switches to another row", () => {
    expect(selectLeft("p1", "p2")).toBe("p2")
  })
})

describe("assignRight", () => {
  it("gives the held row its partner", () => {
    expect(assignRight({}, "p1", "hallo")).toEqual({ p1: "hallo" })
  })

  it("does nothing with no row held", () => {
    const before = { p1: "hallo" }
    expect(assignRight(before, null, "hallo")).toEqual(before)
  })

  it("takes a partner away from its previous row", () => {
    // The failure worth guarding: two rows claiming one right-hand item would
    // make the columns contradict each other and the answer unreadable.
    const after = assignRight({ p1: "hallo" }, "p2", "hallo")
    expect(after).toEqual({ p2: "hallo" })
    expect(Object.keys(after)).toHaveLength(1)
  })

  it("replaces a row's own partner", () => {
    const after = assignRight({ p1: "hallo" }, "p1", "guten tag")
    expect(after).toEqual({ p1: "guten tag" })
  })

  it("does not mutate the state it was given", () => {
    const before: Assignment = { p1: "hallo" }
    assignRight(before, "p1", "guten tag")
    expect(before).toEqual({ p1: "hallo" })
  })
})

describe("unpair", () => {
  it("releases a row", () => {
    const after = unpair(done, "p2")
    expect(after.p2).toBeUndefined()
    expect(after.p1).toBe("hallo")
  })

  it("leaves an unpaired row alone", () => {
    const before: Assignment = { p1: "hallo" }
    expect(unpair(before, "p2")).toEqual(before)
  })
})

describe("availableRight", () => {
  it("offers everything before any pairing", () => {
    expect(availableRight(pairs, {})).toHaveLength(4)
  })

  it("withholds what is already used", () => {
    const free = availableRight(pairs, { p1: "hallo" })
    expect(free).toHaveLength(3)
    expect(free).not.toContain("hallo")
  })

  it("offers nothing once every row is paired", () => {
    expect(availableRight(pairs, done)).toHaveLength(0)
  })
})

describe("isComplete", () => {
  it("is false on an empty pairing", () => {
    expect(isComplete(pairs, {})).toBe(false)
  })

  it("is false with one row missing", () => {
    const partial = { ...done }
    delete partial.p4
    expect(isComplete(pairs, partial)).toBe(false)
  })

  it("is true once every row has a partner", () => {
    expect(isComplete(pairs, done)).toBe(true)
  })

  it("is true when every row is paired to the wrong thing", () => {
    // Completion is about the learner's work being finished, not about it
    // being right. Grading decides that separately.
    const wrong: Assignment = {
      p1: "bitte",
      p2: "danke",
      p3: "hallo",
      p4: "tschüss",
    }
    expect(isComplete(pairs, wrong)).toBe(true)
  })
})

describe("buildAnswer", () => {
  it("withholds an answer while the question is unfinished", () => {
    expect(buildAnswer(pairs, { p1: "hallo" })).toBeNull()
  })

  it("keys the answer by pair id, not by position", () => {
    // The grader compares against pair ids. A left-hand item's place in the
    // list is a display detail and must not leak into the answer.
    const shuffled = [pairs[3], pairs[1], pairs[0], pairs[2]]
    expect(buildAnswer(shuffled, done)).toEqual(done)
  })

  it("carries through a deliberately wrong pairing intact", () => {
    const wrong: Assignment = {
      p1: "bitte",
      p2: "danke",
      p3: "hallo",
      p4: "tschüss",
    }
    expect(buildAnswer(pairs, wrong)).toEqual(wrong)
  })

  it("handles a two-pair question", () => {
    const small = pairs.slice(0, 2)
    expect(buildAnswer(small, { p1: "hallo", p2: "tschüss" })).toEqual({
      p1: "hallo",
      p2: "tschüss",
    })
  })
})

describe("scoreMatching", () => {
  const correct = {
    p1: "hallo",
    p2: "tschüss",
    p3: "bitte",
    p4: "danke",
  }

  it("is 1 for a complete and correct answer", () => {
    expect(scoreMatching(correct, { ...correct })).toBe(1)
  })

  it("is 0 for a complete and wrong answer", () => {
    expect(
      scoreMatching(correct, { p1: "bitte", p2: "danke", p3: "hallo", p4: "tschüss" })
    ).toBe(0)
  })

  it("gives partial credit", () => {
    expect(
      scoreMatching(correct, { p1: "hallo", p2: "tschüss", p3: "nope", p4: "danke" })
    ).toBe(0.75)
  })

  it("ignores the order the pairs were made in", () => {
    expect(
      scoreMatching(correct, { p4: "danke", p3: "bitte", p2: "tschüss", p1: "hallo" })
    ).toBe(1)
  })

  it("counts a missing pair as wrong", () => {
    expect(scoreMatching(correct, { p1: "hallo", p2: "tschüss" })).toBe(0.5)
  })

  it("cannot be inflated by extra keys", () => {
    expect(scoreMatching(correct, { ...correct, p5: "hallo", p6: "bitte" })).toBe(1)
  })

  it("is 0 for a missing, empty or non-object answer", () => {
    expect(scoreMatching(correct, undefined)).toBe(0)
    expect(scoreMatching(correct, null)).toBe(0)
    expect(scoreMatching(correct, "hallo")).toBe(0)
    expect(scoreMatching(correct, {})).toBe(0)
  })

  it("is 0 when there is nothing to match against", () => {
    expect(scoreMatching({}, { p1: "hallo" })).toBe(0)
    expect(scoreMatching(undefined, { p1: "hallo" })).toBe(0)
  })
})
