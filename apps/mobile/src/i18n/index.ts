import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { storage } from "@/utils/storage"
import en, { type I18nKey } from "./en"
import id from "./id"

export type { I18nKey }

export type AppLocale = "en" | "id"

const DICTS = { en, id } as const

/**
 * Interpolation values, keyed by placeholder name.
 *
 * Placeholders in the dictionaries are positional (`%d`) rather than named, so
 * a string can be translated into a language that orders its arguments
 * differently without the call site changing. `%d` takes the first value, in
 * order.
 */
export type TParams = Record<string, string | number>

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

function interpolate(template: string, params?: TParams): string {
  if (!params) return template
  const values = Object.values(params)
  let i = 0
  return template.replace(/%[ds]/g, (match) => {
    // A string with more placeholders than values keeps the placeholder
    // visible rather than printing "undefined" into the UI.
    if (i >= values.length) return match
    return String(values[i++])
  })
}

export function translate(
  locale: AppLocale,
  key: I18nKey,
  params?: TParams
): string {
  const dict = DICTS[locale] as Record<string, string>
  // English is the fallback: a key missing from the Indonesian file falls back
  // rather than rendering as a raw key at the learner.
  const template = dict[key] ?? (en as Record<string, string>)[key] ?? key
  return interpolate(template, params)
}

export function useT(): (key: I18nKey, params?: TParams) => string {
  const locale = useLocaleStore((s) => s.locale)
  return (key, params) => translate(locale, key, params)
}
