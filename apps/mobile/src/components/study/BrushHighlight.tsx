import { memo } from "react"
import {
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native"
import Svg, { Path } from "react-native-svg"
import { useTheme } from "@/theme/ThemeProvider"
import { paperType, families } from "@/theme/paperType"

/**
 * BrushHighlight — the handwritten marker stroke, drawn as SVG.
 *
 * One of these per screen at most. The path is a single asymmetric sweep with
 * a squared-off left tail and a tapering right end, so it reads as a marker
 * dragged left-to-right rather than a highlighter rectangle. The `fleck` is
 * optional because the detached dash behind a long word reads as a stray
 * rectangle; a short name under Caveat is exactly the case where it does not.
 */
const STROKE =
  "M3 15.4C28 10.2 74 6.1 140 5.2c18-.2 34 1.1 45 3.6-11 3.2-27 5-47 5.3C72 14.7 28 16.1 3 15.4Z"

export const BrushHighlight = memo(function BrushHighlight({
  children,
  color,
  fleck = true,
  style,
  textStyle,
}: {
  children: React.ReactNode
  color?: string
  fleck?: boolean
  style?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
}) {
  const { paper } = useTheme()
  const ink = color ?? paper.goldSoft
  return (
    <View style={[{ alignSelf: "flex-start" }, style]}>
      <View style={{ position: "absolute", left: -2, right: -2, top: "38%" }}>
        <Svg
          width="100%"
          height="60%"
          viewBox="0 0 190 22"
          preserveAspectRatio="none"
        >
          <Path d={STROKE} fill={ink} />
          {fleck ? (
            <Path
              d="M6 19.6c-1.6.5-2.6 1.3-3 2.3 1.2.3 2.6-.1 4.2-1.2-.3-.6-.7-1-1.2-1.1Z"
              fill={ink}
            />
          ) : null}
        </Svg>
      </View>
      <Text
        style={[
          paperType.note,
          { color: paper.ink, fontFamily: families.handwriting },
          textStyle,
        ]}
      >
        {children}
      </Text>
    </View>
  )
})
