import AsyncStorage from "@react-native-async-storage/async-storage"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export type OnboardingGoal = "hsk" | "tocfl" | "conversation" | "travel"
export type ScriptPref = "simplified" | "traditional"

interface OnboardingState {
  hasCompleted: boolean
  script: ScriptPref | null
  goal: OnboardingGoal | null
  examType: string | null
  dailyMinutes: number
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
      script: null,
      goal: null,
      examType: null,
      dailyMinutes: 10,
      setScript: (script) => set({ script }),
      setGoal: (goal) => set({ goal }),
      setExamType: (examType) => set({ examType }),
      setDailyMinutes: (dailyMinutes) => set({ dailyMinutes }),
      complete: () => set({ hasCompleted: true }),
      reset: () =>
        set({
          hasCompleted: false,
          script: null,
          goal: null,
          examType: null,
          dailyMinutes: 10,
        }),
    }),
    {
      name: "navia.onboarding.v1",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
