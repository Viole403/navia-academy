import { useMemo } from "react"
import { ScrollView, Text, View, useWindowDimensions } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentFaces } from "@/hooks/useContentFaces"
import { useContentLayout } from "@/theme/layout"
import { paperType, families, hanziType } from "@/theme/paperType"
import { loadVocabulary, loadReadings } from "@/lib/content-data"
import { headword } from "@/lib/languages"
import { segmentText, type TextSegment } from "@/lib/segment"
import { useOnboardingStore } from "@/store/onboarding"
import { useT } from "@/i18n"
import { BackLink } from "@/components/ui/BackLink"
import { decorArt, artRatio } from "./art"
import { tick } from "@/utils/feedback"
import { useTargetLanguage } from "@/hooks/useTargetLanguage"

/**
 * Segmented reading text.
 *
 * Every recognised word is tappable and opens its dictionary entry; unknown runs
 * are not. That is the whole feature: a graded reader you can stop and look
 * something up in, without leaving the page.
 */
export function TappableText({
  text,
  size = 22,
  showUnderline = true,
}: {
  text: string
  size?: number
  showUnderline?: boolean
}) {
  const { paper } = useTheme()
  const faces = useContentFaces()
  const router = useRouter()
  const language = useTargetLanguage()

  const vocabQ = useQuery({
    queryKey: ["vocab-all", language],
    queryFn: () => loadVocabulary(language),
  })

  const segments = useMemo(
    () => segmentText(text, vocabQ.data ?? []),
    [text, vocabQ.data]
  )

  if (segments.length === 0) return null

  return (
    <Text
      style={{
        fontFamily: faces.display,
        ...hanziType(size),
        color: paper.ink,
      }}
    >
      {segments.map((seg, i) => (
        <Segment
          key={i}
          seg={seg}
          underline={showUnderline}
          onPress={() => {
            if (!seg.word) return
            tick()
            router.push({
              pathname: "/vocab/[id]",
              params: { id: seg.word.id },
            })
          }}
        />
      ))}
    </Text>
  )
}

function Segment({
  seg,
  underline,
  onPress,
}: {
  seg: TextSegment
  underline: boolean
  onPress: () => void
}) {
  const { paper } = useTheme()
  if (!seg.known) {
    // Unknown runs render plainly: no tap target, no underline, no false
    // promise that the word is in the bank.
    return <Text style={{ color: paper.inkMuted }}>{seg.text}</Text>
  }
  return (
    <Text
      onPress={onPress}
      style={
        underline
          ? {
              textDecorationLine: "underline",
              textDecorationColor: paper.greenRing,
              textDecorationStyle: "dashed",
            }
          : undefined
      }
    >
      {seg.text}
    </Text>
  )
}

/**
 * The reading page.
 *
 * A cream page capped at 430pt, with the ink-wash range and drifting clouds as
 * absolutely-positioned decoration. The art is out of flow on purpose: in flow
 * it would consume layout height and shove the text down the page, and a
 * decoration that swallows a tap is a bug.
 */
export function ReadingShell({
  title,
  kicker,
  fallback,
  children,
}: {
  title: string
  kicker?: string
  fallback: string
  children: React.ReactNode
}) {
  const { paper } = useTheme()
  const t = useT()
  const router = useRouter()
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
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: 48,
          flexGrow: 1,
          alignItems: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: columnWidth, padding: 20, gap: 18 }}>
          {/* Scenery, out of flow, non-interactive. */}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 0,
            }}
          >
            <View
              style={{
                position: "absolute",
                right: -20,
                top: 0,
                width: 180,
                height: 180 * artRatio.mountainsWide,
              }}
            >
              <View style={{ flex: 1 }} />
            </View>
          </View>

          <Text
            style={[
              paperType.cardTitle,
              { color: paper.ink, fontFamily: families.nunitoExtraBold },
            ]}
          >
            {title}
          </Text>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

/** A painted glyph tile, the fallback when a reading has no cover art. */
export function GlyphTile({
  text,
  size = 76,
}: {
  text: string
  size?: number
}) {
  const { paper } = useTheme()
  const faces = useContentFaces()
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: paper.radius.inner,
        backgroundColor: paper.surface.week.fill,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontFamily: faces.display,
          ...hanziType(Math.round(size * 0.5)),
          color: paper.greenDark,
        }}
      >
        {headword({ hanzi: text }) || text}
      </Text>
    </View>
  )
}

export { decorArt }
