import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { storage } from "@/utils/storage"
import type { LanguageCode } from "@/lib/languages"
import { DEFAULT_LANGUAGE } from "@/lib/languages"

export type OnboardingGoal =
  "hsk" | "tocfl" | "goethe" | "jlpt" | "toefl" | "conversation" | "travel"
export type ScriptPref = "simplified" | "traditional"

interface OnboardingState {
  hasCompleted: boolean
  language: LanguageCode
  script: ScriptPref | null
  goal: OnboardingGoal | null
  examType: string | null
  dailyMinutes: number
  setLanguage: (l: LanguageCode) => void
  setScript: (s: ScriptPref) => void
  setGoal: (g: OnboardingGoal) => void
  setExamType: (e: string) => void
  setDailyMinutes: (m: number) => void
  complete: () => void
  reset: () => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasCompleted: false,
      language: DEFAULT_LANGUAGE,
      script: null,
      goal: null,
      examType: null,
      dailyMinutes: 10,
      setLanguage: (language) => set({ language }),
      setScript: (script) => set({ script }),
      setGoal: (goal) => set({ goal }),
      setExamType: (examType) => set({ examType }),
      setDailyMinutes: (dailyMinutes) => set({ dailyMinutes }),
      complete: () => set({ hasCompleted: true }),
      reset: () =>
        set({
          hasCompleted: false,
          language: DEFAULT_LANGUAGE,
          script: null,
          goal: null,
          examType: null,
          dailyMinutes: 10,
        }),
    }),
    {
      name: "navia.onboarding.v1",
      storage: createJSONStorage(() => storage),
    }
  )
)
