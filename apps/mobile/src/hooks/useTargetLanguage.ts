import { languageForExam, type LanguageCode } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useUserSettings } from "./useUserSettings"

/**
 * The language the learner is actually studying.
 *
 * The onboarding store is a device-local cache that defaults to Mandarin, so a
 * learner who picked Goethe still got Mandarin reading aids on the settings
 * screen — the pinyin/zhuyin group has no business being offered for German.
 * `active_exam_type` is the one value the server persists, and every exam maps
 * to exactly one language, so it wins whenever it is present. The store only
 * answers before settings have loaded.
 */
export function useTargetLanguage(): LanguageCode {
  const cached = useOnboardingStore((s) => s.language)
  const { data } = useUserSettings()
  const exam = data?.active_exam_type
  return exam ? languageForExam(exam) : cached
}
