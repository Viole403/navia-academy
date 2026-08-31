import { Pressable, Text } from "react-native"
import { useTheme } from "@/theme/ThemeProvider"

interface ChipProps {
  label: string
  selected: boolean
  onPress: () => void
}

/**
 * Editorial chip — hairline pill, sharp aesthetic, no fill unless selected.
 */
export function Chip({ label, selected, onPress }: ChipProps) {
  const { theme } = useTheme()

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 9,
        paddingHorizontal: 16,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: selected ? theme.text : theme.border,
        backgroundColor: selected ? theme.text : "transparent",
        opacity: pressed ? 0.7 : 1,
      })}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text
        style={{
          color: selected ? theme.bg : theme.text,
          fontSize: 13,
          fontWeight: "600",
          letterSpacing: 0.4,
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}
