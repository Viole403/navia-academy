import { useMemo } from "react"
import { Image, Text, View, useWindowDimensions } from "react-native"
import { useTheme } from "@/theme/ThemeProvider"
import { paperType, families } from "@/theme/paperType"
import { Shifu } from "./Shifu"
import { onbArt, artRatio } from "./art"
import { useReveal } from "./Reveal"
import { useT } from "@/i18n"

/*
 * The Review hub's hero strip.
 *
 * The reference's geometry is kept because both of its numbers are load-bearing
 * and were bugs first:
 *
 *  - **The bubble's width is derived, never hardcoded.** It is capped at
 *    `pagodaLeft - bubbleLeft - 8`, where `pagodaLeft` comes from the range's
 *    share, so the bubble is guaranteed clear of the pagoda at any screen width.
 *    A fixed margin measured against one window covers the artwork on every
 *    other one — which is exactly how the bubble ended up over the roofline.
 *  - The clearance rule is "clear of **the pagoda**", not "clear of the range".
 *    The range bleeds off the right edge and its faint left end is meant to sit
 *    under the text; treating the whole image as an obstacle is what leaves the
 *    strip mostly empty.
 */
const RANGE_SHARE = 0.56
const RANGE_BLEED = 40
const PAGODA_SHARE = 0.36
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
  const { width } = useWindowDimensions()

  const rangeWidth = width * RANGE_SHARE
  const pagodaLeft = width + RANGE_BLEED - rangeWidth * PAGODA_SHARE
  const bubbleLeft = SHIFU_WIDTH + 6
  const bubbleMax = Math.max(150, pagodaLeft - bubbleLeft - 8)

  const beat = { at: 0, duration: 420, run }
  const scenery = useReveal(beat)
  const bubble = useReveal({ ...beat, distance: 30 })

  const bubbleText = useMemo(() => body, [body])

  return (
    <View style={{ height: 132, overflow: "hidden" }}>
      {/* Scenery, in from the right. */}
      <View
        style={{
          position: "absolute",
          opacity: scenery.opacity,
          transform: [{ translateX: scenery.translate }],
        }}
        pointerEvents="none"
      >
        <Image
          source={onbArt.pagodaMountains}
          style={{
            position: "absolute",
            right: -RANGE_BLEED,
            bottom: -6,
            width: rangeWidth,
            height: rangeWidth * artRatio.pagodaMountains,
            transform: [{ scaleX: -1 }],
          }}
          resizeMode="contain"
        />
      </View>

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
      <View
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
      </View>
    </View>
  )
}
