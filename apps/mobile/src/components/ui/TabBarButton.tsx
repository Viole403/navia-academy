import type { ReactNode } from "react"
import { useState } from "react"
import { Pressable, type StyleProp, type ViewStyle } from "react-native"

/**
 * Tab button for the bottom bar.
 *
 * React Navigation's default button is a PlatformPressable, which on Android
 * paints a circular ripple centred on the icon. On a 70dp bar that circle reads
 * as a stray ring rather than feedback, so the press is shown by dimming the
 * whole item instead.
 *
 * Props are whatever the navigator hands its tabBarButton: the children, the
 * press handlers, accessibility state and a style to fill the slot.
 */
export function TabBarButton({
  children,
  onPress,
  onLongPress,
  accessibilityState,
  style,
}: {
  children?: unknown
  onPress?: () => void
  onLongPress?: () => void
  accessibilityState?: {
    selected?: boolean
    disabled?: boolean
    [k: string]: unknown
  }
  style?: StyleProp<ViewStyle>
}) {
  const [pressed, setPressed] = useState(false)
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      android_ripple={null}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      style={[style, { opacity: pressed ? 0.7 : 1 }]}
    >
      {children as ReactNode}
    </Pressable>
  )
}
