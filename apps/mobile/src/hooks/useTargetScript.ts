import { scriptForExam } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useUserSettings } from "./useUserSettings"

/**
 * Which Chinese script the learner is studying.
 *
 * Two screens read the script straight off the onboarding store and defaulted it
 * to simplified, so a TOCFL learner signing in on a fresh device was served
 * 简体 characters for a course that teaches 繁體. The exam type is stored per
 * account and names the script outright, so it decides here; the device cache
 * only answers before settings have loaded.
 */
export function useTargetScript(): "simplified" | "traditional" {
  const cached = useOnboardingStore((s) => s.script)
  const { data } = useUserSettings()
  const fromExam = data?.active_exam_type
    ? scriptForExam(data.active_exam_type)
    : null
  return fromExam ?? cached ?? "simplified"
}
