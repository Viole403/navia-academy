import { useCallback, useEffect, useRef, useState } from "react"
import { Animated } from "react-native"
import { useFocusEffect } from "expo-router"
import { entranceScore } from "./tokens"

/**
 * Entrance score.
 * `useEntranceRun` ticks on focus (tab screens stay mounted); `useReveal`
 * plays one element's arrival off that counter. Every animation carries a
 * setTimeout backstop (hidden-tab rAF stall defence).
 */
export function useEntranceRun(): number {
  const [run, setRun] = useState(0)
  const first = useRef(true)
  // Inline callback re-subscribes useFocusEffect every render and loops; nothing
  // here changes identity, so the empty dep list is honest.
  useFocusEffect(
    useCallback(() => {
      // Mount already starts the score via initial useReveal effects —
      // skip the first focus so the animation never plays twice.
      if (first.current) {
        first.current = false
        return
      }
      const t = setTimeout(() => setRun((r) => r + 1), 60)
      return () => clearTimeout(t)
    }, [])
  )
  return run
}

export function useReveal({
  at,
  duration,
  run,
  distance = entranceScore.slideY,
  axis = "y",
}: {
  at: number
  duration: number
  run: number
  distance?: number
  axis?: "x" | "y"
}): { opacity: Animated.Value; translate: Animated.Value } {
  const opacity = useRef(new Animated.Value(0)).current
  const translate = useRef(new Animated.Value(distance)).current

  useEffect(() => {
    opacity.setValue(0)
    translate.setValue(distance)
    const start = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration,
          useNativeDriver: false,
        }),
        Animated.timing(translate, {
          toValue: 0,
          duration,
          useNativeDriver: false,
        }),
      ]).start()
    }, at)
    // Backstop: a stalled frame loop must never leave content invisible.
    const backstop = setTimeout(
      () => {
        opacity.setValue(1)
        translate.setValue(0)
      },
      at + duration + entranceScore.backstop + 1200
    )
    return () => {
      clearTimeout(start)
      clearTimeout(backstop)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run])

  return { opacity, translate }
}

/** Character count for a typewriter slice — caller slices rich text itself. */
export function useTypewriter(
  total: number,
  run: number,
  perChar: number = entranceScore.typingPerChar
): number {
  const [n, setN] = useState(0)
  useEffect(() => {
    setN(0)
    if (total === 0) return

    // Held out here so the cleanup can reach them; inside the start callback
    // they were only ever cleared by finishing on their own.
    let id: ReturnType<typeof setInterval> | undefined
    let guard: ReturnType<typeof setTimeout> | undefined

    const start = setTimeout(() => {
      const t0 = Date.now()
      id = setInterval(() => {
        const k = Math.min(total, Math.floor((Date.now() - t0) / perChar) + 1)
        setN(k)
        if (k >= total && id !== undefined) clearInterval(id)
      }, perChar)
      guard = setTimeout(
        () => {
          if (id !== undefined) clearInterval(id)
          setN(total)
        },
        total * perChar + 1500
      )
    }, entranceScore.bubble.at)

    return () => {
      clearTimeout(start)
      if (id !== undefined) clearInterval(id)
      if (guard !== undefined) clearTimeout(guard)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, total])
  return n
}
