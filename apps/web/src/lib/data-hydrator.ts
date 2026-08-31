import {
  getLearningLanguage,
  subscribeLearningLanguage,
} from "@/lib/language-context"
import type { LanguageCode } from "@/types"

/**
 * Wraps a language-scoped data loader into a hydrator that:
 * - memoizes the in-flight/loaded promise per language,
 * - automatically re-hydrates when the active learning language changes
 *   (client only), replacing data only once the new bundle has loaded.
 */
export function makeHydrator<T>(
  load: (lang: LanguageCode) => Promise<T>,
  setData: (data: T) => void
): () => Promise<T> {
  let promise: Promise<T> | null = null
  let loadedFor: LanguageCode | null = null
  let unsubscribe: (() => void) | null = null

  const hydrate = (): Promise<T> => {
    if (typeof window !== "undefined" && !unsubscribe) {
      unsubscribe = subscribeLearningLanguage(() => {
        if (getLearningLanguage() !== loadedFor) {
          promise = null
          void hydrate()
        }
      })
    }

    const lang = getLearningLanguage()
    if (promise && loadedFor === lang) return promise

    loadedFor = lang
    promise = load(lang)
      .then((data) => {
        if (loadedFor === lang) setData(data)
        return data
      })
      .catch((err) => {
        if (loadedFor === lang) promise = null
        throw err
      })
    return promise
  }

  return hydrate
}
