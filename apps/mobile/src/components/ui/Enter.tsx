import type { ReactNode } from "react"
import Animated, {
  FadeIn,
  FadeInUp,
  useReducedMotion,
} from "react-native-reanimated"

/**
 * Stagger entering wrapper — UI-thread preset, capped delay.
 * Honors system reduce-motion with a short fade.
 */
export function Enter({
  index = 0,
  children,
}: {
  index?: number
  children: ReactNode
}) {
  const reduce = useReducedMotion()
  return (
    <Animated.View
      entering={
        reduce
          ? FadeIn.duration(80)
          : FadeInUp.delay(Math.min(index * 40, 320)).duration(240)
      }
    >
      {children}
    </Animated.View>
  )
}
