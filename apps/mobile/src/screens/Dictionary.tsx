import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
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
import { DictionaryIntro } from "@/components/study/DictionaryIntro"
import { PaperCard, QuietPill } from "@/components/study/PaperCard"
import { FlexGap } from "@/components/study/press"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentFaces } from "@/hooks/useContentFaces"
import { useContentLayout } from "@/theme/layout"
import { ReadingAid } from "@/components/study/ReadingAid"
import { paperType, families, hanziType } from "@/theme/paperType"
import { loadVocabulary } from "@/lib/content-data"
import { rankVocabulary } from "@/lib/dictionary-rank"
import { CATEGORIES, categoryOf, type CategoryId } from "@/lib/wordCategories"
import {
  examDisplayName,
  examLevels,
  headword,
  isCharScript,
  languageInfo,
  reading,
} from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useT, translate, useLocaleStore } from "@/i18n"
import { tick } from "@/utils/feedback"
import type { VocabWord } from "@/types/api"

/**
 * The dictionary.
 *
 * Three rules that are easy to get wrong and were, at one point, wrong here:
 *
 *  - The level filter is **one button beside the search field** carrying its
 *    current value, opening a panel only when asked. Six chips took a whole band
 *    of the page to say one number. Picking a level closes the panel, because
 *    the answer is then on the button and showing it twice is the old row again.
 *  - The two narrow columns are **one shape twice** (title → See all + count →
 *    rows → gap → pill). They sit side by side and the learner reads across
 *    them, so a column that started a row lower left nothing below lining up,
 *    and one footer drawn as a bare link over a rule while the other was a filled
 *    pill made the card bottoms disagree. Verify by measuring, not by eye.
 *  - Category tiles are **self-sizing** (icon, label, padding) with a fixed
 *    *width*, so four and a bit are visible and the row obviously continues.
 */
export function Dictionary() {
  const { paper } = useTheme()
  const faces = useContentFaces()
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const router = useRouter()
  const language = useOnboardingStore((s) => s.language)
  const storedExamType = useOnboardingStore((s) => s.examType)
  const { column: columnWidth } = useContentLayout()
  const charScript = isCharScript(language)
  const examTypes = languageInfo(language).examTypes
  const examType =
    storedExamType && examTypes.includes(storedExamType)
      ? storedExamType
      : examTypes[0]

  const [query, setQuery] = useState("")
  const [level, setLevel] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [category, setCategory] = useState<CategoryId | null>(null)

  const vocabQ = useQuery({
    queryKey: ["vocab-all", language],
    queryFn: () => loadVocabulary(language),
  })
  const all = useMemo(() => vocabQ.data ?? [], [vocabQ.data])

  const levels = useMemo(() => {
    const set = new Set<string>()
    for (const w of all) {
      const lv = w.examMappings?.[examType]
      if (lv !== undefined) set.add(String(lv).toUpperCase())
    }
    return [...set].sort()
  }, [all, examType])

  useEffect(() => {
    if (level && !levels.includes(level)) setLevel(null)
  }, [levels, level])

  const pool = useMemo(
    () =>
      all.filter((w) => {
        if (
          level &&
          String(w.examMappings?.[examType] ?? "").toUpperCase() !== level
        ) {
          return false
        }
        if (category && categoryOf(w) !== category) return false
        return true
      }),
    [all, level, category, examType]
  )

  const results = useMemo(() => {
    const q = query.trim()
    if (!q) return pool.slice(0, 40)
    return rankVocabulary(pool, q).slice(0, 40)
  }, [pool, query])

  const starter = useMemo(
    () =>
      all
        .filter((w) => {
          const lv = w.examMappings?.[examType]
          return lv !== undefined && Number(lv) <= 1
        })
        .slice(0, 8),
    [all, examType]
  )

  const searching = query.trim().length > 0

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: paper.paper }}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 40,
          flexGrow: 1,
          alignItems: "center",
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: columnWidth, padding: 20, gap: 16 }}>
          <DictionaryIntro message={t("dict.intro")} />

          {/* Search + level filter. */}
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t("dict.searchPh")}
              placeholderTextColor={paper.inkMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                flex: 1,
                backgroundColor: paper.card,
                borderColor: paper.line,
                borderWidth: 1,
                borderRadius: paper.radius.inner,
                paddingHorizontal: 12,
                paddingVertical: 11,
                fontFamily: families.inter,
                fontSize: 14.5,
                color: paper.ink,
                ...paper.shadow,
              }}
            />
            <Pressable
              onPress={() => {
                tick()
                setPanelOpen((o) => !o)
              }}
              style={{
                borderWidth: 1,
                borderColor: level ? paper.coral : paper.line,
                backgroundColor: level ? paper.coralSoft : "transparent",
                borderRadius: paper.radius.inner,
                paddingHorizontal: 12,
                paddingVertical: 11,
              }}
            >
              <Text
                style={{
                  color: level ? paper.coral : paper.inkMuted,
                  fontFamily: families.nunitoBold,
                  fontSize: 13,
                }}
              >
                {level ?? t("dict.level")}
              </Text>
            </Pressable>
          </View>

          {panelOpen ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
            >
              <Pressable
                onPress={() => {
                  tick()
                  setLevel(null)
                  setPanelOpen(false)
                }}
              >
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: level === null ? paper.green : paper.line,
                    backgroundColor:
                      level === null ? paper.greenSoft : "transparent",
                    borderRadius: paper.radius.pill,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                  }}
                >
                  <Text
                    style={{
                      color: paper.ink,
                      fontFamily: families.nunitoBold,
                      fontSize: 12,
                    }}
                  >
                    {t("dict.all")}
                  </Text>
                </View>
              </Pressable>
              {levels.map((lv) => (
                <Pressable
                  key={lv}
                  onPress={() => {
                    tick()
                    setLevel(lv)
                    setPanelOpen(false)
                  }}
                >
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: level === lv ? paper.green : paper.line,
                      backgroundColor:
                        level === lv ? paper.greenSoft : "transparent",
                      borderRadius: paper.radius.pill,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                    }}
                  >
                    <Text
                      style={{
                        color: paper.ink,
                        fontFamily: families.nunitoBold,
                        fontSize: 12,
                      }}
                    >
                      {lv}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          {/* Category tiles — self-sizing height, fixed width, so the row
              visibly continues. */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {CATEGORIES.map((c) => {
              const selected = category === c.id
              return (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    tick()
                    setCategory(selected ? null : c.id)
                  }}
                  style={{
                    width: 78,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: selected ? paper.green : paper.line,
                    backgroundColor: selected ? paper.greenSoft : paper.cardAlt,
                    padding: 10,
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: faces.display,
                      ...hanziType(22),
                      color: paper.ink,
                    }}
                  >
                    {c.glyph}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: paper.ink,
                      fontFamily: families.nunitoSemiBold,
                      fontSize: 11.5,
                    }}
                  >
                    {translate(locale, c.labelKey as never)}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>

          {vocabQ.isLoading ? (
            <View style={{ paddingVertical: 32 }}>
              <ActivityIndicator color={paper.coral} />
            </View>
          ) : searching ? (
            <PaperCard tone="plain" title={t("learn.results")}>
              {results.length === 0 ? (
                <Text
                  style={[
                    paperType.cardBody,
                    {
                      color: paper.inkMuted,
                      fontFamily: families.nunitoSemiBold,
                    },
                  ]}
                >
                  {t("dict.noResults")}
                </Text>
              ) : (
                <View>
                  {results.map((w) => (
                    <WordRow key={w.id} word={w} examType={examType} />
                  ))}
                </View>
              )}
            </PaperCard>
          ) : (
            <>
              {/* The two narrow columns, one shape twice. */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <ColumnCard
                    title={t("dict.starter")}
                    count={starter.length}
                    onSeeAll={() => setLevel(examLevels(examType)[0] ?? null)}
                  >
                    {starter.map((w) => (
                      <WordRow
                        key={w.id}
                        word={w}
                        examType={examType}
                        compact
                      />
                    ))}
                  </ColumnCard>
                </View>
                <View style={{ flex: 1 }}>
                  <ColumnCard
                    title={t("dict.recent")}
                    count={0}
                    onSeeAll={() => router.push("/(tabs)/learn")}
                  >
                    <Text
                      style={{
                        color: paper.inkMuted,
                        fontFamily: families.nunitoSemiBold,
                        fontSize: 12.5,
                        paddingVertical: 10,
                      }}
                    >
                      {t("dict.recentEmpty")}
                    </Text>
                  </ColumnCard>
                </View>
              </View>

              {charScript && (
                <PaperCard
                  tone="challenge"
                  title={t("dict.radicals")}
                  body={t("dict.radicalsBody")}
                  onPress={() => router.push("/radicals")}
                />
              )}
            </>
          )}

          <FlexGap min={0} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

/**
 * One column, one shape. The footer pill is a real component rather than a
 * second implementation, so the two cards under the search field cannot drift
 * apart again.
 */
function ColumnCard({
  title,
  count,
  onSeeAll,
  children,
}: {
  title: string
  count: number
  onSeeAll: () => void
  children: React.ReactNode
}) {
  const { paper } = useTheme()
  const t = useT()
  return (
    <PaperCard tone="plain">
      <View style={{ gap: 8 }}>
        <Text
          style={[
            paperType.cardTitleSm,
            { color: paper.ink, fontFamily: families.nunitoExtraBold },
          ]}
        >
          {title}
        </Text>
        <Pressable
          onPress={onSeeAll}
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <Text
            style={[
              paperType.link,
              { color: paper.greenDark, fontFamily: families.nunitoBold },
            ]}
          >
            {t("dict.seeAll")}
          </Text>
          {count > 0 ? (
            <Text
              style={[
                paperType.statLabel,
                { color: paper.inkMuted, fontFamily: families.nunitoSemiBold },
              ]}
            >
              {count}
            </Text>
          ) : null}
        </Pressable>
        {children}
        <FlexGap min={0} max={12} />
        <QuietPill title={t("dict.browse")} tone="week" onPress={onSeeAll} />
      </View>
    </PaperCard>
  )
}

function WordRow({
  word,
  examType,
  compact,
}: {
  word: VocabWord
  examType: string
  compact?: boolean
}) {
  const { paper } = useTheme()
  const faces = useContentFaces()
  const router = useRouter()
  const language = useOnboardingStore((s) => s.language)
  const charScript = isCharScript(language)
  const lv = word.examMappings?.[examType]

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: "/vocab/[id]", params: { id: word.id } })
      }
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 9,
        borderBottomWidth: 1,
        borderBottomColor: paper.lineSoft,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          fontFamily: faces.display,
          fontSize: compact ? 26 : 30,
          lineHeight: compact ? 34 : 40,
          color: paper.ink,
          ...(charScript ? { width: 40 } : { minWidth: 40, flexShrink: 1 }),
        }}
      >
        {headword(word)}
      </Text>
      <View style={{ flex: 1, gap: 1 }}>
        <ReadingAid
          pinyin={reading(word)}
          translation={!compact ? String(word.translation ?? "") : undefined}
          size="label"
          translationColor={paper.ink}
        />
      </View>
      {lv !== undefined ? (
        <View
          style={{
            backgroundColor: paper.greenSoft,
            borderRadius: paper.radius.tag,
            paddingHorizontal: 6,
            paddingVertical: 2,
          }}
        >
          <Text
            style={{
              color: paper.greenDark,
              fontFamily: families.nunitoBold,
              fontSize: 9.5,
            }}
          >
            {String(lv).toUpperCase()}
          </Text>
        </View>
      ) : null}
    </Pressable>
  )
}
