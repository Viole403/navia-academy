import { describe, expect, it } from "vitest"

import {
  buildWidgetPayload,
  widgetGoalProgress,
  widgetHeadline,
  widgetMilestone,
  widgetMood,
} from "@/lib/widget"

/**
 * A widget draws whatever this payload says, with no way to check it. So the
 * rules about what counts, and about what a streak means, live here where they
 * can be tested — including the one that matters most: a number must never sit
 * above a day with nothing on it.
 */

const base = {
  streak: 12,
  bestStreak: 30,
  studiedToday: true,
  due: 8,
  minutesToday: 15,
  dailyGoalMinutes: 20,
  recent: [true, true, false, true, true, true, true],
  locale: "id",
  themeId: "materialYou",
  colors: {
    bg: "#101014",
    text: "#F2F2F5",
    accent: "#E34A5F",
    textMuted: "#8A8A93",
  },
  now: 1_700_000_000_000,
}

describe("buildWidgetPayload", () => {
  it("keeps a well-formed day as it is", () => {
    const p = buildWidgetPayload(base)
    expect(p.version).toBe(1)
    expect(p.day.streak).toBe(12)
    expect(p.day.due).toBe(8)
    expect(p.updatedAt).toBe(base.now)
  })

  it("carries the resolved theme so the widget matches it", () => {
    // The widget cannot derive a Material You palette — that needs the same
    // native module this app already uses — so the colours travel with the
    // payload and the widget obeys whatever theme is active.
    const p = buildWidgetPayload(base)
    expect(p.themeId).toBe("materialYou")
    expect(p.colors.accent).toBe("#E34A5F")
    expect(p.colors.background).toBe("#101014")
  })

  it("will not show a streak above a day with nothing studied", () => {
    // The one thing a learner would rightly call a lie: "12 day streak" while
    // today is empty.
    const p = buildWidgetPayload({ ...base, studiedToday: false, streak: 0 })
    expect(p.day.streak).toBe(0)
    expect(p.day.studiedToday).toBe(false)
  })

  it("drops a negative or fractional count", () => {
    const p = buildWidgetPayload({ ...base, streak: -5, bestStreak: 2.7 })
    expect(p.day.streak).toBe(0)
    expect(p.day.bestStreak).toBe(2)
  })

  it("keeps an unknown due count unknown rather than guessing zero", () => {
    // Zero would read as "nothing to review", which is a claim, not a gap.
    expect(buildWidgetPayload({ ...base, due: null }).day.due).toBeNull()
    expect(buildWidgetPayload({ ...base, due: undefined }).day.due).toBeNull()
  })

  it("pads the week strip to seven days and only accepts true", () => {
    const p = buildWidgetPayload({ ...base, recent: [true, 1 as never, true] })
    expect(p.day.recent).toHaveLength(7)
    expect(p.day.recent.slice(0, 3)).toEqual([true, false, true])
  })

  it("never allows a goal of zero, which would divide by nothing", () => {
    expect(
      buildWidgetPayload({ ...base, dailyGoalMinutes: 0 }).day.dailyGoalMinutes
    ).toBe(1)
  })

  it("falls back to a locale when given an empty one", () => {
    expect(buildWidgetPayload({ ...base, locale: "" }).locale).toBe("en")
  })
})

describe("widgetMood", () => {
  const day = (
    over: Partial<ReturnType<typeof buildWidgetPayload>["day"]>
  ) => ({
    streak: 5,
    bestStreak: 5,
    studiedToday: false,
    due: null,
    minutesToday: 0,
    dailyGoalMinutes: 20,
    recent: [],
    ...over,
  })

  it("is empty on a fresh install", () => {
    expect(widgetMood(day({ streak: 0 }))).toBe("empty")
  })

  it("celebrates once the day is done", () => {
    expect(widgetMood(day({ studiedToday: true }))).toBe("celebrate")
  })

  it("is at risk when a live streak has not been touched today", () => {
    expect(widgetMood(day({ streak: 5 }))).toBe("atRisk")
  })

  it("is broken only when there is no streak left to protect", () => {
    expect(widgetMood(day({ streak: 0, studiedToday: false }))).toBe("empty")
  })
})

describe("widgetHeadline", () => {
  const p = (over: Partial<ReturnType<typeof buildWidgetPayload>["day"]>) =>
    buildWidgetPayload({ ...base, ...over })

  it("asks for a start when there is nothing yet", () => {
    expect(widgetHeadline(p({ streak: 0, studiedToday: false }))).toBe(
      "Start a streak"
    )
  })

  it("points at the review pile when the day is already done", () => {
    expect(widgetHeadline(p({ studiedToday: true, due: 8 }))).toBe(
      "8 to review"
    )
  })

  it("confirms a finished day with nothing pending", () => {
    expect(widgetHeadline(p({ studiedToday: true, due: 0 }))).toBe(
      "Done for today"
    )
  })

  it("warns when a live streak is about to go", () => {
    expect(
      widgetHeadline(p({ studiedToday: false, streak: 12, due: null }))
    ).toBe("12 at risk")
  })
})

describe("widgetMilestone", () => {
  it("marks the round numbers worth celebrating", () => {
    expect(widgetMilestone(7)).toBe(7)
    expect(widgetMilestone(30)).toBe(30)
    expect(widgetMilestone(100)).toBe(100)
    expect(widgetMilestone(365)).toBe(365)
  })

  it("stays quiet on an ordinary day", () => {
    expect(widgetMilestone(13)).toBeNull()
    expect(widgetMilestone(0)).toBeNull()
  })
})

describe("widgetGoalProgress", () => {
  it("is the share of the goal reached, capped at one", () => {
    expect(
      widgetGoalProgress({ minutesToday: 10, dailyGoalMinutes: 20 } as never)
    ).toBeCloseTo(0.5)
    expect(
      widgetGoalProgress({ minutesToday: 40, dailyGoalMinutes: 20 } as never)
    ).toBe(1)
  })

  it("is zero rather than a division by nothing", () => {
    expect(
      widgetGoalProgress({ minutesToday: 5, dailyGoalMinutes: 0 } as never)
    ).toBe(0)
  })
})
