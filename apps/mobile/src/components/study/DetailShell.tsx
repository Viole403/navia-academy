import type { ReactNode } from "react"
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useTheme } from "@/theme/ThemeProvider"
import { paperType, families } from "@/theme/paperType"
import { FlexGap } from "./press"

const DETAIL_CONTENT_MAX = 430

/**
 * The detail shell — the reference's `dictionary/DetailShell`.
 *
 * Its one non-obvious rule is a **guarded** back arrow. A screen reached by deep
 * link, by a full reload, or as the first entry after a redirect has nothing to
 * pop, and `router.back()` then silently does nothing — a back arrow that looks
 * fine and is simply inert. So: `canGoBack ? back : replace(parent)`.
 *
 * This is why the Dictionary's detail views live in a stack rather than being
 * switched to as sibling screens: pushed, the browse screen stays mounted
 * underneath and its search text and filters survive the round trip.
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
  const router = useRouter()
  const { width } = useWindowDimensions()
  const columnWidth = Math.min(width, DETAIL_CONTENT_MAX)

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
        <Pressable
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace(fallback as never)
          }
        >
          <Text
            style={[
              paperType.link,
              { color: paper.inkSoft, fontFamily: families.nunitoBold },
            ]}
          >
            ←
          </Text>
        </Pressable>
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
            paddingBottom: 28,
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
