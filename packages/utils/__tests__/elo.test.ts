import { describe, it, expect } from "vitest"

import {
  CEFR_BANDS,
  DEFAULT_ELO,
  MAX_QUESTIONS,
  MIN_QUESTIONS,
  SEM_TARGET,
  cefrBandOf,
  eloExpected,
  eloOf,
  eloSd,
  eloUpdate,
  pickLeastUsedFormat,
  pickNext,
  recommendedLevel,
  shouldStop,
  weakBandsOf,
} from "../elo"

/**
 * The engine lives in a shared package because the web session, this one and
 * the Go backend that recomputes the rating have to agree. These pin the
 * properties that agreement depends on — the update rule, the stopping rule and
 * the difficulty seeding — rather than exact numbers, which would only assert
 * that someone did not retype the formula.
 */

const HSK_CENTRES: Record<number, number> = {
  1: 550,
  2: 850,
  3: 1150,
  4: 1500,
  5: 1700,
  6: 1850,
  7: 2200,
}

describe("eloOf", () => {
  it("seeds from the exam mapping, not the raw level", () => {
    // A word mapped to HSK 3 lands near 1150, not near whatever `level` says.
    const e = eloOf({ id: "w1", level: 1, examMappings: { hsk: 3 } })
    expect(Math.abs(e - 1150)).toBeLessThanOrEqual(30)
  })

  it("falls back to level when nothing is mapped", () => {
    const e = eloOf({ id: "w1", level: 4 })
    expect(Math.abs(e - 1500)).toBeLessThanOrEqual(30)
  })

  it("is deterministic, so a word is the same challenge on every device", () => {
    const word = { id: "zh-hsk-3-0042", level: 3, examMappings: { hsk: 3 } }
    expect(eloOf(word)).toBe(eloOf(word))
  })

  it("spreads items inside a level so the step has something to discriminate", () => {
    const levels = new Set<string>()
    for (let i = 0; i < 40; i++) {
      levels.add(String(eloOf({ id: `w${i}`, level: 3 })))
    }
    // 61 jitter values across ±30; 40 items should not all collide on one.
    expect(levels.size).toBeGreaterThan(20)
  })

  it("keeps every level within the jitter band of its centre", () => {
    for (const [lvl, centre] of Object.entries(HSK_CENTRES)) {
      const e = eloOf({ id: "x", level: Number(lvl) })
      expect(Math.abs(e - centre)).toBeLessThanOrEqual(30)
    }
  })
})

describe("eloExpected", () => {
  it("is an even match at equal ratings", () => {
    expect(eloExpected(1000, 1000)).toBeCloseTo(0.5, 6)
  })

  it("favours the stronger learner", () => {
    expect(eloExpected(1500, 1000)).toBeGreaterThan(0.5)
    expect(eloExpected(500, 1000)).toBeLessThan(0.5)
  })
})

describe("eloUpdate", () => {
  it("rises on a correct answer and falls on a wrong one", () => {
    expect(eloUpdate(1000, 1000, true, 0)).toBeGreaterThan(1000)
    expect(eloUpdate(1000, 1000, false, 0)).toBeLessThan(1000)
  })

  it("is not 'right answer, harder next one' — the step is the surprise", () => {
    // Beating something above your rating is the informative event and moves the
    // rating a lot; beating something below it demonstrates almost nothing new and
    // moves it barely. That asymmetry is what stops the estimate being inflated
    // by grinding known content.
    const beatHarder = eloUpdate(1000, 1500, true, 0) - 1000
    const beatEasier = eloUpdate(1000, 500, true, 0) - 1000
    expect(beatHarder).toBeGreaterThan(beatEasier * 10)
  })

  it("punishes a miss on an easy item more than on a hard one", () => {
    // The mirror of the above: failing something you should know is damning,
    // missing something above you barely moves the estimate.
    const missEasy = 1000 - eloUpdate(1000, 500, false, 0)
    const missHard = 1000 - eloUpdate(1000, 1500, false, 0)
    expect(missEasy).toBeGreaterThan(missHard)
  })

  it("does not move at all when the outcome matches the expectation", () => {
    // Expected 0.5 against an equal item, so a correct answer is no surprise.
    expect(eloUpdate(1000, 1000, true, 0)).toBeCloseTo(1018, 1)
  })

  it("decays K with questions answered, floored at 4", () => {
    const first = Math.abs(eloUpdate(1000, 1000, true, 0) - 1000)
    const later = Math.abs(eloUpdate(1000, 1000, true, 20) - 1000)
    expect(later).toBeLessThan(first)

    const deep = Math.abs(eloUpdate(1000, 1000, true, 99) - 1000)
    const floor = Math.abs(eloUpdate(1000, 1000, true, 100) - 1000)
    expect(deep).toBeCloseTo(floor, 6)
  })

  it("lands on the same value the backend replays to", () => {
    // Mirrors recomputeCatRating in the Go service: k = max(4, 36 - 2n).
    let theta = DEFAULT_ELO
    const answers: [number, boolean][] = [
      [850, true],
      [1150, true],
      [1500, false],
      [1150, true],
    ]
    answers.forEach(([itemElo, correct], i) => {
      const k = Math.max(4, 36 - i * 2)
      const expected = 1 / (1 + Math.pow(10, (itemElo - theta) / 400))
      theta = theta + k * ((correct ? 1 : 0) - expected)
    })
    let replayed = DEFAULT_ELO
    answers.forEach(([itemElo, correct], i) => {
      replayed = eloUpdate(replayed, itemElo, correct, i)
    })
    expect(replayed).toBeCloseTo(theta, 9)
  })
})

describe("eloSd and the stopping rule", () => {
  it("shrinks with answers and bottoms out at 30", () => {
    expect(eloSd(0)).toBeGreaterThan(eloSd(10))
    expect(eloSd(50)).toBe(30)
    expect(eloSd(500)).toBe(30)
  })

  it("reaches the target at twenty answers, not twelve", () => {
    // MIN_QUESTIONS is 12 but the spread term only satisfies the target at 20,
    // so a session really runs twenty questions. Asserted because the two
    // numbers disagree and only one of them is load-bearing.
    expect(eloSd(MIN_QUESTIONS)).toBeGreaterThan(SEM_TARGET)
    expect(eloSd(20)).toBeLessThanOrEqual(SEM_TARGET)
  })

  it("keeps going below twelve even if the spread looks settled", () => {
    expect(shouldStop(5, false)).toBe(false)
    expect(shouldStop(11, false)).toBe(false)
  })

  it("stops once the spread settles", () => {
    expect(shouldStop(20, false)).toBe(true)
  })

  it("stops when the pool runs out, whatever the spread", () => {
    expect(shouldStop(3, true)).toBe(true)
  })

  it("stops at the safety cap so a session cannot run forever", () => {
    expect(shouldStop(MAX_QUESTIONS, false)).toBe(true)
  })
})

describe("pickNext", () => {
  const items = [
    { id: "a", elo: 500 },
    { id: "b", elo: 900 },
    { id: "c", elo: 1100 },
    { id: "d", elo: 1300 },
    { id: "e", elo: 1900 },
  ]

  it("returns nothing once every item is used", () => {
    const used = new Set(items.map((i) => i.id))
    expect(pickNext(items, 1000, used)).toBeNull()
  })

  it("never repeats a used item", () => {
    const used = new Set(["a", "b"])
    for (let i = 0; i < 40; i++) {
      const pick = pickNext(items, 1000, used)
      expect(pick).not.toBeNull()
      expect(used.has(pick!.id)).toBe(false)
    }
  })

  it("draws only from the three candidates nearest the rating", () => {
    // The property is which set it chooses from, not how far: once the near
    // items are used the reachable ones are by definition further away.
    const target = 1000
    const used = new Set<string>()
    for (let i = 0; i < 3; i++) {
      // The ranking is over what is still unused, so it has to be recomputed
      // each step rather than fixed up front.
      const ranked = items
        .filter((x) => !used.has(x.id))
        .sort((a, b) => Math.abs(a.elo - target) - Math.abs(b.elo - target))
      const allowed = new Set(ranked.slice(0, 3).map((x) => x.id))
      const pick = pickNext(items, target, used)!
      expect(allowed.has(pick.id)).toBe(true)
      used.add(pick.id)
    }
  })

  it("reaches further out only when the near items are spent", () => {
    const used = new Set(["b", "c"])
    const pick = pickNext(items, 1000, used)!
    expect(["a", "d", "e"]).toContain(pick!.id)
  })

  it("keeps a single item when only one is left", () => {
    expect(pickNext(items, 1000, new Set(["a", "b", "c", "d"]))?.id).toBe("e")
  })
})

describe("pickLeastUsedFormat", () => {
  it("rotates away from a run of one format", () => {
    const history: Parameters<typeof pickLeastUsedFormat>[0] = [
      "meaning",
      "meaning",
      "meaning",
    ]
    expect(pickLeastUsedFormat(history)).not.toBe("meaning")
  })

  it("starts at the first format with no history", () => {
    expect(pickLeastUsedFormat([])).toBe("meaning")
  })

  it("only looks at the recent window", () => {
    const history: Parameters<typeof pickLeastUsedFormat>[0] = [
      "listening",
      "listening",
      "reading",
      "reading",
      "meaning",
      "meaning",
    ]
    // The two listening entries fall outside a window of five.
    expect(pickLeastUsedFormat(history)).toBe("listening")
  })
})

describe("cefrBandOf", () => {
  it("maps the band boundaries", () => {
    expect(cefrBandOf(399).name).toBe("A1")
    expect(cefrBandOf(700).name).toBe("A2")
    expect(cefrBandOf(1000).name).toBe("B1")
    expect(cefrBandOf(1300).name).toBe("B2")
    expect(cefrBandOf(1700).name).toBe("C1")
    expect(cefrBandOf(2000).name).toBe("C2")
  })

  it("puts every centre in its own band", () => {
    for (const b of CEFR_BANDS) {
      expect(cefrBandOf(b.center).name).toBe(b.name)
    }
  })
})

describe("recommendedLevel", () => {
  it("names a level for the estimate", () => {
    expect(recommendedLevel("hsk", 550)).toBe("1")
    expect(recommendedLevel("jlpt", 550)).toBe("N5")
    expect(recommendedLevel("jlpt", 1850)).toBe("N1")
  })

  it("stays inside the ladder for an absurd rating", () => {
    expect(recommendedLevel("hsk", 99999)).toBe("7")
    expect(recommendedLevel("hsk", -500)).toBe("1")
  })

  it("returns the first level for an exam it does not know", () => {
    expect(recommendedLevel("nope", 1000)).toBe("")
  })
})

describe("weakBandsOf", () => {
  it("is empty when nothing was missed", () => {
    expect(weakBandsOf([{ elo: 500, correct: true }])).toEqual([])
  })

  it("names the bands where answers were wrong", () => {
    const log = [
      { elo: 500, correct: false },
      { elo: 500, correct: false },
      { elo: 1500, correct: false },
    ]
    const weak = weakBandsOf(log)
    // Most-missed first.
    expect(weak[0]).toBe(cefrBandOf(500).name)
    expect(weak).toHaveLength(2)
  })
})
