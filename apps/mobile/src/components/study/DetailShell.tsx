import type { ReactNode } from "react"
import { ScrollView, Text, View } from "react-native"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentLayout } from "@/theme/layout"
import { paperType, families } from "@/theme/paperType"
import { useT } from "@/i18n"
import { BackLink } from "@/components/ui/BackLink"
import { FlexGap } from "./press"

/**
 * The detail shell: the frame every pushed detail screen sits in.
 *
 * Back is guarded — a deep link or a full reload leaves an empty stack, where
 * `router.back()` does nothing, so a correct-looking arrow can be inert. Detail
 * views are pushed rather than switched to, so the browse screen underneath
 * stays mounted and its search text and filters survive the round trip.
 */
export function DetailShell({
  title,
  kicker,
  fallback,
  headerRight,
  children,
  footer,
}: {
  title: string
  kicker?: string
  /** Where a guarded back goes when there is no history. */
  fallback: string
  headerRight?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  const { paper } = useTheme()
  const insets = useSafeAreaInsets()
  const t = useT()
  const { column: columnWidth } = useContentLayout()

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: paper.paper }}
      edges={["top"]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 12,
        }}
      >
        <BackLink label={t("common.back")} fallback={fallback} />
        {!!kicker && (
          <Text
            numberOfLines={1}
            style={[
              paperType.statLabel,
              { color: paper.inkMuted, fontFamily: families.nunitoSemiBold },
            ]}
          >
            {kicker}
          </Text>
        )}
        {headerRight ?? <View style={{ width: 18 }} />}
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: 48,
          flexGrow: 1,
          alignItems: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: columnWidth, padding: 20, gap: 16 }}>
          <Text
            style={[
              paperType.cardTitle,
              { color: paper.ink, fontFamily: families.nunitoExtraBold },
            ]}
          >
            {title}
          </Text>
          {children}
          <FlexGap min={0} />
        </View>
      </ScrollView>

      {footer ? (
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 12,
            // The root only claims the top edge, so the footer owns the bottom
            // inset. A flat 28 left the action row under a 3-button nav bar.
            paddingBottom: insets.bottom + 12,
            backgroundColor: paper.paper,
            borderTopWidth: 1,
            borderTopColor: paper.line,
          }}
        >
          <View style={{ width: columnWidth, alignSelf: "center" }}>
            {footer}
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  )
}
