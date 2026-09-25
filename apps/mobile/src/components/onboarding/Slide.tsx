import { useEffect, useRef, useState, type ReactNode } from "react"
import { Animated, Easing, Platform, StyleSheet, View } from "react-native"

/**
 * The page hand-over.
 *
 * **The order is the fix, not a preference.** The two halves used to be strictly
 * sequential — empty the screen, *then* mount the next page — so every millisecond
 * of that mount was spent looking at bare paper. Because every element on these
 * pages sits inside an entrance wrapper, a page starts at opacity 0 with nothing
 * static to hold the screen, which reads as the app having hung between steps.
 *
 * Mounting underneath means the mount happens while the old page is still on
 * screen, and the exit runs on the native driver so it keeps moving even while
 * the JS thread is busy building what is behind it. The exit is started from an
 * effect *after* the commit that mounts the arriving page, so a slow page reads as
 * a beat of delay before the change rather than a blank screen in the middle.
 *
 * Keeping both pages alive needs **two fixed slots**, each page staying in the
 * one it arrived in — a single slot whose contents swap would remount the leaving
 * page and replay its entrance as it slid away. Both slots are absolutely filled,
 * and **the spare one must carry `pointerEvents="none"`**: an absolutely-filled
 * View is a hit target in React Native whether or not it has anything in it, so
 * left on auto it lies over the whole page and swallows every tap. That is what
 * stops a second tap landing on the arriving page's button before it is visible.
 *
 * The first page deliberately does not animate: the welcome screen has its own
 * staged entrance, and playing both made it move twice.
 */
export function Slide({
  stepKey,
  children,
}: {
  stepKey: string | number
  children: ReactNode
}) {
  const [slots, setSlots] = useState<
    { key: string | number; node: ReactNode }[]
  >([{ key: stepKey, node: children }])
  const [activeSlot, setActiveSlot] = useState(0)
  const leaving = useRef<Animated.Value | null>(null)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    // The arriving page takes the spare slot; the current one is marked as
    // leaving and animated out. `slots` therefore only ever grows to two.
    setSlots((prev) => {
      const spare = prev[activeSlot === 0 ? 1 : 0]
      if (spare) setSlots([prev[activeSlot], { key: stepKey, node: children }])
      else setSlots([...prev, { key: stepKey, node: children }])
      return prev
    })
    setActiveSlot((s) => (s === 0 ? 1 : 0))

    // Started after the commit above, never before it.
    const v = new Animated.Value(0)
    leaving.current = v
    Animated.timing(v, {
      toValue: 1,
      duration: 260,
      easing: Easing.in(Easing.quad),
      useNativeDriver: Platform.OS !== "web",
    }).start(() => {
      setSlots((prev) => prev.slice(-2))
    })
    // Backstop: a stalled frame loop must not leave a page parked off-screen.
    const backstop = setTimeout(() => setSlots((prev) => prev.slice(-2)), 900)
    return () => clearTimeout(backstop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey])

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {slots.map((slot, i) => {
        const isActive = i === activeSlot
        const anim = isActive ? null : leaving.current
        return (
          <Animated.View
            key={slot.key}
            style={[
              StyleSheet.absoluteFill,
              anim
                ? {
                    opacity: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0],
                    }),
                    transform: [
                      {
                        translateX: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -40],
                        }),
                      },
                    ],
                  }
                : null,
            ]}
            // The leaving page takes no touches while it goes.
            pointerEvents={isActive ? "auto" : "none"}
          >
            {slot.node}
          </Animated.View>
        )
      })}
    </View>
  )
}
