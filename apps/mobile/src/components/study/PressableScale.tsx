import { useRef } from "react"
import {
  Animated,
  Platform,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { View } from "react-native"

/**
 * Press-scale wrapper.
 *
 * Outer Animated.View carries the transform (never className on it);
 * inner plain View keeps layout + visual style. Non-native drivers get a
 * setTimeout backstop so a stalled rAF can never park the UI mid-press.
 */
export function PressableScale({
  onPress,
  children,
  style,
  innerStyle,
  scale = 0.975,
  disabled,
  accessibilityLabel,
}: {
  onPress?: () => void
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  innerStyle?: StyleProp<ViewStyle>
  scale?: number
  disabled?: boolean
  accessibilityLabel?: string
}) {
  const v = useRef(new Animated.Value(1)).current
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const settle = (to: number, ms: number) => {
    if (timer.current) clearTimeout(timer.current)
    Animated.timing(v, {
      toValue: to,
      duration: ms,
      useNativeDriver: Platform.OS !== "web",
    }).start()
    // Backstop: force the final value even if rAF stalls (hidden tab).
    timer.current = setTimeout(() => v.setValue(to), ms + 140)
  }

  return (
    <Animated.View style={[{ transform: [{ scale: v }] }, style]}>
      <Pressable
        onPress={onPress}
        disabled={disabled ?? !onPress}
        accessibilityLabel={accessibilityLabel}
        onPressIn={() => settle(scale, 110)}
        onPressOut={() => settle(1, 140)}
      >
        <View style={innerStyle}>{children}</View>
      </Pressable>
    </Animated.View>
  )
}
