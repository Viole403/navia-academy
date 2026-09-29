import { Pressable, Text } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "@/theme/ThemeProvider"
import { paperType, families } from "@/theme/paperType"

/**
 * The back affordance, as a vector arrow rather than a "←" typed into a Text.
 * Seventeen screens carried the same six lines of Pressable and Text, and the
 * glyph inherited the label's weight, so it read as punctuation.
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
  const router = useRouter()
  const colour = tint ?? paper.inkSoft
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() =>
        router.canGoBack() ? router.back() : router.replace(fallback as never)
      }
      style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
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
