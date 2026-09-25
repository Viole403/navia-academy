import { Text, View } from "react-native"
import Animated, { ZoomIn, useReducedMotion } from "react-native-reanimated"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentFaces } from "@/hooks/useContentFaces"

export type MotifTone = "accent" | "muted" | "green"

/**
 * Editorial motif — a single accent element set in a chop-seal frame.
 *
 * The glyph is drawn in the **content face**, not the Latin serif. The serif
 * carries no CJK glyphs, so every one of these seals was falling through to
 * whatever the system chose — which for a traditional-script learner meant the
 * wrong form of 你 on eight different screens, and for a Japanese learner meant
 * an arbitrary substitute for あ. The face is resolved once here rather than at
 * the eight call sites, because a per-call-site fix is a fix that will be
 * forgotten at the ninth.
 *
 * The default character is a neutral mark rather than a Han character: a
 * fallback that renders 章 for someone who has chosen German is the same mistake
 * one level down.
 *
 * Entering zoom honors system reduce-motion.
 */
export function Motif({
  char = "✦",
  size = 56,
  tone = "accent",
}: {
  char?: string
  size?: number
  tone?: MotifTone
}) {
  const { theme } = useTheme()
  const faces = useContentFaces()
  const reduce = useReducedMotion()
  const ink =
    tone === "muted"
      ? theme.textMuted
      : tone === "green"
        ? theme.green
        : theme.accent

  // Static tilt lives on the inner View: entering ZoomIn drives transform on
  // the outer Animated.View, and Reanimated warns when both fight over it.
  return (
    <Animated.View entering={reduce ? undefined : ZoomIn.duration(240)}>
      <View
        style={{
          width: size,
          height: size,
          borderWidth: 1.5,
          borderColor: ink,
          backgroundColor: ink + "08",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 2,
          transform: [{ rotate: "-4deg" }],
        }}
      >
        <Text
          style={{
            fontFamily: faces.display,
            fontSize: size * 0.5,
            color: ink,
            fontWeight: "500",
          }}
        >
          {char}
        </Text>
      </View>
    </Animated.View>
  )
}
