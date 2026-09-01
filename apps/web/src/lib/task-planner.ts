import type { AssessmentAttempt, StudySessionLog, StudyTask } from "@/types"
import type { TranslationKey } from "@/i18n/keys"
import { dueCards, todayLog } from "@/lib/derived"

/**
 * Personalized task generation ("smart plan") from the user's actual progress:
 * due SRS reviews, weak exam areas, unattempted exams, and the daily goal.
 *
 * Rule-based today so it works without any provider. An LLM layer with the
 * same inputs can be added later behind the same interface.
 */

export interface TaskPlannerInput {
  t: (key: TranslationKey, vars?: Record<string, string>) => string
  /** SRS cards for the active learning language only. */
  srs: Record<string, import("@/types").SrsCard>
  attempts: AssessmentAttempt[]
  sessions: Record<string, StudySessionLog>
  dailyGoalMin: number
  activeExam: string
  /** Language these tasks belong to — scopes dedup within the language. */
  language: string
  existing: StudyTask[]
  today: string
}

const OPEN = new Set(["pending", "in-progress", "overdue"])

function parseAttempt(id: string): { examType?: string; level?: string } {
  const parts = id.split("-")
  return parts.length >= 2 ? { examType: parts[0], level: parts[1] } : {}
}

export function generateStudyTasks(input: TaskPlannerInput): StudyTask[] {
  const {
    t,
    srs,
    attempts,
    sessions,
    dailyGoalMin,
    activeExam,
    language,
    existing,
    today,
  } = input
  const out: StudyTask[] = []
  let seq = 0

  const hasOpen = (route?: string) =>
    route !== undefined &&
    existing.some(
      (x) =>
        x.language === language && x.linkedRoute === route && OPEN.has(x.status)
    )

  const push = (task: StudyTask) => {
    if (task.linkedRoute && hasOpen(task.linkedRoute)) return
    out.push(task)
  }

  const now = new Date()
  const due = dueCards(srs)
  if (due.length > 0) {
    const overdue = due.filter((c) => c.due && new Date(c.due) < now).length
    push({
      id: `gen-${Date.now()}-${seq++}`,
      title: t("tasks.gen.reviewTitle", { n: String(due.length) }),
      description:
        overdue > 0
          ? t("tasks.gen.reviewOverdue", { n: String(overdue) })
          : t("tasks.gen.reviewDesc"),
      skill: "vocabulary",
      type: "review",
      dueDate: today,
      estimatedMin: Math.min(30, Math.max(10, Math.round(due.length / 6) * 5)),
      priority: overdue > 0 ? "high" : "medium",
      status: "pending",
      linkedRoute: "/dashboard/review",
      createdAt: now.toISOString(),
      language,
    })
  }

  // Weak exam areas → retake. Latest attempt per exam+level below 70.
  const latest = new Map<string, AssessmentAttempt>()
  for (const a of attempts) {
    const { examType, level } = parseAttempt(a.assessmentId)
    if (!examType || !level) continue
    const key = `${examType}/${level}`
    const prev = latest.get(key)
    if (
      !prev ||
      new Date(a.finishedAt ?? a.startedAt) >
        new Date(prev.finishedAt ?? prev.startedAt)
    ) {
      latest.set(key, a)
    }
  }
  let weakCount = 0
  for (const [key, a] of latest) {
    if (a.score >= 70) continue
    if (weakCount >= 2) break
    const [examType, level] = key.split("/")
    const route = `/dashboard/exam/${examType}/${level}`
    if (hasOpen(route)) continue
    push({
      id: `gen-${Date.now()}-${seq++}`,
      title: t("tasks.gen.retakeTitle", {
        exam: examType.toUpperCase(),
        level,
      }),
      description: t("tasks.gen.retakeDesc", { score: String(a.score) }),
      skill: "reading",
      type: "exam",
      dueDate: today,
      estimatedMin: 20,
      priority: a.score < 50 ? "high" : "medium",
      status: "pending",
      linkedRoute: route,
      createdAt: now.toISOString(),
      language,
    })
    weakCount++
  }

  // Never attempted the active exam → one practice nudge.
  const examRoute = `/dashboard/exam`
  if (attempts.length === 0 && !hasOpen(examRoute)) {
    push({
      id: `gen-${Date.now()}-${seq++}`,
      title: t("tasks.gen.examTitle", { exam: activeExam.toUpperCase() }),
      description: t("tasks.gen.examDesc"),
      skill: "reading",
      type: "exam",
      dueDate: today,
      estimatedMin: 25,
      priority: "low",
      status: "pending",
      linkedRoute: examRoute,
      createdAt: now.toISOString(),
      language,
    })
  }

  // Daily goal shortfall → one focused session.
  const todayMin = todayLog(sessions)?.minutes ?? 0
  if (todayMin < dailyGoalMin && !hasOpen("/dashboard/learn")) {
    push({
      id: `gen-${Date.now()}-${seq++}`,
      title: t("tasks.gen.dailyTitle", { n: String(dailyGoalMin) }),
      description: t("tasks.gen.dailyDesc", {
        left: String(Math.max(1, dailyGoalMin - todayMin)),
      }),
      skill: "vocabulary",
      type: "lesson",
      dueDate: today,
      estimatedMin: dailyGoalMin - todayMin,
      priority: "medium",
      status: "pending",
      linkedRoute: "/dashboard/learn",
      createdAt: now.toISOString(),
      language,
    })
  }

  // Variety: conversation practice.
  if (!hasOpen("/dashboard/conversations")) {
    push({
      id: `gen-${Date.now()}-${seq++}`,
      title: t("tasks.gen.conversationTitle"),
      description: t("tasks.gen.conversationDesc"),
      skill: "speaking",
      type: "speaking",
      dueDate: today,
      estimatedMin: 15,
      priority: "low",
      status: "pending",
      linkedRoute: "/dashboard/conversations",
      createdAt: now.toISOString(),
      language,
    })
  }

  return out
}
