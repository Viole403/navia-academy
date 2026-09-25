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
import { FlexGap } from "@/components/study/press"
import { useTheme } from "@/theme/ThemeProvider"
import { paperType, families, hanziType } from "@/theme/paperType"
import { loadCharacters } from "@/lib/content-data"
import { isCharScript, motifChar } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useT } from "@/i18n"
import { tick } from "@/utils/feedback"
import type { HanziChar } from "@/types/api"

const RAD_CONTENT_MAX = 430

/**
 * Radicals.
 *
 * The reference teaches 99 of the 214 Kangxi radicals with an authored
 * explanation each, and keeps a separate 214-entry **naming** table so the other
 * 115 still have something to print. This repo has neither — but its characters
 * bundle carries a `radical` on every entry, so the third layer (the index) comes
 * free from our own content: this screen is the index, grouped by radical, with
 * the characters filed under each.
 *
 * Read-only, and deliberately so: these are reference, not vocabulary. Nothing
 * here is addable to a review deck, because a radical is not a word.
 */
export function Radicals() {
  const { paper } = useTheme()
  const t = useT()
  const router = useRouter()
  const language = useOnboardingStore((s) => s.language)
  const { width } = useWindowDimensions()
  const columnWidth = Math.min(width, RAD_CONTENT_MAX)
  const [query, setQuery] = useState("")

  const charsQ = useQuery({
    queryKey: ["characters", language],
    queryFn: () => loadCharacters(language),
  })

  const grouped = useMemo(() => {
    const map = new Map<string, HanziChar[]>()
    for (const c of charsQ.data ?? []) {
      if (!c.radical) continue
      const list = map.get(c.radical) ?? []
      list.push(c)
      map.set(c.radical, list)
    }
    return [...map.entries()]
      .map(([radical, chars]) => ({
        radical,
        chars: chars.sort((a, b) =>
          String(a.char ?? a.hanzi ?? "").localeCompare(
            String(b.char ?? b.hanzi ?? "")
          )
        ),
      }))
      .sort((a, b) => b.chars.length - a.chars.length)
  }, [charsQ.data])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return grouped
    return grouped
      .filter(
        (g) =>
          g.radical.toLowerCase().includes(q) ||
          g.chars.some((c) =>
            String(c.char ?? c.hanzi ?? "")
              .toLowerCase()
              .includes(q)
          )
      )
      .map((g) => ({
        radical: g.radical,
        chars: g.chars.filter((c) =>
          String(c.char ?? c.hanzi ?? "")
            .toLowerCase()
            .includes(q)
        ),
      }))
      .filter((g) => g.chars.length > 0 || g.radical.toLowerCase().includes(q))
  }, [grouped, query])

  if (!isCharScript(language)) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: paper.paper, padding: 24 }}
      >
        <Text
          style={[
            paperType.cardBody,
            { color: paper.inkMuted, fontFamily: families.nunitoSemiBold },
          ]}
        >
          {t("lib.noChars")}
        </Text>
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
              : router.replace("/vocab" as never)
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
          {t("rad.count", { n: grouped.length })}
        </Text>
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
              {t("rad.kicker")}
            </Text>
            <Text
              style={[
                paperType.cardTitle,
                { color: paper.ink, fontFamily: families.nunitoExtraBold },
              ]}
            >
              {t("rad.title")}
            </Text>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("rad.search")}
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

          {charsQ.isLoading ? null : filtered.length === 0 ? (
            <Text
              style={[
                paperType.cardBody,
                { color: paper.inkMuted, fontFamily: families.nunitoSemiBold },
              ]}
            >
              {t("rad.none")}
            </Text>
          ) : (
            filtered.map((g) => (
              <PaperCard key={g.radical} tone="plain" title={g.radical}>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                >
                  {g.chars.slice(0, 40).map((c) => {
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
                          width: 44,
                          height: 44,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: paper.surface.week.fill,
                          borderRadius: 10,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: families.hanziSc,
                            ...hanziType(26),
                            color: paper.ink,
                          }}
                        >
                          {glyph}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
                {g.chars.length > 40 ? (
                  <Text
                    style={[
                      paperType.statLabel,
                      {
                        color: paper.inkMuted,
                        fontFamily: families.nunitoSemiBold,
                      },
                    ]}
                  >
                    +{g.chars.length - 40}
                  </Text>
                ) : null}
              </PaperCard>
            ))
          )}

          <PaperCard
            tone="challenge"
            title={t("lib.characters")}
            body={t("rad.note")}
          >
            <QuietPill
              title={t("char.openAll")}
              tone="challenge"
              onPress={() =>
                router.canGoBack()
                  ? router.back()
                  : router.replace("/characters" as never)
              }
            />
          </PaperCard>

          <FlexGap min={0} />
          <Text style={{ opacity: 0 }}>{motifChar(language)}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
