import { Text, View, type StyleProp, type ViewStyle } from "react-native"
import { useTheme } from "@/theme/ThemeProvider"
import { mix } from "@/theme/paper"
import { paperType } from "@/theme/paperType"
import { PressableScale, PressClaim, CardArt } from "./press"
import type { ImageSourcePropType } from "react-native"

/**
 * The card family. A card separates itself from the page with a
 * tint and a 1px border, never with a shadow; the shadow here is a hint that
 * stops it lying completely flat, and it is tinted with the ink rather than
 * black because a black shadow over warm paper reads as grey dirt.
 */
export type CardTone = "review" | "word" | "challenge" | "week" | "plain"

function surfaceOf(
  paper: ReturnType<typeof useTheme>["paper"],
  tone: CardTone
) {
  switch (tone) {
    case "review":
      return paper.surface.review
    case "word":
      return paper.surface.word
    case "challenge":
      return paper.surface.challenge
    case "week":
      return paper.surface.week
    case "plain":
      return { fill: paper.card, border: paper.line }
  }
}

export function PaperCard({
  tone = "plain",
  tag,
  tagTone,
  title,
  body,
  onPress,
  art,
  artRatio,
  artWidth,
  artStyle,
  artFlip,
  footer,
  style,
  padded = true,
  children,
}: {
  tone?: CardTone
  tag?: string
  tagTone?: CardTone
  title?: string
  body?: string
  onPress?: () => void
  art?: ImageSourcePropType
  artRatio?: number
  artWidth?: number
  artStyle?: StyleProp<ViewStyle>
  artFlip?: boolean
  footer?: React.ReactNode
  style?: StyleProp<ViewStyle>
  padded?: boolean
  children?: React.ReactNode
}) {
  const { paper } = useTheme()
  const s = surfaceOf(paper, tone)
  const tagSurface = surfaceOf(paper, tagTone ?? tone)

  const inner = (
    <View
      style={[
        {
          backgroundColor: s.fill,
          borderColor: s.border,
          borderWidth: 1,
          borderRadius: paper.radius.card,
          padding: padded ? 16 : 0,
          gap: 8,
          overflow: "hidden",
          ...paper.shadow,
        },
        style,
      ]}
    >
      {art && artRatio && artWidth ? (
        <CardArt
          source={art}
          ratio={artRatio}
          width={artWidth}
          flip={artFlip}
          style={artStyle}
        />
      ) : null}
      {(tag || title) && (
        <View style={{ gap: 4 }}>
          {!!tag && (
            <View
              style={{
                alignSelf: "flex-start",
                backgroundColor: tagSurface.border,
                borderRadius: paper.radius.tag,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Text style={[paperType.tag, { color: tagSurface.fill }]}>
                {tag}
              </Text>
            </View>
          )}
          {!!title && (
            <Text style={[paperType.cardTitleSm, { color: paper.ink }]}>
              {title}
            </Text>
          )}
          {!!body && (
            <Text style={[paperType.cardBody, { color: paper.inkSoft }]}>
              {body}
            </Text>
          )}
        </View>
      )}
      {children}
      {footer}
    </View>
  )

  if (!onPress) return inner
  return (
    <PressClaim onPress={onPress} style={style}>
      {inner}
    </PressClaim>
  )
}

/**
 * The two-part button. A "shoulder" sits behind the face carrying the shadow,
 * and the face translates down onto it by exactly LIFT on press — which is what
 * makes it read as depressed rather than merely dimmed. The shoulder colour is
 * one step below the face: too close and it looks like a stray outline, too
 * far and the button looks broken.
 */
const LIFT = 4

export function LiftedFace({
  title,
  onPress,
  face,
  shoulder,
  textColor,
  small,
  disabled,
  style,
}: {
  title: string
  onPress?: () => void
  face?: string
  /** Colour of the sliver behind the button. Defaults to the face, darkened. */
  shoulder?: string
  textColor?: string
  small?: boolean
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const { paper, resolvedMode } = useTheme()
  const faceColor = face ?? paper.coral
  // Derived from the face rather than picked from a palette: a caller that passes
  // a green face used to get the coral shoulder, so the button wore two colours.
  const shoulderColor =
    shoulder ??
    mix(faceColor, resolvedMode === "dark" ? "#000000" : paper.paper, 0.24)
  const height = small ? 40 : 52
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      wrapperStyle={[{ opacity: disabled ? 0.5 : 1 }, style]}
    >
      <View style={{ paddingBottom: LIFT }}>
        <View
          style={{
            position: "absolute",
            // Below the face, per paper.shoulder's own note. Sitting it on top put
            // a 4px sliver above the button whose taller radius made its corners
            // curve out past the face's — a long line around three edges.
            top: LIFT,
            left: 0,
            right: 0,
            height: height + LIFT,
            borderRadius: paper.radius.pill,
            backgroundColor: shoulderColor,
          }}
        />
        <View
          style={{
            height,
            borderRadius: paper.radius.pill,
            backgroundColor: faceColor,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 20,
            ...paper.shadowLifted,
          }}
        >
          <Text style={[paperType.button, { color: textColor ?? "#FFFFFF" }]}>
            {title}
          </Text>
        </View>
      </View>
    </PressableScale>
  )
}

/** A pill that reads as the thing inside a card, not a card itself. */
export function QuietPill({
  title,
  onPress,
  tone,
  style,
}: {
  title: string
  onPress?: () => void
  tone?: CardTone
  style?: StyleProp<ViewStyle>
}) {
  const { paper } = useTheme()
  const s = surfaceOf(paper, tone ?? "review")
  return (
    <PressableScale onPress={onPress} wrapperStyle={style} scale={0.96}>
      <View
        style={{
          alignSelf: "flex-start",
          backgroundColor: s.fill,
          borderColor: s.border,
          borderWidth: 1,
          borderRadius: paper.radius.pill,
          paddingHorizontal: 14,
          paddingVertical: 9,
        }}
      >
        <Text style={[paperType.link, { color: s.border }]}>{title}</Text>
      </View>
    </PressableScale>
  )
}

export function PaperStat({
  value,
  label,
  ink,
  style,
}: {
  value: React.ReactNode
  label: string
  ink?: string
  style?: StyleProp<ViewStyle>
}) {
  const { paper } = useTheme()
  return (
    <View style={[{ gap: 4 }, style]}>
      <Text style={[paperType.statValue, { color: ink ?? paper.green }]}>
        {value}
      </Text>
      <Text style={[paperType.statLabel, { color: paper.inkMuted }]}>
        {label}
      </Text>
    </View>
  )
}
