import type { I18nKey } from "@/i18n"
import type {
  AssessmentAttempt,
  SrsCard,
  StudySession,
  StudyTask,
} from "@/types/api"

/**
 * Personalized task generation from what the learner has actually done: due
 * reviews, weak exam areas, an unattempted exam, and the daily goal shortfall.
 *
 * Ported from the web planner so both platforms propose the same work. The two
 * used to disagree — web derived a plan from progress, mobile listed only what
 * the learner typed by hand — and a learner moving between them found the plan
 * missing rather than waiting.
 *
 * The web version is rule-based for the same reason: it has to work with no
 * provider configured. A model-based layer can take the same inputs later
 * behind this signature.
 *
 * Every input is passed in rather than read here, so the caller decides whether
 * progress came from the server blob, a local cache, or a test fixture.
 */

export interface TaskPlannerInput {
  t: (key: I18nKey, vars?: Record<string, string | number>) => string
  /** Cards for the active learning language only. */
  srs: SrsCard[]
  attempts: AssessmentAttempt[]
  sessions: StudySession[]
  dailyGoalMin: number
  activeExam: string
  /** Language these tasks belong to — scopes the dedup within a language. */
  language: string
  /** Tasks already on the list, so a plan does not repeat open work. */
  existing: StudyTask[]
  today: string
}

const OPEN = new Set(["pending", "in-progress", "overdue"])

/**
 * Identifiers are `examType-level`, so a failed attempt has to be split back
 * apart to find the route worth retaking.
 */
function parseAttempt(id: string): { examType?: string; level?: string } {
  const parts = id.split("-")
  return parts.length >= 2 ? { examType: parts[0], level: parts[1] } : {}
}

/** A card is due when its date has arrived; dates are day-granular. */
function isDue(card: SrsCard, onDate: string): boolean {
  return card.due_date <= onDate
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
  // Stable within a run so React keys do not churn between re-renders, and
  // prefixed by date so two days never collide.
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

  // ── Due reviews ────────────────────────────────────────────────────────
  const due = srs.filter((c) => isDue(c, today))
  if (due.length > 0) {
    const overdue = due.filter((c) => c.due_date < today).length
    push({
      id: `gen-${today}-${seq++}`,
      title: t("tasks.gen.reviewTitle", { n: due.length }),
      description:
        overdue > 0
          ? t("tasks.gen.reviewOverdue", { n: overdue })
          : t("tasks.gen.reviewDesc"),
      skill: "vocabulary",
      type: "review",
      dueDate: today,
      estimatedMin: Math.min(30, Math.max(10, Math.round(due.length / 6) * 5)),
      priority: overdue > 0 ? "high" : "medium",
      status: "pending",
      linkedRoute: "/review",
      createdAt: new Date().toISOString(),
      language,
    })
  }

  // ── Weak exam areas: latest attempt per exam+level below 70 ───────────
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
    // Mobile has no per-exam route with the level in the path, so the retake
    // points at the exam tab rather than a screen that does not exist here.
    const route = "/exam"
    push({
      id: `gen-${today}-${seq++}`,
      title: t("tasks.gen.retakeTitle", {
        exam: examType.toUpperCase(),
        level,
      }),
      description: t("tasks.gen.retakeDesc", { score: a.score }),
      skill: "reading",
      type: "exam",
      dueDate: today,
      estimatedMin: 20,
      priority: a.score < 50 ? "high" : "medium",
      status: "pending",
      linkedRoute: route,
      createdAt: new Date().toISOString(),
      language,
    })
    weakCount++
  }

  // ── Never attempted the active exam → one practice nudge ───────────────
  if (attempts.length === 0 && !hasOpen("/exam")) {
    push({
      id: `gen-${today}-${seq++}`,
      title: t("tasks.gen.examTitle", { exam: activeExam.toUpperCase() }),
      description: t("tasks.gen.examDesc"),
      skill: "reading",
      type: "exam",
      dueDate: today,
      estimatedMin: 25,
      priority: "low",
      status: "pending",
      linkedRoute: "/exam",
      createdAt: new Date().toISOString(),
      language,
    })
  }

  // ── Daily goal shortfall → one focused session ─────────────────────────
  const todayMin = sessions.find((s) => s.date === today)?.minutes ?? 0
  if (todayMin < dailyGoalMin && !hasOpen("/learn")) {
    push({
      id: `gen-${today}-${seq++}`,
      title: t("tasks.gen.dailyTitle", { n: dailyGoalMin }),
      description: t("tasks.gen.dailyDesc", {
        left: Math.max(1, dailyGoalMin - todayMin),
      }),
      skill: "vocabulary",
      type: "lesson",
      dueDate: today,
      estimatedMin: dailyGoalMin - todayMin,
      priority: "medium",
      status: "pending",
      linkedRoute: "/learn",
      createdAt: new Date().toISOString(),
      language,
    })
  }

  // ── Variety: conversation practice ─────────────────────────────────────
  if (!hasOpen("/library")) {
    push({
      id: `gen-${today}-${seq++}`,
      title: t("tasks.gen.conversationTitle"),
      description: t("tasks.gen.conversationDesc"),
      skill: "speaking",
      type: "speaking",
      dueDate: today,
      estimatedMin: 15,
      priority: "low",
      status: "pending",
      linkedRoute: "/library",
      createdAt: new Date().toISOString(),
      language,
    })
  }

  return out
}
