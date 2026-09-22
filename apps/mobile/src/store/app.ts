import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { storage } from "@/utils/storage"

interface AppState {
  hasOnboarded: boolean
  setHasOnboarded: (v: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hasOnboarded: false,
      setHasOnboarded: (v) => set({ hasOnboarded: v }),
    }),
    {
      name: "navia.app.v1",
      storage: createJSONStorage(() => storage),
    }
  )
)
