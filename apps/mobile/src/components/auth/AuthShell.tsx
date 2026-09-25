import type { ReactNode } from "react"
import type { ImageSourcePropType } from "react-native"
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentLayout } from "@/theme/layout"
import { type } from "@/theme/typography"
import { artRatio } from "@/components/study/art"
import { LiftedFace } from "@/components/study/PaperCard"

/**
 * The frame every auth screen sits in.
 *
 * Four screens each rebuilt the same safe-area + keyboard + scroll + footer
 * scaffold, and each got it slightly wrong in a different way — the footer sat
 * under the keyboard on one, was pinned to the bottom of the scroll on another,
 * and the column width ignored the shared layout rules on a third. One shell
 * means the primary action is always in the same place, on the same inset,
 * whatever the screen.
 *
 * The action is pinned **outside** the scroll view. A sign-in button that scrolls
 * away is a button the user has to hunt for, and with a keyboard open there may
 * be nowhere left to scroll to.
 *
 * The safe-area bottom inset becomes footer padding rather than a container
 * around the footer, so the lifted face keeps its shadow instead of the inset
 * clipping it.
 */
export function AuthShell({
  kicker,
  title,
  subtitle,
  children,
  action,
  onAction,
  actionTone,
  disabled,
  busy,
  footer,
  art,
  artKey,
  artHeight = 150,
}: {
  kicker?: string
  title: string
  subtitle?: string
  children?: ReactNode
  action: string
  onAction?: () => void
  actionTone?: "accent" | "green"
  disabled?: boolean
  busy?: boolean
  /** Secondary links, under the action. */
  footer?: ReactNode
  /** A study-art image, washed out behind the masthead. */
  art?: ImageSourcePropType
  /** Key into `artRatio`, so the image is not squashed. */
  artKey?: string
  artHeight?: number
}) {
  const { theme, paper } = useTheme()
  const { column } = useContentLayout()
  const insets = useSafeAreaInsets()
  const off = Boolean(disabled || busy)

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: paper.paper }}
      edges={["top"]}
    >
      {art ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            alignItems: "center",
            opacity: 0.45,
          }}
        >
          <Image
            source={art}
            resizeMode="contain"
            style={{
              width: "100%",
              height: artHeight * (artKey ? (artRatio[artKey] ?? 1) : 1),
            }}
          />
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ width: column, flexGrow: 1, gap: 22 }}>
            <View style={{ gap: 6 }}>
              {kicker ? (
                <Text style={[type.labelSm, { color: theme.textMuted }]}>
                  {kicker}
                </Text>
              ) : null}
              <Text
                style={[type.display, { color: theme.text, fontSize: 30 }]}
                numberOfLines={2}
              >
                {title}
              </Text>
              {subtitle ? (
                <Text style={[type.bodySm, { color: theme.textMuted }]}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {children}
          </View>
        </ScrollView>

        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 12) + 8,
            borderTopWidth: 1,
            borderTopColor: theme.border,
            backgroundColor: paper.paper,
          }}
        >
          <View style={{ width: column, alignSelf: "center", gap: 10 }}>
            <LiftedFace
              title={busy ? "…" : action}
              face={
                actionTone === "green"
                  ? theme.green
                  : off
                    ? theme.border
                    : theme.accent
              }
              disabled={off}
              onPress={off ? undefined : onAction}
            />
            {footer}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
