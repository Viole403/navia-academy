import { ActivityIndicator, Pressable, Text } from "react-native"
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated"
import * as Haptics from "expo-haptics"
import { useTheme } from "@/theme/ThemeProvider"
import { FALLBACK } from "@/theme/colors"

function luminance(hex: string): number {
  const m = hex.replace("#", "")
  const c =
    m.length === 3
      ? m
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : m.slice(0, 6)
  const r = parseInt(c.slice(0, 2), 16) / 255
  const g = parseInt(c.slice(2, 4), 16) / 255
  const b = parseInt(c.slice(4, 6), 16) / 255
  const f = (v: number) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

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
 * Primary = monochrome solid (theme.text, flips with light/dark).
 * Danger = red solid. Secondary = outline. Ghost = underline-only.
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
  const reduce = useReducedMotion()
  const scale = useSharedValue(1)
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))
  const pressIn = () => {
    if (!reduce) scale.value = withSpring(0.97, { damping: 18, stiffness: 400 })
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
      () => undefined
    )
  }
  const pressOut = () => {
    scale.value = withSpring(1, { damping: 18, stiffness: 400 })
  }

  const padY = size === "sm" ? 10 : size === "lg" ? 18 : 14
  const padX = size === "sm" ? 16 : size === "lg" ? 28 : 22
  const fontSize = size === "sm" ? 14 : size === "lg" ? 17 : 16

  if (variant === "ghost") {
    return (
      <Animated.View style={pressStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={pressIn}
          onPressOut={pressOut}
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
      </Animated.View>
    )
  }

  const filled = variant === "primary" || variant === "danger"
  const rawBg =
    variant === "danger"
      ? theme.red
      : variant === "primary"
        ? theme.text
        : "transparent"
  const bg = rawBg ?? (variant === "danger" ? FALLBACK.red : FALLBACK.accent)
  const borderColor = variant === "secondary" ? theme.textDim : bg
  const textColor =
    variant === "primary"
      ? (theme.bg ?? FALLBACK.bg)
      : filled && luminance(bg) > 0.3
        ? "#1F1F1F"
        : filled
          ? theme.white
          : theme.text

  return (
    <Animated.View style={pressStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
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
    </Animated.View>
  )
}
