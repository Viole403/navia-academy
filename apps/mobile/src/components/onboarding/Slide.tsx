import { useEffect, useRef, useState, type ReactNode } from "react"
import { Animated, Easing, Platform, StyleSheet, View } from "react-native"

/**
 * The page hand-over.
 *
 * What it does: show the arriving page while the leaving one slides out, so
 * there is never a moment where the screen is empty.
 *
 * The previous version juggled two fixed slots and tried to keep them in step
 * with a `setState` nested inside another `setState`'s updater. Updaters have to
 * be pure, and React does not promise to run one exactly once, so the slot index
 * and the slot list could disagree. When they did, the page being pointed at was
 * the one that had just been dropped — which is why slides went blank and why
 * one of them had its text jammed against the top.
 *
 * This version keeps one piece of truth, `stepKey`, and derives everything else
 * from it. The leaving page is held in state beside the arriving one, so both
 * are on screen for exactly as long as the animation runs and neither is ever
 * addressed by an index that can drift.
 *
 * A page that mounts while another is still on screen is deliberate: the mount
 * cost is paid in the middle of a transition rather than as a stall between
 * steps, and the exit runs on the native driver so it keeps moving even while
 * the JS thread is busy building what arrives next.
 *
 * The first page deliberately does not animate. The welcome screen has its own
 * staged entrance, and playing both made it move twice.
 */
export function Slide({
  stepKey,
  children,
}: {
  stepKey: string | number
  children: ReactNode
}) {
  const [leaving, setLeaving] = useState<{
    key: string | number
    node: ReactNode
  } | null>(null)
  const exit = useRef(new Animated.Value(1)).current
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }

    setLeaving((prev) =>
      prev ? null : { key: prevKey.current, node: prevNode.current }
    )
    // The page that is on its way out is whatever was here before this commit.
    prevKey.current = stepKey
    prevNode.current = children

    exit.setValue(0)
    const animation = Animated.timing(exit, {
      toValue: 1,
      duration: 260,
      easing: Easing.in(Easing.quad),
      useNativeDriver: Platform.OS !== "web",
    })
    animation.start(({ finished }) => {
      // Only drop the page when the animation actually ended. A cancelled
      // animation is left in place, because a half-faded page still needs to be
      // there until the next one covers it.
      if (finished) setLeaving(null)
    })

    // A stalled frame loop must not leave a page parked half off-screen, but
    // this is a backstop only: it is longer than the animation, so it never
    // fires during a normal hand-over.
    const backstop = setTimeout(() => setLeaving(null), 900)
    return () => clearTimeout(backstop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey])

  // Written during the commit above, read during the next one.
  const prevKey = useRef(stepKey)
  const prevNode = useRef(children)

  return (
    <View style={styles.fill} pointerEvents="box-none">
      {leaving ? (
        <Animated.View
          key={`leaving-${leaving.key}`}
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: exit.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0],
              }),
              transform: [
                {
                  translateX: exit.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -40],
                  }),
                },
              ],
            },
          ]}
          // The leaving page takes no touches while it goes, so an absolutely
          // filled view cannot swallow the tap meant for the arriving page.
          pointerEvents="none"
        >
          {leaving.node}
        </Animated.View>
      ) : null}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {children}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
})
