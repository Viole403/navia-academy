import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { storage } from "@/utils/storage"
import en, { type I18nKey } from "./en"
import id from "./id"

export type AppLocale = "en" | "id"

const DICTS = { en, id } as const

interface LocaleState {
  locale: AppLocale
  setLocale: (l: AppLocale) => void
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: "en",
      setLocale: (locale) => set({ locale }),
    }),
    { name: "navia.locale.v1", storage: createJSONStorage(() => storage) }
  )
)

export function useT(): (key: I18nKey) => string {
  const locale = useLocaleStore((s) => s.locale)
  return (key) => DICTS[locale][key] ?? en[key]
}
