import { Text, View } from "react-native"
import Animated, { ZoomIn, useReducedMotion } from "react-native-reanimated"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts } from "@/theme/typography"

/**
 * Editorial motif — a single akzent element placed beside key content.
 * Resembles a chop seal: a small framed square with one glyph.
 * Entering zoom honors system reduce-motion.
 */
export function Motif({
  char = "章",
  size = 56,
}: {
  char?: string
  size?: number
}) {
  const { theme } = useTheme()
  const reduce = useReducedMotion()

  // Static tilt lives on the inner View: entering ZoomIn drives transform on
  // the outer Animated.View, and Reanimated warns when both fight over it.
  return (
    <Animated.View entering={reduce ? undefined : ZoomIn.duration(240)}>
      <View
        style={{
          width: size,
          height: size,
          borderWidth: 1.5,
          borderColor: theme.accent,
          backgroundColor: theme.accent + "08",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 2,
          transform: [{ rotate: "-4deg" }],
        }}
      >
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: size * 0.5,
            color: theme.accent,
            fontWeight: "500",
          }}
        >
          {char}
        </Text>
      </View>
    </Animated.View>
  )
}
