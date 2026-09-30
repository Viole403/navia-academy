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
 * The frame is 44dp rather than hitSlop because hitSlop does not grow the
 * accessibility node: a screen-reader user got the unpadded 18dp box.
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
