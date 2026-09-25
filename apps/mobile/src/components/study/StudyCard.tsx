import { Text, View, type StyleProp, type ViewStyle } from "react-native"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
import {
  cardShadow,
  radii,
  spacing,
  studyType,
  surfaceFor,
  type Tone,
} from "./tokens"
import { PressableScale } from "./PressableScale"

/**
 * Tinted study card — the reference `IllustratedCard` shape without the
 * watercolour assets: fill + 1px border a step darker, radius 20.
 * Body pressable XOR inner actions (never nest Pressables on web).
 */
export function StudyCard({
  tone = "neutral",
  title,
  body,
  tag,
  tagTone = "review",
  onPress,
  children,
  footer,
  style,
}: {
  tone?: Tone
  title?: string
  body?: string
  tag?: string
  tagTone?: Tone
  onPress?: () => void
  children?: React.ReactNode
  footer?: React.ReactNode
  style?: StyleProp<ViewStyle>
}) {
  const { theme } = useTheme()
  const s = surfaceFor(theme, tone)
  const tagS = surfaceFor(theme, tagTone)

  const inner = (
    <View
      style={[
        {
          backgroundColor: s.fill,
          borderColor: s.border,
          borderWidth: 1,
          borderRadius: radii.card,
          padding: spacing.lg,
          gap: spacing.sm,
          ...cardShadow(theme),
        },
        style,
      ]}
    >
      {(tag || title) && (
        <View style={{ gap: spacing.xs }}>
          {!!tag && (
            <View
              style={{
                alignSelf: "flex-start",
                backgroundColor: tagS.ink,
                borderRadius: radii.tag,
                paddingHorizontal: spacing.sm,
                paddingVertical: 3,
              }}
            >
              <Text
                style={[
                  studyType.tag,
                  {
                    color: theme.white,
                    fontFamily: fonts.sans,
                    fontWeight: "800",
                  },
                ]}
              >
                {tag}
              </Text>
            </View>
          )}
          {!!title && (
            <Text
              style={[
                studyType.cardTitleSm,
                {
                  color: theme.text,
                  fontFamily: fonts.sans,
                  fontWeight: "800",
                },
              ]}
            >
              {title}
            </Text>
          )}
          {!!body && (
            <Text
              style={[
                studyType.cardBody,
                { color: theme.textMuted, fontFamily: fonts.sans },
              ]}
            >
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
    <PressableScale onPress={onPress} innerStyle={{ flexGrow: 1 }}>
      {inner}
    </PressableScale>
  )
}

/** Kicker + title header used on every study screen. */
export function SectionHeader({
  kicker,
  title,
  action,
}: {
  kicker: string
  title: string
  action?: React.ReactNode
}) {
  const { theme } = useTheme()
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={[type.labelSm, { color: theme.textMuted }]}>{kicker}</Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.md,
        }}
      >
        <Text
          style={[
            studyType.cardTitle,
            {
              color: theme.text,
              fontFamily: fonts.sans,
              fontWeight: "800",
              flex: 1,
            },
          ]}
        >
          {title}
        </Text>
        {action}
      </View>
    </View>
  )
}
