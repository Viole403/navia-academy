import { useCallback, useRef } from "react"
import {
  Animated,
  Image,
  Platform,
  Pressable,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from "react-native"

/**
 * The press kit.
 *
 * Two traps live here, both of which have bitten real screens:
 *
 *  1. **A card can be one pressable *and* several, but never by nesting
 *     Pressables.** On the web target the inner handler's event bubbles to the
 *     outer one, so a tap on "Add this word" both added the word and pushed the
 *     route. `usePressClaim` marks the press on the way in; the outer handler
 *     stands down when it sees the mark. The flag clears on a `setTimeout(…, 0)`
 *     rather than after the press, because web bubbles synchronously (so the
 *     outer handler still sees it) while native never fires the outer at all
 *     (so nothing else would ever clear it, and the next tap on the card body
 *     would be eaten).
 *
 *  2. **`PressableScale` takes layout on `wrapperStyle`, not `style`.** `flex`
 *     on the inner Pressable does nothing while the Animated.View around it is
 *     still sized to its content — which is how the word card's two buttons
 *     ended up overlapping.
 */
export function usePressClaim() {
  const claimed = useRef(false)
  const claim = useCallback(() => {
    claimed.current = true
    setTimeout(() => {
      claimed.current = false
    }, 0)
  }, [])
  const isClaimed = useCallback(() => claimed.current, [])
  return { claim, isClaimed }
}

export function PressClaim({
  onPress,
  children,
  style,
  disabled,
  accessibilityLabel,
}: {
  onPress?: () => void
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  disabled?: boolean
  accessibilityLabel?: string
}) {
  const { claim, isClaimed } = usePressClaim()
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPressIn={claim}
      onPress={() => {
        // A press an inner target already handled does not also fire the card.
        if (isClaimed()) return
        onPress?.()
      }}
      style={style}
    >
      {children}
    </Pressable>
  )
}

export function PressableScale({
  onPress,
  children,
  wrapperStyle,
  style,
  scale = 0.975,
  disabled,
  accessibilityLabel,
}: {
  onPress?: () => void
  children: React.ReactNode
  wrapperStyle?: StyleProp<ViewStyle>
  style?: StyleProp<ViewStyle>
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
    // Backstop: a stalled frame loop (hidden tab) must never park a press.
    timer.current = setTimeout(() => v.setValue(to), ms + 140)
  }

  return (
    <Animated.View style={[{ transform: [{ scale: v }] }, wrapperStyle]}>
      <Pressable
        onPress={onPress}
        disabled={disabled ?? !onPress}
        accessibilityLabel={accessibilityLabel}
        onPressIn={() => settle(scale, 110)}
        onPressOut={() => settle(1, 140)}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  )
}

/**
 * Card illustration positioned past the card's own edge.
 *
 * Absolutely positioned and `pointerEvents="none"` — in flow it would consume
 * layout height and shove the card's content around, and a decoration that
 * swallows a tap is a bug. The height is derived from a ratio because React
 * Native does not size an Image from its intrinsic dimensions the way a browser
 * does: a width with no height lays out at zero and the artwork vanishes.
 */
export function CardArt({
  source,
  ratio,
  width,
  style,
  flip,
  opacity = 1,
}: {
  source: ImageSourcePropType
  /** height / width of the *trimmed* asset. */
  ratio: number
  width: number
  style?: StyleProp<ViewStyle>
  flip?: boolean
  opacity?: number
}) {
  return (
    <View
      pointerEvents="none"
      style={[{ position: "absolute", opacity }, style]}
    >
      <Image
        source={source}
        style={{
          width,
          height: Math.round(width * ratio),
          transform: flip ? [{ scaleX: -1 }] : undefined,
        }}
        resizeMode="contain"
      />
    </View>
  )
}

/**
 * FlexGap — the slack absorber.
 *
 * A screen laid out to its natural height leaves everything the device has
 * spare as a band of bare paper under the last element. `min` is a flexBasis
 * *and* a minHeight: the floor is not belt-and-braces, because the basis alone
 * measured zero on Android and every gap on the Dictionary collapsed. When
 * content already overflows there is no free space to share, every gap sits at
 * its designed value and the page just scrolls — which is why it is safe to add
 * and why it changes nothing on a phone-sized viewport.
 */
export function FlexGap({
  min = 0,
  max,
  style,
}: {
  min?: number
  max?: number
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View
      style={[
        { flexBasis: min, minHeight: min, flexGrow: 1, flexShrink: 1 },
        max !== undefined ? { maxHeight: max } : null,
        style,
      ]}
    />
  )
}
