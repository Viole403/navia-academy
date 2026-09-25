import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { storage } from "@/utils/storage"

/**
 * Device-side preferences that are not the server's business.
 *
 * The learning prefs (voice, daily goal, new-word limit) live in the backend
 * `settings` table, because the web app needs them too. These are the ones that
 * only this install has a use for — sound effects and haptics — so they stay
 * local rather than inventing server fields nobody asked for.
 */
interface SettingsPrefsState {
  soundEffects: boolean
  haptics: boolean
  reduceMotion: boolean
  setSoundEffects: (v: boolean) => void
  setHaptics: (v: boolean) => void
  setReduceMotion: (v: boolean) => void
}

export const useSettingsPrefs = create<SettingsPrefsState>()(
  persist(
    (set) => ({
      soundEffects: true,
      haptics: true,
      reduceMotion: false,
      setSoundEffects: (soundEffects) => set({ soundEffects }),
      setHaptics: (haptics) => set({ haptics }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
    }),
    { name: "navia.prefs.v1", storage: createJSONStorage(() => storage) }
  )
)
