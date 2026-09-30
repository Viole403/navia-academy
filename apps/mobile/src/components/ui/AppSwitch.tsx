import { useEffect } from "react"
import { Pressable, StyleSheet } from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { useTheme } from "@/theme/ThemeProvider"

const TRACK_W = 50
const TRACK_H = 30
const THUMB = 24
const PAD = 3
const TRAVEL = TRACK_W - THUMB - PAD * 2

/**
 * The app's on/off control.
 *
 * React Native's Switch is a thin wrapper over the platform control, which on
 * Android draws a ripple around the thumb and animates on the JS thread. Both
 * read as sluggish next to the Reanimated work the rest of the app does, so the
 * state lives here instead: the caller flips its own state first and the thumb
 * follows on the UI thread regardless of how long the write takes.
 */
export function AppSwitch({
  value,
  onValueChange,
  disabled,
  accessibilityLabel,
}: {
  value: boolean
  onValueChange: (next: boolean) => void
  disabled?: boolean
  accessibilityLabel?: string
}) {
  const { paper } = useTheme()
  const progress = useSharedValue(value ? 1 : 0)

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 180 })
  }, [value, progress])

  const track = useAnimatedStyle(() => ({
    backgroundColor: progress.value === 1 ? paper.coral : paper.line,
  }))

  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * TRAVEL }],
  }))

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      // A ripple around a control this small reads as a stray circle, not feedback.
      android_ripple={null}
      hitSlop={8}
      onPress={() => onValueChange(!value)}
      style={styles.pressable}
    >
      <Animated.View
        style={[
          styles.track,
          { opacity: disabled ? 0.5 : 1 },
          { backgroundColor: paper.line },
          track,
        ]}
      >
        <Animated.View
          style={[styles.thumb, { backgroundColor: paper.paper }, thumb]}
        />
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pressable: { alignSelf: "center" },
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    padding: PAD,
    justifyContent: "center",
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
  },
})
