import { useCallback } from "react"
import { useRouter } from "expo-router"

/** `router.back()` is inert on an empty stack, which a deep link guarantees. */
export function useGuardedBack(fallback: string): () => void {
  const router = useRouter()
  return useCallback(() => {
    if (router.canGoBack()) router.back()
    else router.replace(fallback as never)
  }, [router, fallback])
}
