import { useMemo } from "react"
import { Animated, Image, Text, View, useWindowDimensions } from "react-native"
import { useTheme } from "@/theme/ThemeProvider"
import { paperType, families } from "@/theme/paperType"
import { useTargetLanguage } from "@/hooks/useTargetLanguage"
import { Shifu } from "./Shifu"
import { artRatio, decorFor } from "./art"
import { useReveal } from "./Reveal"
import { useT } from "@/i18n"

/*
 * The review hub's hero strip.
 *
 * Both numbers below are load-bearing:
 *
 *  - **The bubble's width is derived, never hardcoded.** It is capped at
 *    `peaksLeft - bubbleLeft - 8`, where `peaksLeft` comes from the range's
 *    share, so the bubble is guaranteed clear of the near slope at any screen
 *    width. A fixed margin measured against one window covers the artwork on
 *    every other one — which is exactly how the bubble ended up over the
 *    roofline.
 *  - The clearance rule is "clear of **the near slope**", not "clear of the
 *    range". The range bleeds off the right edge and its faint left end is meant
 *    to sit under the text; treating the whole image as an obstacle is what
 *    leaves the strip mostly empty.
 */
const RANGE_SHARE = 0.56
const RANGE_BLEED = 40
const PEAKS_SHARE = 0.36
const SHIFU_WIDTH = 84

export function ReviewHero({
  headline,
  body,
  run,
}: {
  headline: string
  body: string
  run: number
}) {
  const { paper } = useTheme()
  const { peaks } = decorFor(useTargetLanguage())
  const { width } = useWindowDimensions()

  const rangeWidth = width * RANGE_SHARE
  const peaksLeft = width + RANGE_BLEED - rangeWidth * PEAKS_SHARE
  const bubbleLeft = SHIFU_WIDTH + 6
  const bubbleMax = Math.max(150, peaksLeft - bubbleLeft - 8)

  const beat = { at: 0, duration: 420, run }
  const scenery = useReveal(beat)
  const bubble = useReveal({ ...beat, distance: 30 })

  const bubbleText = useMemo(() => body, [body])

  return (
    <View style={{ height: 132, overflow: "hidden" }}>
      {/* Scenery, in from the right. */}
      <Animated.View
        style={{
          position: "absolute",
          opacity: scenery.opacity,
          transform: [{ translateX: scenery.translate }],
        }}
        pointerEvents="none"
      >
        <Image
          source={peaks}
          style={{
            position: "absolute",
            right: -RANGE_BLEED,
            bottom: -6,
            width: rangeWidth,
            height: rangeWidth * artRatio.peaks,
            transform: [{ scaleX: -1 }],
          }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </Animated.View>

      {/* Shifu, small and head-on beside the bubble. */}
      <View
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: SHIFU_WIDTH,
          height: 120,
        }}
      >
        <Shifu pose="rest" size={84} />
      </View>

      {/* The bubble, arriving from below. */}
      <Animated.View
        style={{
          position: "absolute",
          left: bubbleLeft,
          bottom: 18,
          maxWidth: bubbleMax,
          backgroundColor: paper.card,
          borderColor: paper.line,
          borderWidth: 1,
          borderTopLeftRadius: 4,
          borderRadius: paper.radius.inner,
          padding: 12,
          opacity: bubble.opacity,
          transform: [{ translateY: bubble.translate }],
          ...paper.shadow,
        }}
      >
        <Text
          style={[
            paperType.cardTitleSm,
            { color: paper.ink, fontFamily: families.nunitoExtraBold },
          ]}
        >
          {headline}
        </Text>
        <Text
          style={[
            paperType.cardBody,
            {
              color: paper.inkSoft,
              fontFamily: families.nunitoSemiBold,
              marginTop: 2,
            },
          ]}
        >
          {bubbleText}
        </Text>
      </Animated.View>
    </View>
  )
}
