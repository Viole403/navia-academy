import { useCallback } from "react"
import { useRouter } from "expo-router"

/**
 * Navigating back from a screen that may have nothing to pop.
 *
 * A screen reached by deep link, by a full reload, or as the first entry after a
 * redirect has an empty history, and `router.back()` on an empty stack does
 * nothing at all — a back control that looks live and is inert. So every exit
 * goes through here: `canGoBack() ? back() : replace(fallback)`.
 *
 * It is a hook rather than a helper because the guard has to be called from a
 * component, and because six screens had each written their own copy of these
 * four lines. Three of the six were never even called. Duplicated logic that
 * nobody invokes is not redundancy, it is a rule nobody is following.
 *
 * `fallback` is where this screen's parent lives, so the way back exists even
 * with no history to pop.
 */
export function useGuardedBack(fallback: string): () => void {
  const router = useRouter()
  return useCallback(() => {
    if (router.canGoBack()) router.back()
    else router.replace(fallback as never)
  }, [router, fallback])
}
