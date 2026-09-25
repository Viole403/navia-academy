import { useMemo } from "react"
import { Image, Text, View } from "react-native"
import { useTheme } from "@/theme/ThemeProvider"
import { paperType, families } from "@/theme/paperType"
import { BrushHighlight } from "./BrushHighlight"
import { Shifu } from "./Shifu"
import { art, artRatio } from "./art"

/**
 * The hero — ported from Chinese-Easy `components/dashboard/DashboardHero.tsx`.
 *
 * Layered back to front inside a clipped box: the mountain range, then the
 * sakura branch, then Shifu rising out of the cards, then his speech bubble.
 * Scenery is mirrored with `scaleX: -1` so its trunks and roofline sit on the
 * right rather than duplicating a second multi-hundred-kilobyte render.
 *
 * The branch is sized to clear the **longest** greeting — "Good Afternoon," is
 * wider than "Good Morning," and the shorter one is what fits by accident.
 */
export function DashboardHero({
  greeting,
  name,
  message,
  typedChars,
  heroHeight,
}: {
  greeting: string
  name: string
  /** His line, already sliced to the typed length by the caller's typewriter. */
  message: string
  typedChars: number
  heroHeight: number
}) {
  const { paper } = useTheme()
  const [lead, ...rest] = greeting.split(" ")
  const tail = rest.join(" ")

  return (
    <View
      style={{
        height: heroHeight,
        overflow: "hidden",
        borderRadius: paper.radius.card,
        backgroundColor: paper.paper,
      }}
    >
      {/* Scenery, behind everything and allowed to bleed off the edge. */}
      <View pointerEvents="none" style={{ position: "absolute", inset: 0 }}>
        <Image
          source={art.wordMountains}
          style={{
            position: "absolute",
            right: -30,
            bottom: 0,
            width: 220,
            height: 220 * artRatio.wordMountains,
            opacity: 0.9,
          }}
          resizeMode="contain"
        />
        <Image
          source={art.bonsai}
          style={{
            position: "absolute",
            left: -18,
            bottom: 0,
            width: 130,
            height: 130 * artRatio.bonsai,
          }}
          resizeMode="contain"
        />
      </View>

      {/* Greeting + name, over the scenery. */}
      <View style={{ padding: 16, gap: 2 }}>
        <Text
          style={[
            paperType.greeting,
            { color: paper.ink, fontFamily: families.nunitoExtraBold },
          ]}
        >
          {lead}
          {"\n"}
          {tail},
        </Text>
        <BrushHighlight color={paper.goldSoft} style={{ marginTop: 2 }}>
          {name}.
        </BrushHighlight>
      </View>

      {/* Shifu rises out of the bottom, clipped at the hem. */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          right: 8,
          bottom: -28,
          width: 108,
          height: 168,
        }}
      >
        <Shifu pose="bow" size={108} />
      </View>

      {/* His line, in a bubble whose width is derived so it clears Shifu. */}
      <View
        style={{
          position: "absolute",
          left: 16,
          right: 116,
          bottom: 14,
          backgroundColor: paper.card,
          borderColor: paper.line,
          borderWidth: 1,
          borderTopLeftRadius: 4,
          borderRadius: paper.radius.inner,
          padding: 12,
          ...paper.shadow,
        }}
      >
        <Text
          style={[
            paperType.bubble,
            { color: paper.ink, fontFamily: families.nunitoSemiBold },
          ]}
        >
          {message.slice(0, typedChars)}
        </Text>
      </View>
    </View>
  )
}

/** The greeting's own copy, drawn by the caller so the text can be i18n'd. */
export function greetingFor(
  hour: number,
  strings: { morning: string; afternoon: string; evening: string }
) {
  if (hour < 12) return strings.morning
  if (hour < 18) return strings.afternoon
  return strings.evening
}

/**
 * What Shifu says, chosen from live numbers.
 *
 * The due-word case is handled in the bubble itself (which sets the count in
 * bold), so these are only the lines with no number in them.
 */
export function shifuLine(
  streak: number,
  atRisk: boolean,
  strings: { default: string; streak: string; risk: string }
): string {
  if (atRisk) return strings.risk
  if (streak >= 3) return strings.streak
  return strings.default
}

/** Fixed lines, rotated by day so the same learner does not read one sentence forever. */
export const SHIFU_LINES = [
  "Small steps every day add up to big progress.",
  "Consistency beats perfection — even five minutes counts today.",
  "Ready when you are! What shall we learn today?",
  "I believe in you! Let's keep the momentum going.",
] as const

export function useShifuLine(dayIndex: number): string {
  return useMemo(() => SHIFU_LINES[dayIndex % SHIFU_LINES.length], [dayIndex])
}
