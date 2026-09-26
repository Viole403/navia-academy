import { Text } from "react-native"
import type { StyleProp, TextStyle } from "react-native"

import { paperType, families } from "@/theme/paperType"
import { useTheme } from "@/theme/ThemeProvider"
import { useDisplayMode } from "@/hooks/useDisplayMode"

/**
 * The reading and gloss under a word, character or line — minus whichever part
 * the learner has turned off.
 *
 * Mandarin carries two readings and showing both to everyone buries the entry:
 * a learner who reads pinyin fluently is handed zhuyin under every one of the
 * 16,472 words that have it, and one working towards characters wants neither.
 * The preference lives in the account so the choice follows the learner across
 * screens and to the web; a page that ignored it would contradict the setting
 * they just changed somewhere else.
 *
 * Renders nothing for a part the mode excludes, and skips zhuyin when the word
 * has none rather than reserving the space, so callers can drop it in
 * unguarded. `size="label"` is the compact variant for list rows.
 */
export function ReadingAid({
  pinyin,
  zhuyin,
  translation,
  size = "body",
  color,
  translationColor,
  translationStyle,
  numberOfLines = 1,
}: {
  pinyin?: string | null
  zhuyin?: string | null
  translation?: string | null
  size?: "body" | "label"
  /** Overrides the reading colour; defaults to the coral accent. */
  color?: string
  translationColor?: string
  translationStyle?: StyleProp<TextStyle>
  numberOfLines?: number
}) {
  const { paper } = useTheme()
  const { showsPinyin, showsZhuyin, showsTranslation } = useDisplayMode()

  const p = pinyin?.trim() || ""
  const z = zhuyin?.trim() || ""
  const t = translation?.trim() || ""

  const wantP = showsPinyin() && p !== ""
  const wantZ = showsZhuyin() && z !== ""
  const wantT = showsTranslation() && t !== ""

  if (!wantP && !wantZ && !wantT) return null

  const label = size === "label"
  const readingStyle: StyleProp<TextStyle> = [
    label ? paperType.statLabel : paperType.cardBody,
    { color: color ?? paper.coral, fontFamily: families.nunitoBold },
  ]
  const glossStyle: StyleProp<TextStyle> = [
    label ? paperType.statLabel : paperType.proseSm,
    { color: translationColor ?? paper.inkMuted },
    translationStyle,
  ]

  return (
    <>
      {wantP && (
        <Text numberOfLines={numberOfLines} style={readingStyle}>
          {p}
        </Text>
      )}
      {wantZ && (
        <Text
          numberOfLines={numberOfLines}
          style={[
            label ? paperType.statLabel : paperType.bodySm,
            { color: color ?? paper.inkSoft },
          ]}
        >
          {z}
        </Text>
      )}
      {wantT && (
        <Text numberOfLines={numberOfLines} style={glossStyle}>
          {t}
        </Text>
      )}
    </>
  )
}
