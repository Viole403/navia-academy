import { useEffect, useRef } from "react"
import { Animated, Easing, Platform, View } from "react-native"

/**
 * Celebration — the burst played when a session lands.
 *
 * A ring of confetti dots rather than a particle system: on a phone this is
 * visible for well under a second, and the cheaper thing is the one that gets
 * read. Every non-native animation carries a `setTimeout` backstop, because
 * requestAnimationFrame stops dead for a hidden tab and a screen left at
 * opacity 0 comes back as a blank card.
 */
export function Celebration({ visible }: { visible: boolean }) {
  const v = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!visible) return
    v.setValue(0)
    Animated.timing(v, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start()
    const backstop = setTimeout(() => v.setValue(1), 1400)
    return () => clearTimeout(backstop)
  }, [visible, v])

  if (!visible) return null

  return (
    <View
      style={{
        width: 140,
        height: 140,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: i % 2 === 0 ? "#49B35C" : "#F2BE4B",
              opacity: v.interpolate({
                inputRange: [0, 0.3, 1],
                outputRange: [0, 1, 0],
              }),
              transform: [
                {
                  translateX: v.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, Math.cos(angle) * 56],
                  }),
                },
                {
                  translateY: v.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, Math.sin(angle) * 56],
                  }),
                },
                {
                  scale: v.interpolate({
                    inputRange: [0, 0.3, 1],
                    outputRange: [0.4, 1, 0.6],
                  }),
                },
              ],
            }}
          />
        )
      })}
      <Animated.View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: "#49B35C",
          opacity: v,
          transform: [
            {
              scale: v.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 1],
              }),
            },
          ],
        }}
      />
    </View>
  )
}
