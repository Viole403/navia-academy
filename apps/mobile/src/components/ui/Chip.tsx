import { Pressable, Text, View } from "react-native"
import { useTheme } from "@/theme/ThemeProvider"

interface ChipProps {
  label: string
  selected: boolean
  onPress: () => void
  /** Optional accent (e.g. exam badge color); defaults to theme text. */
  tint?: string
  /** Small uppercase marker shown after the label (e.g. "Current"). */
  badge?: string
}

/**
 * Editorial chip — hairline pill, sharp aesthetic, no fill unless selected.
 */
export function Chip({ label, selected, onPress, tint, badge }: ChipProps) {
  const { theme } = useTheme()
  const active = tint ?? theme.text

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 9,
        paddingHorizontal: 16,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: selected ? active : theme.border,
        backgroundColor: selected ? active : "transparent",
        opacity: pressed ? 0.7 : 1,
      })}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text
          style={{
            color: selected ? theme.bg : theme.text,
            fontSize: 13,
            fontWeight: "600",
            letterSpacing: 0.4,
          }}
        >
          {selected ? "✓ " : ""}
          {label}
        </Text>
        {badge ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: selected ? theme.bg : active,
              borderRadius: 999,
              paddingHorizontal: 6,
              paddingVertical: 1,
            }}
          >
            <Text
              style={{
                color: selected ? theme.bg : active,
                fontSize: 9,
                fontWeight: "800",
                letterSpacing: 1,
              }}
            >
              {badge.toUpperCase()}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  )
}
