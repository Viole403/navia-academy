import type { ComponentProps, ReactNode } from "react"
import { Ionicons } from "@expo/vector-icons"
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
import { useT } from "@/i18n"
import { PressableScale } from "@/components/study/press"
import { examBadgeColor } from "@/lib/languages"

/**
 * Settings furniture.
 *
 * Settings used to live inside the profile screen as one long column of cards,
 * which meant a page that mixed "who you are" with "how much you study per day"
 * and gave every row the same visual weight. A row is a *decision*, so a row now
 * carries an icon, a title, and — when it opens something — a value and a
 * chevron, and a group is a labelled sheet of rows. A tap target is the whole
 * row, not the text inside it.
 *
 * Values sit on the right and are set in the same muted face as subtitles, so a
 * glance down the column reads settings first and state second.
 */
export function SettingsGroup({
  title,
  hint,
  children,
  last,
}: {
  title?: string
  hint?: string
  children: ReactNode
  /** Drops the bottom rule on the final group. */
  last?: boolean
}) {
  const { theme, paper } = useTheme()
  return (
    <View style={{ gap: 8 }}>
      {title ? (
        <Text
          style={[
            type.labelSm,
            { color: paper.inkMuted, paddingHorizontal: 4 },
          ]}
        >
          {title}
        </Text>
      ) : null}
      <View
        style={{
          borderRadius: paper.radius.card,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.surface,
          overflow: "hidden",
        }}
      >
        {children}
      </View>
      {hint && !last ? (
        <Text
          style={[
            type.caption,
            { color: paper.inkMuted, paddingHorizontal: 4 },
          ]}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  )
}

function RowFrame({
  children,
  onPress,
  danger,
  first,
  last,
}: {
  children: ReactNode
  onPress?: () => void
  danger?: boolean
  first?: boolean
  last?: boolean
}) {
  const { theme, paper } = useTheme()
  const body = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderTopWidth: first ? 0 : StyleSheet.hairlineWidth,
        borderTopColor: theme.border,
      }}
    >
      {children}
    </View>
  )
  if (!onPress) return body
  return (
    <Pressable
      onPress={onPress}
      // A settings row is a button; saying so keeps it out of the tab order as a
      // plain view and gives the label the right accessibility role.
      accessibilityRole="button"
      style={({ pressed }) => ({
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {body}
    </Pressable>
  )
}

export function SettingsRow({
  icon,
  title,
  sub,
  value,
  onPress,
  tint,
  danger,
  first,
  last,
}: {
  icon?: ComponentProps<typeof Ionicons>["name"]
  title: string
  sub?: string
  value?: string
  onPress?: () => void
  tint?: string
  danger?: boolean
  first?: boolean
  last?: boolean
}) {
  const { theme, paper } = useTheme()
  const fg = danger ? theme.red : theme.text
  return (
    <RowFrame onPress={onPress} danger={danger} first={first} last={last}>
      {icon ? (
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: paper.cardAlt,
          }}
        >
          <Ionicons name={icon} size={17} color={tint ?? theme.accent} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.body, { color: fg, fontFamily: fonts.sans }]}>
          {title}
        </Text>
        {sub ? (
          <Text
            style={[type.caption, { color: paper.inkMuted }]}
            numberOfLines={2}
          >
            {sub}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text
          style={[type.bodySm, { color: theme.textMuted }]}
          numberOfLines={1}
        >
          {value}
        </Text>
      ) : null}
      {onPress ? (
        <Text style={{ color: paper.inkMuted, fontSize: 16 }}>›</Text>
      ) : null}
    </RowFrame>
  )
}

export function SettingsToggle({
  icon,
  title,
  sub,
  value,
  onChange,
  tint,
  first,
  last,
  disabled,
}: {
  icon?: ComponentProps<typeof Ionicons>["name"]
  title: string
  sub?: string
  value: boolean
  onChange: (next: boolean) => void
  tint?: string
  first?: boolean
  last?: boolean
  disabled?: boolean
}) {
  const { theme, paper } = useTheme()
  return (
    <RowFrame first={first} last={last}>
      {icon ? (
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: paper.cardAlt,
          }}
        >
          <Ionicons name={icon} size={17} color={tint ?? theme.accent} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2, opacity: disabled ? 0.5 : 1 }}>
        <Text
          style={[type.body, { color: theme.text, fontFamily: fonts.sans }]}
        >
          {title}
        </Text>
        {sub ? (
          <Text style={[type.caption, { color: paper.inkMuted }]}>{sub}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: theme.border, true: theme.accent }}
        thumbColor={
          Platform.OS === "ios"
            ? undefined
            : value
              ? theme.surface
              : paper.inkMuted
        }
        ios_backgroundColor={theme.border}
      />
    </RowFrame>
  )
}

/**
 * A row of exclusive choices.
 *
 * Every option is a full-width segment rather than a wrapping chip, because the
 * options in settings are short and *comparable* — the whole point is to see
 * them side by side. Wrapping chips let a long option drop to a second line and
 * break exactly that comparison.
 */
/** One height for every choice pill, independent of the font that lands in it. */
const CHOICE_HEIGHT = 44

export function SettingsChoice({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string; tint?: string }[]
  value: string | undefined
  onChange: (id: string) => void
}) {
  const { theme, paper } = useTheme()
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        paddingHorizontal: 14,
        paddingBottom: 14,
      }}
    >
      {options.map((o) => {
        const selected = value === o.id
        return (
          <PressableScale
            key={o.id}
            onPress={() => onChange(o.id)}
            style={{
              // flex:1 made every group stretch to fill, so a 2-option row and a
              // 5-option row on the same screen produced pills 147dp and 55dp wide.
              // Sizing to content with a fixed height makes the control the same
              // object wherever it appears.
              minHeight: CHOICE_HEIGHT,
              minWidth: 72,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: paper.radius.pill,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: selected ? (o.tint ?? theme.accent) : paper.line,
              backgroundColor: selected ? paper.cardAlt : "transparent",
            }}
          >
            <Text
              numberOfLines={1}
              style={[
                type.bodySm,
                {
                  color: selected ? paper.ink : paper.inkMuted,
                  fontFamily: fonts.sans,
                  fontWeight: selected ? "700" : "500",
                },
              ]}
            >
              {o.label}
            </Text>
          </PressableScale>
        )
      })}
    </View>
  )
}

/**
 * Settings states, in one place.
 *
 * Every screen in this tree renders the same three, and each used to invent its
 * own — a spinner, a bare `null`, a bare red string. A settings screen with no
 * rows on it must explain itself: either it is still arriving, or it could not
 * arrive, and a blank page answers neither.
 */
export function SettingsState({
  kind,
  message,
  onRetry,
}: {
  kind: "loading" | "error" | "empty"
  message?: string
  onRetry?: () => void
}) {
  const { theme, paper } = useTheme()
  const t = useT()
  if (kind === "loading") {
    return (
      <View style={{ gap: 10, paddingVertical: 20 }}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              // Matches RowFrame's 34px content plus 14px padding either side, so
              // the loaded rows land where the skeleton already sat.
              height: 62,
              borderRadius: paper.radius.inner,
              borderWidth: 1,
              borderColor: paper.line,
              backgroundColor: paper.cardAlt,
              opacity: 1 - i * 0.22,
            }}
          />
        ))}
        <Text
          style={[type.caption, { color: paper.inkMuted, textAlign: "center" }]}
        >
          {t("common.loading")}
        </Text>
      </View>
    )
  }
  if (kind === "error") {
    return (
      <View style={{ alignItems: "center", gap: 10, paddingVertical: 32 }}>
        <Ionicons name="warning" size={26} color={theme.red} />
        <Text
          style={[type.body, { color: theme.text, fontFamily: fonts.sans }]}
        >
          {t("set.couldntLoad")}
        </Text>
        {message ? (
          <Text
            style={[
              type.caption,
              { color: paper.inkMuted, textAlign: "center" },
            ]}
          >
            {message}
          </Text>
        ) : null}
        {onRetry ? (
          <PressableScale
            onPress={onRetry}
            style={{
              marginTop: 4,
              paddingHorizontal: 18,
              paddingVertical: 10,
              borderRadius: paper.radius.pill,
              borderWidth: 1,
              borderColor: theme.accent,
            }}
          >
            <Text
              style={[
                type.bodySm,
                {
                  color: theme.accent,
                  fontFamily: fonts.sans,
                  fontWeight: "700",
                },
              ]}
            >
              {t("common.retry")}
            </Text>
          </PressableScale>
        ) : null}
      </View>
    )
  }
  return (
    <View style={{ alignItems: "center", gap: 6, paddingVertical: 32 }}>
      <Text style={[type.body, { color: theme.text, fontFamily: fonts.sans }]}>
        {t("set.nothingHere")}
      </Text>
    </View>
  )
}

/** Exam-typed choice row, tinted by exam so the colour means the same thing here. */
export function ExamChoice({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[]
  value: string | undefined
  onChange: (id: string) => void
}) {
  return (
    <SettingsChoice
      options={options.map((o) => ({ ...o, tint: examBadgeColor(o.id) }))}
      value={value}
      onChange={onChange}
    />
  )
}
