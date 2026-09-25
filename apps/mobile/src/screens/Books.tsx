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
import { paperType, families } from "@/theme/paperType"
import { loadReadings } from "@/lib/content-data"
import { useOnboardingStore } from "@/store/onboarding"
import { useT, useLocaleStore } from "@/i18n"
import { tap } from "@/utils/feedback"
import type { Reading } from "@/types/api"

const BOOKS_CONTENT_MAX = 430

/**
 * Books — the reading library, on shelves.
 *
 * The reference has 46 hand-authored stories with 31 painted covers and a
 * painted-glyph fallback for the other 15. This repo has **148 readings and no
 * cover art in the content** — so every tile is the fallback, and pretending
 * otherwise by importing 31 mismatched images would be decorating content that
 * is not there. Sharding by level is the shelf.
 */
export function Books() {
  const { paper } = useTheme()
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const router = useRouter()
  const language = useOnboardingStore((s) => s.language)
  const { width } = useWindowDimensions()
  const columnWidth = Math.min(width, BOOKS_CONTENT_MAX)

  const readingsQ = useQuery({
    queryKey: ["library-readings", language],
    queryFn: () => loadReadings(language),
  })

  const shelves = useMemo(() => {
    const all = readingsQ.data ?? []
    const map = new Map<string, Reading[]>()
    for (const r of all) {
      const key = r.level ?? (r.hsk ? `HSK ${r.hsk}` : "")
      const label = key || t("books.general")
      const list = map.get(label) ?? []
      list.push(r)
      map.set(label, list)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [readingsQ.data, t])

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
        <Pressable
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(tabs)/learn" as never)
          }
        >
          <Text
            style={[
              paperType.link,
              { color: paper.inkSoft, fontFamily: families.nunitoBold },
            ]}
          >
            ← {t("common.back")}
          </Text>
        </Pressable>
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

          {shelves.map(([shelf, items]) => (
            <View key={shelf} style={{ gap: 10 }}>
              <Text
                style={[
                  paperType.cardTitleSm,
                  { color: paper.ink, fontFamily: families.nunitoExtraBold },
                ]}
              >
                {shelf}
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
