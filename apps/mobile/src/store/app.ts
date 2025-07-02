import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface AppState {
  hasOnboarded: boolean;
  setHasOnboarded: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hasOnboarded: false,
      setHasOnboarded: (v) => set({ hasOnboarded: v }),
    }),
    {
      name: "navia.app.v1",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
