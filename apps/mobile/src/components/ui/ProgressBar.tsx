import { View } from "react-native"
import { useTheme } from "@/theme/ThemeProvider"

interface ProgressBarProps {
  value: number // 0..1
  height?: number
  tint?: string
}

/**
 * Hairline progress indicator used in editorial lists and dashboards.
 */
export function ProgressBar({ value, height = 2, tint }: ProgressBarProps) {
  const { theme } = useTheme()
  const clamped = Math.max(0, Math.min(1, value))

  return (
    <View
      style={{
        backgroundColor: theme.border,
        height,
        borderRadius: 0,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          backgroundColor: tint ?? theme.accent,
          height,
        }}
      />
    </View>
  )
}
