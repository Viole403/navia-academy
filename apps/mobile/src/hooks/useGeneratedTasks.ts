import { useMemo } from "react"
import { useQueries, useQuery } from "@tanstack/react-query"

import { progress, tasks as tasksApi } from "@/api/endpoints"
import { useUserSettings } from "@/hooks/useUserSettings"
import { generateStudyTasks } from "@/lib/taskPlanner"
import { useOnboardingStore } from "@/store/onboarding"
import { useT } from "@/i18n"
import type { AssessmentAttempt, StudyTask } from "@/types/api"

/**
 * Tasks proposed from the learner's own progress.
 *
 * These are recomputed on every render rather than stored, so a plan cannot go
 * stale in a queue — the moment a review is cleared the task stops being
 * suggested. Hand-entered tasks from the server are passed in as `existing` so a
 * proposal never duplicates work already on the list.
 *
 * The web planner used to be the only implementation, and because it read the
 * web progress store, mobile showed nothing. Both now read the same inputs, so
 * a learner sees the same plan on either.
 */
export function useGeneratedTasks(existing: StudyTask[] = []) {
  const t = useT()
  const language = useOnboardingStore((s) => s.language)
  const settings = useUserSettings()

  const results = useQueries({
    queries: [
      { queryKey: ["due-cards", 200], queryFn: () => progress.dueCards(200) },
      {
        queryKey: ["study-sessions", 14, 0],
        queryFn: () => progress.studySessions(14, 0),
      },
    ],
  })

  // Exam attempts have no dedicated endpoint; the web client wrote them into the
  // progress blob, so read them from there rather than dropping the whole rule.
  const blobQ = useQuery({
    queryKey: ["progress"],
    queryFn: progress.get,
  })

  const [dueQ, sessionsQ] = results
  const dailyGoalMin = settings.data?.daily_goal_min ?? 20
  const activeExam = settings.data?.active_exam_type ?? "hsk"

  const attempts = useMemo<AssessmentAttempt[]>(() => {
    const data = blobQ.data?.data as
      { attempts?: AssessmentAttempt[] } | undefined
    return Array.isArray(data?.attempts) ? data.attempts : []
  }, [blobQ.data])

  const today = new Date().toISOString().slice(0, 10)

  return useMemo(() => {
    if (dueQ.isLoading || sessionsQ.isLoading) return []
    return generateStudyTasks({
      t,
      srs: dueQ.data ?? [],
      attempts,
      sessions: sessionsQ.data ?? [],
      dailyGoalMin,
      activeExam,
      language,
      existing,
      today,
    })
  }, [
    t,
    dueQ.data,
    dueQ.isLoading,
    sessionsQ.data,
    sessionsQ.isLoading,
    attempts,
    dailyGoalMin,
    activeExam,
    language,
    existing,
    today,
  ])
}

/** Hand-entered tasks, adapted to the shape the planner dedupes against. */
export function useManualTasks() {
  return useQuery({ queryKey: ["tasks"], queryFn: tasksApi.list })
}
