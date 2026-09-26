import { describe, it, expect } from "vitest"

import { generateStudyTasks, type TaskPlannerInput } from "../taskPlanner"
import type {
  AssessmentAttempt,
  SrsCard,
  StudySession,
  StudyTask,
} from "@/types/api"

const TODAY = "2026-09-26"

/** Echoes the key so assertions can read as the rule that fired. */
const t = (key: string, vars?: Record<string, string | number>) =>
  vars ? `${key}:${JSON.stringify(vars)}` : key

const base: TaskPlannerInput = {
  t: t as TaskPlannerInput["t"],
  srs: [],
  attempts: [],
  sessions: [],
  dailyGoalMin: 20,
  activeExam: "hsk",
  language: "zh",
  existing: [],
  today: TODAY,
}

function card(over: Partial<SrsCard> = {}): SrsCard {
  return {
    id: "c1",
    user_id: "u1",
    item_id: "w1",
    kind: "word",
    mastery: 10,
    interval: 1,
    ease: 2.5,
    due_date: TODAY,
    total_reviews: 0,
    correct_streak: 0,
    ...over,
  }
}

function attempt(over: Partial<AssessmentAttempt> = {}): AssessmentAttempt {
  return {
    assessmentId: "hsk-3",
    score: 40,
    startedAt: "2026-09-20T10:00:00Z",
    finishedAt: "2026-09-20T10:30:00Z",
    ...over,
  }
}

function session(minutes: number, date = TODAY): StudySession {
  return { id: "s1", user_id: "u1", date, minutes, xp: 10 }
}

function task(over: Partial<StudyTask> = {}): StudyTask {
  return {
    id: "t1",
    title: "existing",
    description: "",
    skill: "vocabulary",
    type: "review",
    dueDate: TODAY,
    estimatedMin: 10,
    priority: "medium",
    status: "pending",
    createdAt: "2026-09-20T00:00:00Z",
    language: "zh",
    ...over,
  }
}

const routes = (tasks: StudyTask[]) => tasks.map((x) => x.linkedRoute)

describe("due reviews", () => {
  it("proposes nothing when the queue is empty", () => {
    expect(generateStudyTasks(base)).not.toContainEqual(
      expect.objectContaining({ linkedRoute: "/review" })
    )
  })

  it("counts a card due today", () => {
    const out = generateStudyTasks({ ...base, srs: [card()] })
    const review = out.find((x) => x.linkedRoute === "/review")
    expect(review?.title).toBe('tasks.gen.reviewTitle:{"n":1}')
  })

  it("ignores a card due tomorrow", () => {
    const out = generateStudyTasks({
      ...base,
      srs: [card({ due_date: "2026-09-27" })],
    })
    expect(routes(out)).not.toContain("/review")
  })

  it("flags high priority and names the overdue count", () => {
    const out = generateStudyTasks({
      ...base,
      srs: [card({ due_date: "2026-09-20" }), card({ id: "c2" })],
    })
    const review = out.find((x) => x.linkedRoute === "/review")
    expect(review?.priority).toBe("high")
    expect(review?.description).toBe('tasks.gen.reviewOverdue:{"n":1}')
  })

  it("scales the estimate with the queue but keeps it inside 10–30 minutes", () => {
    const many = (n: number) =>
      Array.from({ length: n }, (_, i) => card({ id: `c${i}` }))

    const small = generateStudyTasks({ ...base, srs: many(6) }).find(
      (x) => x.linkedRoute === "/review"
    )
    const huge = generateStudyTasks({ ...base, srs: many(200) }).find(
      (x) => x.linkedRoute === "/review"
    )

    expect(small?.estimatedMin).toBe(10)
    expect(huge?.estimatedMin).toBe(30)
  })
})

describe("weak exam areas", () => {
  it("proposes a retake below 70", () => {
    const out = generateStudyTasks({ ...base, attempts: [attempt()] })
    const retake = out.find((x) => x.type === "exam")
    expect(retake?.title).toBe(
      'tasks.gen.retakeTitle:{"exam":"HSK","level":"3"}'
    )
    expect(retake?.description).toBe('tasks.gen.retakeDesc:{"score":40}')
  })

  it("leaves a passing attempt alone", () => {
    const out = generateStudyTasks({
      ...base,
      attempts: [attempt({ score: 70 })],
    })
    expect(out.find((x) => x.type === "exam")).toBeUndefined()
  })

  it("escalates below 50", () => {
    const out = generateStudyTasks({
      ...base,
      attempts: [attempt({ score: 49 })],
    })
    expect(out.find((x) => x.type === "exam")?.priority).toBe("high")
  })

  it("keeps only the latest attempt per exam and level", () => {
    const out = generateStudyTasks({
      ...base,
      attempts: [
        attempt({ score: 40, finishedAt: "2026-09-20T10:00:00Z" }),
        attempt({ score: 30, finishedAt: "2026-09-25T10:00:00Z" }),
      ],
    })
    const retakes = out.filter((x) => x.type === "exam")
    expect(retakes).toHaveLength(1)
    expect(retakes[0].description).toBe('tasks.gen.retakeDesc:{"score":30}')
  })

  it("caps the retake list at two", () => {
    const out = generateStudyTasks({
      ...base,
      attempts: [
        attempt({ assessmentId: "hsk-3" }),
        attempt({ assessmentId: "hsk-4" }),
        attempt({ assessmentId: "hsk-5" }),
      ],
    })
    expect(out.filter((x) => x.type === "exam")).toHaveLength(2)
  })

  it("nudges a first exam when nothing has been attempted", () => {
    const out = generateStudyTasks({ ...base, attempts: [] })
    expect(out.some((x) => x.title.includes("tasks.gen.examTitle"))).toBe(true)
  })

  it("does not nudge once an attempt exists", () => {
    const out = generateStudyTasks({
      ...base,
      attempts: [attempt({ score: 90 })],
    })
    expect(out.some((x) => x.title.includes("tasks.gen.examTitle"))).toBe(false)
  })
})

describe("daily goal", () => {
  it("proposes a session while under the goal", () => {
    const out = generateStudyTasks({ ...base, sessions: [session(5)] })
    const daily = out.find((x) => x.linkedRoute === "/learn")
    expect(daily?.estimatedMin).toBe(15)
    expect(daily?.description).toBe('tasks.gen.dailyDesc:{"left":15}')
  })

  it("stays quiet once the goal is met", () => {
    const out = generateStudyTasks({ ...base, sessions: [session(20)] })
    expect(routes(out)).not.toContain("/learn")
  })

  it("does not read another day's minutes as today's", () => {
    const out = generateStudyTasks({
      ...base,
      sessions: [session(0, "2026-09-25")],
    })
    expect(routes(out)).toContain("/learn")
  })
})

describe("variety", () => {
  it("always offers conversation practice when nothing is open", () => {
    expect(generateStudyTasks(base).some((x) => x.type === "speaking")).toBe(
      true
    )
  })
})

describe("dedup against open work", () => {
  it("does not repeat a route that is already open", () => {
    const out = generateStudyTasks({
      ...base,
      srs: [card()],
      sessions: [session(0)],
      existing: [
        task({ linkedRoute: "/review" }),
        task({ id: "t2", linkedRoute: "/learn" }),
        task({ id: "t3", linkedRoute: "/library" }),
        // Empty attempts would otherwise trigger the first-exam nudge.
        task({ id: "t4", linkedRoute: "/exam" }),
      ],
    })
    expect(routes(out)).toEqual([])
  })

  it("allows the route again once the existing task is done", () => {
    const out = generateStudyTasks({
      ...base,
      srs: [card()],
      existing: [task({ linkedRoute: "/review", status: "done" })],
    })
    expect(routes(out)).toContain("/review")
  })

  it("scopes the dedup to one language", () => {
    const out = generateStudyTasks({
      ...base,
      srs: [card()],
      existing: [task({ linkedRoute: "/review", language: "de" })],
    })
    expect(routes(out)).toContain("/review")
  })
})

describe("identity", () => {
  it("gives every task in a run a distinct id", () => {
    const out = generateStudyTasks({
      ...base,
      srs: [card(), card({ id: "c2" })],
      sessions: [session(0)],
    })
    expect(new Set(out.map((x) => x.id)).size).toBe(out.length)
  })

  it("stamps the language and the given date on every task", () => {
    const out = generateStudyTasks({ ...base, srs: [card()] })
    expect(out.every((x) => x.language === "zh")).toBe(true)
    expect(out.every((x) => x.dueDate === TODAY)).toBe(true)
  })
})
