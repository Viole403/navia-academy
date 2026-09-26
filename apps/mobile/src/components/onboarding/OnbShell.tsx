import { useEffect, useRef, useState } from "react"
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentFaces } from "@/hooks/useContentFaces"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { paperType, families } from "@/theme/paperType"
import { FlexGap } from "@/components/study/press"
import { onbArt, artRatio } from "@/components/study/art"

/**
 * The onboarding shell: **three regions — top bar, flexible middle, stable
 * footer** — and only the middle grows.
 *
 * That split is the whole design. It is what keeps the primary button on the
 * same line across every step instead of walking up and down the page as the
 * learner advances, and it is why the middle is a scroll view with
 * `flexGrow: 1`: it fills a tall screen and still scrolls on a short one rather
 * than collapsing to its content.
 *
 * Decoration is absolutely positioned and allowed to bleed off the edge. A
 * mountain panorama placed as a normal flex child consumes layout height and
 * shoves the footer around; out of flow it costs nothing. Art also ignores the
 * content margin on purpose — a branch that stops inside the margin reads as a
 * sticker, one clipped by the screen edge reads as a branch.
 */
export function OnbShell({
  dots,
  stepIndex,
  onBack,
  footer,
  children,
  scroll = true,
  art = "none",
}: {
  dots: number
  stepIndex: number
  onBack?: () => void
  footer?: React.ReactNode
  children: React.ReactNode
  /** The welcome screen has nothing to scroll. */
  scroll?: boolean
  art?: "none" | "branch" | "pagoda" | "panorama"
}) {
  const { paper } = useTheme()
  // Real device insets, not a guess.
  //
  // The app targets an SDK that draws edge to edge, so the window runs under
  // the status bar and the navigation bar. A fixed padding cannot know how
  // tall either of those is: the status bar changes with the camera cutout,
  // which is top-left, top-centre or top-right depending on the handset, and
  // the bottom is a gesture bar on one phone and three buttons on the next.
  const insets = useSafeAreaInsets()
  // Grows to fill the scroll area rather than sitting at the top of it. Without
  // this the body is exactly as tall as its content, and a step whose layout
  // relies on a flexible region — the welcome screen's art is `flex: 1` inside a
  // `justifyContent: flex-end` box — has nothing to fill, so that region
  // collapses to zero and the art renders blank against the top of the page.
  const body = (
    <View
      style={{
        flexGrow: 1,
        paddingLeft: 22 + insets.left,
        paddingRight: 22 + insets.right,
        paddingTop: 18,
        paddingBottom: 18,
        gap: 18,
      }}
    >
      {children}
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: paper.paper }}>
      {/* Decoration layer: out of flow, and never a tap target. */}
      {art !== "none" ? (
        <View
          pointerEvents="none"
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        >
          {art === "branch" ? (
            <Image
              source={onbArt.sakuraBranch}
              style={{
                position: "absolute",
                top: 40,
                left: -20,
                width: 190,
                height: 190 * artRatio.sakuraBranch,
              }}
              resizeMode="contain"
            />
          ) : null}
          {art === "pagoda" ? (
            <Image
              source={onbArt.pagodaMountains}
              style={{
                position: "absolute",
                top: 30,
                right: -20,
                width: 220,
                height: 220 * artRatio.pagodaMountains,
                transform: [{ scaleX: -1 }],
              }}
              resizeMode="contain"
            />
          ) : null}
          {art === "panorama" ? (
            <Image
              source={onbArt.mountainsPanorama}
              style={{
                position: "absolute",
                left: -12,
                right: -12,
                bottom: 0,
                width: "100%",
                height: 150,
              }}
              resizeMode="contain"
            />
          ) : null}
        </View>
      ) : null}

      {/* Top bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingLeft: 22 + insets.left,
          paddingRight: 22 + insets.right,
          paddingTop: insets.top + 12,
          paddingBottom: 8,
        }}
      >
        {onBack ? (
          <PressBack onPress={onBack} />
        ) : (
          <View style={{ width: 44 }} />
        )}
        <OnbDots total={dots} active={stepIndex} />
        <View style={{ width: 44 }} />
      </View>

      {/* Middle: the only region that grows. */}
      {scroll ? (
        <ScrollArea>{body}</ScrollArea>
      ) : (
        <View style={{ flex: 1 }}>{body}</View>
      )}

      {/* Footer: stable height, so the button never moves. */}
      {footer ? (
        <View
          style={{
            paddingLeft: 22 + insets.left,
            paddingRight: 22 + insets.right,
            paddingBottom: Math.max(insets.bottom, 12) + 14,
          }}
        >
          {footer}
        </View>
      ) : null}
    </View>
  )
}

function ScrollArea({ children }: { children: React.ReactNode }) {
  // Imported lazily to keep this module free of a react-native scroll import
  // cycle; the shell is the only consumer.
  const { ScrollView } =
    require("react-native") as typeof import("react-native")
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  )
}

function PressBack({ onPress }: { onPress: () => void }) {
  const { paper } = useTheme()
  const { Pressable } = require("react-native") as typeof import("react-native")
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={{ width: 44, height: 44, justifyContent: "center" }}
    >
      <Text style={{ color: paper.inkMuted, fontSize: 17 }}>←</Text>
    </Pressable>
  )
}

/**
 * The footer dots are the flow's **only** progress indicator, and both the dots
 * and the step order derive from one array — inserting a step moves every dot
 * without a number being edited anywhere. There are deliberately no numbered
 * step pills: two indicators saying the same thing in different units, disagreeing
 * about how many steps there are, is worse than one.
 */
export function OnbDots({ total, active }: { total: number; active: number }) {
  const { paper } = useTheme()
  return (
    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === active ? 20 : 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: i <= active ? paper.coral : paper.track,
          }}
        />
      ))}
    </View>
  )
}

/**
 * An arriving element.
 *
 * Fades 0→1 and rises on one `Easing.out(Easing.cubic)`, staggered by `index`.
 * The backstop is not optional: without the native driver this runs on
 * requestAnimationFrame, which a browser stops dead for a hidden tab, so opening
 * the app in a background tab and returning would find every element parked at
 * opacity 0, permanently.
 */
export function OnbRise({
  index = 0,
  children,
  style,
}: {
  index?: number
  children: React.ReactNode
  style?: object
}) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    v.setValue(0)
    const t = setTimeout(() => {
      Animated.timing(v, {
        toValue: 1,
        duration: 460,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }).start()
    }, index * 110)
    const backstop = setTimeout(() => v.setValue(1), index * 110 + 1000)
    return () => {
      clearTimeout(t)
      clearTimeout(backstop)
    }
  }, [index, v])
  return (
    <Animated.View
      style={[
        {
          opacity: v,
          transform: [
            {
              translateY: v.interpolate({
                inputRange: [0, 1],
                outputRange: [18, 0],
              }),
            },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  )
}

/** A selectable card: a label, an optional sub-line, a tick when chosen. */
export function OnbChoiceCard({
  title,
  sub,
  glyph,
  selected,
  onPress,
  tall,
}: {
  title: string
  sub?: string
  glyph?: string
  selected: boolean
  onPress: () => void
  /** The script page's cards are taller because the glyph *is* the question. */
  tall?: boolean
}) {
  const { paper } = useTheme()
  const faces = useContentFaces()
  const cross = useRef(new Animated.Value(selected ? 1 : 0)).current
  useEffect(() => {
    Animated.timing(cross, {
      toValue: selected ? 1 : 0,
      duration: 180,
      useNativeDriver: Platform.OS !== "web",
    }).start()
  }, [selected, cross])

  return (
    <Pressable onPress={onPress}>
      <Animated.View
        style={{
          backgroundColor: paper.card,
          borderColor: cross.interpolate({
            inputRange: [0, 1],
            outputRange: [paper.line, paper.green],
          }),
          borderWidth: 1.5,
          borderRadius: 16,
          padding: 16,
          gap: tall ? 10 : 2,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {glyph ? (
            <Text
              style={{
                fontFamily: faces.hanzi,
                fontSize: tall ? 40 : 22,
                lineHeight: tall ? 52 : 30,
                color: paper.ink,
              }}
            >
              {glyph}
            </Text>
          ) : null}
          <View style={{ flex: 1 }} />
          {selected ? (
            <Text
              style={{ color: paper.green, fontSize: 16, fontWeight: "800" }}
            >
              ✓
            </Text>
          ) : null}
        </View>
        <Text
          style={[
            paperType.cardBody,
            { color: paper.ink, fontFamily: families.nunitoExtraBold },
          ]}
        >
          {title}
        </Text>
        {!!sub && (
          <Text
            style={[
              paperType.statLabel,
              { color: paper.inkMuted, fontFamily: families.nunitoSemiBold },
            ]}
          >
            {sub}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  )
}

export { FlexGap }
