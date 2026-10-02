import { BackLink } from "@/components/ui/BackLink"
import { useMemo } from "react"
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { PaperCard, QuietPill } from "@/components/study/PaperCard"
import { GlyphTile } from "@/components/study/reading"
import { FlexGap } from "@/components/study/press"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentLayout } from "@/theme/layout"
import { paperType, families } from "@/theme/paperType"
import { loadReadings } from "@/lib/content-data"
import { groupIntoShelves } from "@/lib/shelves"
import { useOnboardingStore } from "@/store/onboarding"
import { useT, useLocaleStore } from "@/i18n"
import { tap } from "@/utils/feedback"
import type { Reading } from "@/types/api"
import { useTargetLanguage } from "@/hooks/useTargetLanguage"

/**
 * Books — the reading library, on shelves.
 *
 * 148 readings, and the content carries **no cover art** — so every tile is the
 * painted-glyph fallback, and importing a set of mismatched covers would be
 * decorating stories this app does not have. Sharding by level is the shelf.
 */
export function Books() {
  const { paper } = useTheme()
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const router = useRouter()
  const language = useTargetLanguage()
  const { column: columnWidth } = useContentLayout()

  const readingsQ = useQuery({
    queryKey: ["library-readings", language],
    queryFn: () => loadReadings(language),
  })

  const shelves = useMemo(
    () => groupIntoShelves(readingsQ.data ?? [], t("books.general")),
    [readingsQ.data, t]
  )

  const summary = (r: Reading) => {
    const rec = r as unknown as { summary_id?: string; summary_en?: string }
    return (
      (locale === "id" ? rec.summary_id : rec.summary_en) ?? r.summary ?? ""
    )
  }

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
        <BackLink label={t("common.back")} fallback="/(tabs)/learn" />
        <Text
          style={[
            paperType.statLabel,
            { color: paper.inkMuted, fontFamily: families.nunitoSemiBold },
          ]}
        >
          {t("books.count", { n: (readingsQ.data ?? []).length })}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: 40,
          flexGrow: 1,
          alignItems: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: columnWidth, padding: 20, gap: 18 }}>
          <View style={{ gap: 4 }}>
            <Text
              style={[
                paperType.statLabel,
                { color: paper.inkMuted, fontFamily: families.nunitoSemiBold },
              ]}
            >
              {t("books.kicker")}
            </Text>
            <Text
              style={[
                paperType.greeting,
                { color: paper.ink, fontFamily: families.nunitoExtraBold },
              ]}
            >
              {t("books.title")}
            </Text>
          </View>

          {shelves.map(({ label, items }) => (
            <View key={label} style={{ gap: 10 }}>
              <Text
                style={[
                  paperType.cardTitleSm,
                  { color: paper.ink, fontFamily: families.nunitoExtraBold },
                ]}
              >
                {label}
              </Text>
              <View style={{ gap: 8 }}>
                {items.map((r) => (
                  <Pressable
                    key={r.id}
                    onPress={() => {
                      tap()
                      router.push({
                        pathname: "/reading/[id]",
                        params: { id: r.id },
                      })
                    }}
                  >
                    <PaperCard tone="plain">
                      <View
                        style={{
                          flexDirection: "row",
                          gap: 12,
                          alignItems: "center",
                        }}
                      >
                        <GlyphTile
                          text={(
                            r.paragraphs?.[0]?.hanzi ??
                            r.title ??
                            "读"
                          ).slice(0, 1)}
                        />
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text
                            numberOfLines={1}
                            style={[
                              paperType.cardBody,
                              {
                                color: paper.ink,
                                fontFamily: families.nunitoExtraBold,
                              },
                            ]}
                          >
                            {r.title}
                          </Text>
                          {!!summary(r) && (
                            <Text
                              numberOfLines={2}
                              style={[
                                paperType.statLabel,
                                {
                                  color: paper.inkMuted,
                                  fontFamily: families.nunitoSemiBold,
                                },
                              ]}
                            >
                              {summary(r)}
                            </Text>
                          )}
                          <Text
                            style={[
                              paperType.statLabel,
                              {
                                color: paper.greenDark,
                                fontFamily: families.nunitoBold,
                              },
                            ]}
                          >
                            {r.wordCount ?? 0} {t("read.words")}
                          </Text>
                        </View>
                      </View>
                    </PaperCard>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}

          {shelves.length === 0 && !readingsQ.isLoading ? (
            <PaperCard tone="plain">
              <Text
                style={[
                  paperType.cardBody,
                  {
                    color: paper.inkMuted,
                    fontFamily: families.nunitoSemiBold,
                  },
                ]}
              >
                {t("lib.nothingMsg")}
              </Text>
            </PaperCard>
          ) : null}

          <QuietPill
            title={t("lib.conversations")}
            tone="challenge"
            onPress={() => router.push("/library")}
          />

          <FlexGap min={0} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
