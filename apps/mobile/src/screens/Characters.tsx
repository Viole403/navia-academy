import { useMemo, useState } from "react"
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { PaperCard, QuietPill } from "@/components/study/PaperCard"
import { ReadingAid } from "@/components/study/ReadingAid"
import { FlexGap } from "@/components/study/press"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentFaces } from "@/hooks/useContentFaces"
import { useContentLayout } from "@/theme/layout"
import { paperType, families, hanziType } from "@/theme/paperType"
import { loadCharacters } from "@/lib/content-data"
import { isCharScript, motifChar } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useT } from "@/i18n"
import { tick } from "@/utils/feedback"
import type { HanziChar } from "@/types/api"

/**
 * The character grid.
 *
 * Tiles are **self-sizing** (glyph, reading, padding) with a fixed *width*, so
 * three and a bit fit and the row visibly continues to invite a swipe. A fixed
 * height here would be the full tile plus a strip of empty tile beneath every
 * one of them.
 */
export function Characters() {
  const { paper } = useTheme()
  const faces = useContentFaces()
  const t = useT()
  const router = useRouter()
  const language = useOnboardingStore((s) => s.language)
  const { column: columnWidth } = useContentLayout()

  const [query, setQuery] = useState("")

  const charsQ = useQuery({
    queryKey: ["characters", language],
    queryFn: () => loadCharacters(language),
  })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const all = charsQ.data ?? []
    if (!q) return all.slice(0, 120)
    return all
      .filter((c) => {
        const glyph = String(c.char ?? c.hanzi ?? "")
        return (
          glyph.toLowerCase().includes(q) ||
          (c.pinyin ?? "").toLowerCase().includes(q) ||
          (c.meaning ?? "").toLowerCase().includes(q)
        )
      })
      .slice(0, 120)
  }, [charsQ.data, query])

  if (!isCharScript(language)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: paper.paper }}>
        <View style={{ padding: 24, gap: 8 }}>
          <Text
            style={[
              paperType.cardTitle,
              { color: paper.ink, fontFamily: families.nunitoExtraBold },
            ]}
          >
            {t("lib.noChars")}
          </Text>
          <Pressable onPress={() => router.back()}>
            <Text
              style={[
                paperType.link,
                { color: paper.coral, fontFamily: families.nunitoBold },
              ]}
            >
              ← {t("common.back")}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
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
        <Pressable
          onPress={() => {
            tick()
            router.push("/radicals")
          }}
        >
          <Text
            style={[
              paperType.link,
              { color: paper.greenDark, fontFamily: families.nunitoBold },
            ]}
          >
            {t("dict.radicals")} →
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: 40,
          flexGrow: 1,
          alignItems: "center",
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: columnWidth, padding: 20, gap: 14 }}>
          <View style={{ gap: 4 }}>
            <Text
              style={[
                paperType.statLabel,
                { color: paper.inkMuted, fontFamily: families.nunitoSemiBold },
              ]}
            >
              {t("char.kicker")}
            </Text>
            <Text
              style={[
                paperType.cardTitle,
                { color: paper.ink, fontFamily: families.nunitoExtraBold },
              ]}
            >
              {t("char.title")}
            </Text>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("char.search")}
            placeholderTextColor={paper.inkMuted}
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              backgroundColor: paper.card,
              borderColor: paper.line,
              borderWidth: 1,
              borderRadius: paper.radius.inner,
              paddingHorizontal: 12,
              paddingVertical: 11,
              fontFamily: families.inter,
              fontSize: 14.5,
              color: paper.ink,
            }}
          />

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {filtered.map((c) => {
              const glyph = c.char ?? c.hanzi ?? c.id
              return (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    tick()
                    router.push({
                      pathname: "/character/[char]",
                      params: { char: glyph },
                    })
                  }}
                  style={{
                    width: 78,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: paper.line,
                    backgroundColor: paper.surface.week.fill,
                    padding: 10,
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: faces.display,
                      ...hanziType(30),
                      color: paper.ink,
                    }}
                  >
                    {glyph}
                  </Text>
                  <ReadingAid
                    pinyin={c.pinyin}
                    size="label"
                    color={paper.coral}
                  />
                </Pressable>
              )
            })}
          </View>

          {filtered.length === 0 && !charsQ.isLoading ? (
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
                {t("learn.nothingHere")}
              </Text>
            </PaperCard>
          ) : null}

          <PaperCard
            tone="challenge"
            title={t("dict.radicals")}
            body={t("dict.radicalsBody")}
          />

          <QuietPill
            title={t("char.openAll")}
            tone="challenge"
            onPress={() => {
              tick()
              router.push("/radicals")
            }}
          />

          <FlexGap min={0} />
          <Text style={{ opacity: 0 }}>{motifChar(language)}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
