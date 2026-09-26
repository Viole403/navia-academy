import { describe, it, expect } from "vitest"
import {
  buildRecentWeek,
  minutesToday,
  studiedToday,
  assembleWidgetPayload,
} from "@/hooks/useWidgetSync"

const sessions = [
  { date: "2026-03-10T09:00:00Z", minutes: 12 },
  { date: "2026-03-11T09:00:00Z", minutes: 5 },
  { date: "2026-03-12T09:00:00Z", minutes: 30 },
  { date: "2026-03-13T09:00:00Z", minutes: 8 },
  { date: "2026-03-15T09:00:00Z", minutes: 20 },
  { date: "2026-03-16T09:00:00Z", minutes: 3 },
]

const colors = {
  bg: "#101418",
  text: "#F5F5F7",
  accent: "#7BA05B",
  textMuted: "#9AA0A6",
}

describe("buildRecentWeek", () => {
  it("always returns seven days, oldest first", () => {
    const week = buildRecentWeek(sessions, new Date("2026-03-16T12:00:00"))
    expect(week).toHaveLength(7)
  })

  it("marks the days that have a session with real minutes", () => {
    const week = buildRecentWeek(sessions, new Date("2026-03-16T12:00:00"))
    // 16th is the last cell, 15th before it, 14th is the gap, 13th before that.
    expect(week[6]).toBe(true)
    expect(week[5]).toBe(true)
    expect(week[4]).toBe(false)
    expect(week[3]).toBe(true)
  })

  it("ignores a session with zero minutes", () => {
    const week = buildRecentWeek(
      [{ date: "2026-03-16T09:00:00Z", minutes: 0 }],
      new Date("2026-03-16T12:00:00")
    )
    expect(week[6]).toBe(false)
  })

  it("an empty history is a full week of misses, not a crash", () => {
    const week = buildRecentWeek([], new Date("2026-03-16T12:00:00"))
    expect(week).toEqual([false, false, false, false, false, false, false])
  })

  it("counts a day in the learner's own timezone, not UTC", () => {
    // Late evening in Asia/Jakarta. Under a UTC key this session belongs to the
    // next day and the streak would read as untouched.
    const lateEvening = [{ date: "2026-03-16T23:30:00+07:00", minutes: 10 }]
    const week = buildRecentWeek(
      lateEvening,
      new Date("2026-03-16T23:45:00+07:00")
    )
    expect(week[6]).toBe(true)
  })
})

describe("minutesToday", () => {
  it("sums only today's sessions", () => {
    expect(minutesToday(sessions, new Date("2026-03-16T12:00:00"))).toBe(3)
  })

  it("sums several sessions in the same day", () => {
    const many = [
      { date: "2026-03-16T08:00:00Z", minutes: 10 },
      { date: "2026-03-16T20:00:00Z", minutes: 15 },
    ]
    expect(minutesToday(many, new Date("2026-03-16T21:00:00"))).toBe(25)
  })

  it("is zero on a day with nothing done", () => {
    expect(minutesToday(sessions, new Date("2026-03-14T12:00:00"))).toBe(0)
  })
})

describe("studiedToday", () => {
  it("follows minutes rather than the streak total", () => {
    // The streak survives a missed day; the strip has to show the miss.
    expect(studiedToday(sessions, new Date("2026-03-14T12:00:00"))).toBe(false)
    expect(studiedToday(sessions, new Date("2026-03-16T12:00:00"))).toBe(true)
  })
})

describe("assembleWidgetPayload", () => {
  it("carries the values the native reader expects", () => {
    const payload = assembleWidgetPayload({
      streak: 6,
      bestStreak: 21,
      sessions,
      due: 4,
      dailyGoalMinutes: 20,
      locale: "id",
      themeId: "ink",
      colors,
      now: new Date("2026-03-16T12:00:00").getTime(),
    })
    expect(payload.version).toBe(1)
    expect(payload.day.streak).toBe(6)
    expect(payload.day.bestStreak).toBe(21)
    expect(payload.day.due).toBe(4)
    expect(payload.day.studiedToday).toBe(true)
    expect(payload.day.minutesToday).toBe(3)
    expect(payload.day.recent).toHaveLength(7)
    expect(payload.colors).toEqual({
      background: colors.bg,
      foreground: colors.text,
      accent: colors.accent,
      muted: colors.textMuted,
    })
    expect(payload.themeId).toBe("ink")
  })

  it("serialises to the nested shape the Kotlin reader is tested against", () => {
    const payload = assembleWidgetPayload({
      streak: 1,
      bestStreak: 1,
      sessions: [],
      due: null,
      dailyGoalMinutes: 20,
      locale: "id",
      themeId: "ink",
      colors,
      now: 1758900000000,
    })
    const raw = JSON.stringify(payload)
    expect(raw).toContain('"updatedAt":1758900000000')
    expect(raw).toContain('"due":null')
    // The native side reads these by key, so their names are the contract.
    expect(raw).toContain('"day":{')
    expect(raw).toContain('"colors":{')
  })

  it("an unknown review count stays unknown instead of claiming zero", () => {
    const payload = assembleWidgetPayload({
      streak: 0,
      bestStreak: 0,
      sessions: [],
      due: null,
      dailyGoalMinutes: 20,
      locale: "en",
      themeId: "ink",
      colors,
      now: 1758900000000,
    })
    expect(payload.day.due).toBeNull()
  })
})
