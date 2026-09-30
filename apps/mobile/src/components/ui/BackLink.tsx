import { Pressable, Text } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "@/theme/ThemeProvider"
import { useGuardedBack } from "@/hooks/useGuardedBack"
import { paperType, families } from "@/theme/paperType"

/**
 * The back affordance, as a vector arrow rather than a "←" typed into a Text.
 * Seventeen screens carried the same six lines of Pressable and Text, and the
 * glyph inherited the label's weight, so it read as punctuation.
 *
 * **The 44dp frame is the target, and it is a frame rather than `hitSlop` on
 * purpose.** `hitSlop` only widens native hit-testing; it does not grow the
 * accessibility node, so a TalkBack or Switch Control user was handed the
 * unpadded 18dp box while a sighted finger got 34dp — two different targets for
 * one action. A real frame is one target for everyone, and it is the number
 * Apple (44pt) asks for; Android wants 48.
 *
 * The glyph stays at 18dp, which is the point: Material sizes the *icon* at
 * 24dp and spends the rest on the target, so nothing about how this looks has
 * to change. What does change is the header it sits in, which grows to 68dp —
 * within a dp of M3's 64dp small app bar, and taller than the 42dp it was.
 */
export function BackLink({
  label,
  fallback,
  tint,
}: {
  label: string
  /** Where to go when this screen was opened cold and there is no history. */
  fallback: string
  /** Defaults to the muted ink; one empty state uses the accent. */
  tint?: string
}) {
  const { paper } = useTheme()
  const goBack = useGuardedBack(fallback)
  const colour = tint ?? paper.inkSoft
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={goBack}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        minHeight: 44,
      }}
    >
      <Ionicons name="chevron-back" size={18} color={colour} />
      <Text
        style={[
          paperType.link,
          { color: colour, fontFamily: families.nunitoBold },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}
