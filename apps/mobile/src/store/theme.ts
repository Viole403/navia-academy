import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ThemeId, ThemeMode } from "@/theme/colors";

interface ThemePrefsState {
  themeId: ThemeId;
  mode: ThemeMode;
  setThemeId: (id: ThemeId) => void;
  setMode: (m: ThemeMode) => void;
}

export const useThemePrefs = create<ThemePrefsState>()(
  persist(
    (set) => ({
      themeId: "ink",
      mode: "system",
      setThemeId: (themeId) => set({ themeId }),
      setMode: (mode) => set({ mode }),
    }),
    {
      name: "navia.theme.v1",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
