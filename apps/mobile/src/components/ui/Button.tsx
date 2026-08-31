import { ActivityIndicator, Pressable, Text } from "react-native"
import { useTheme } from "@/theme/ThemeProvider"

type Variant = "primary" | "secondary" | "ghost" | "danger"
type Size = "sm" | "md" | "lg"

interface ButtonProps {
  title: string
  onPress?: () => void
  variant?: Variant
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  size?: Size
}

/**
 * Editorial button — flat, hairline borders, no shadows.
 * Primary & Danger = filled solid. Secondary = outline. Ghost = underline-only.
 */
export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  fullWidth = true,
  size = "md",
}: ButtonProps) {
  const { theme } = useTheme()

  const padY = size === "sm" ? 10 : size === "lg" ? 18 : 14
  const padX = size === "sm" ? 16 : size === "lg" ? 28 : 22
  const fontSize = size === "sm" ? 14 : size === "lg" ? 17 : 16

  if (variant === "ghost") {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={({ pressed }) => ({
          alignSelf: fullWidth ? "stretch" : "auto",
          paddingVertical: padY,
          paddingHorizontal: padX,
          alignItems: "center",
          opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
        })}
      >
        <Text
          style={{
            color: theme.text,
            fontSize,
            fontWeight: "600",
            letterSpacing: 0.3,
            textDecorationLine: "underline",
            textDecorationColor: theme.border,
          }}
        >
          {title}
        </Text>
      </Pressable>
    )
  }

  const filled = variant === "primary" || variant === "danger"
  const bg =
    variant === "danger"
      ? theme.red
      : variant === "primary"
        ? theme.accent
        : "transparent"
  const borderColor = variant === "secondary" ? theme.border : bg
  const textColor = filled ? theme.white : theme.text

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => ({
        alignSelf: fullWidth ? "stretch" : "auto",
        backgroundColor: pressed ? theme.cardPressed : bg,
        borderWidth: 1.5,
        borderColor,
        paddingVertical: padY,
        paddingHorizontal: padX,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        opacity: disabled ? 0.5 : 1,
        borderRadius: 2,
      })}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text
          style={{
            color: textColor,
            fontSize,
            fontWeight: "700",
            letterSpacing: 0.5,
          }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  )
}
