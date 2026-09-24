import { memo, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { ActionCard } from "@/components/ui/ActionCard"
import { Button } from "@/components/ui/Button"
import { Chip } from "@/components/ui/Chip"
import { EmptyState } from "@/components/ui/EmptyState"
import { Input } from "@/components/ui/Input"
import { Motif } from "@/components/ui/Motif"
import { Card } from "@/components/ui/Card"
import { ProgressBar } from "@/components/ui/ProgressBar"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
import { progress, settings } from "@/api/endpoints"
import { loadVocabulary } from "@/lib/content-data"
import {
  DEFAULT_LANGUAGE,
  examBadgeColor,
  examDisplayName,
  examLevels,
  headword,
  isCharScript,
  languageInfo,
  motifChar,
  reading,
  wordLabel,
} from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useT } from "@/i18n"
import type { VocabWord } from "@/types/api"

export default function LearnTab() {
  const { theme } = useTheme()
  const t = useT()
  const router = useRouter()
  const language = useOnboardingStore((s) => s.language) ?? DEFAULT_LANGUAGE
  const storedExamType = useOnboardingStore((s) => s.examType)
  const setStoredExamType = useOnboardingStore((s) => s.setExamType)
  const info = languageInfo(language)
  const examTypes = info.examTypes
  const initType =
    storedExamType && examTypes.includes(storedExamType)
      ? storedExamType
      : examTypes[0]
  const [search, setSearch] = useState("")
  const [examType, setExamType] = useState<string>(initType)
  const [examLevel, setExamLevel] = useState<string>(examLevels(initType)[0])
  useEffect(() => {
    const next =
      storedExamType && examTypes.includes(storedExamType)
        ? storedExamType
        : examTypes[0]
    setExamType(next)
    setExamLevel(examLevels(next)[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, storedExamType])
  const pickExamType = (t: string) => {
    setExamType(t)
    setExamLevel(examLevels(t)[0])
    setStoredExamType(t)
    settings.update({ active_exam_type: t })
  }
  const [tab, setTab] = useState<"browse" | "review">("browse")

  const vocabAll = useQuery({
    queryKey: ["vocab-all", language],
    queryFn: () => loadVocabulary(language),
  })
  const levels = useMemo(() => {
    if (!vocabAll.data) return []
    const m = new Set<string>()
    for (const w of vocabAll.data) {
      const lv = w.examMappings?.[examType]
      if (lv === undefined) continue
      m.add(String(lv).toUpperCase())
    }
    return [...m].sort()
  }, [vocabAll.data, examType])
  useEffect(() => {
    if (levels.length > 0 && !levels.includes(examLevel)) {
      setExamLevel(levels[0])
    }
  }, [levels, examLevel])

  const srsQ = useQuery({ queryKey: ["srs-stats"], queryFn: progress.srsStats })
  const dueCardsQ = useQuery({
    queryKey: ["due-cards"],
    queryFn: () => progress.dueCards(50),
    enabled: tab === "review",
  })

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={{ padding: 24, gap: 24, paddingBottom: 32 }}
        stickyHeaderIndices={[1]}
      >
        {/* Masthead */}
        <View style={{ gap: 12 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={[type.labelSm, { color: theme.textMuted }]}>
                {t("learn.kicker")}
              </Text>
              <Text style={[type.display, { color: theme.text, fontSize: 36 }]}>
                {t("learn.title")}
              </Text>
            </View>
            <Motif char={info.nativeName.charAt(0)} size={56} />
          </View>
          <View style={{ height: 1, backgroundColor: theme.border }} />
        </View>

        {/* Tab switcher (sticky) */}
        <View
          style={{
            backgroundColor: theme.bg,
            paddingBottom: 12,
            marginHorizontal: -24,
            paddingHorizontal: 24,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <View style={{ flexDirection: "row", gap: 24 }}>
            {(["browse", "review"] as const).map((tabId) => {
              const sel = tab === tabId
              return (
                <Pressable key={tabId} onPress={() => setTab(tabId)}>
                  <Text
                    style={{
                      fontFamily: fonts.serif,
                      fontSize: 22,
                      color: sel ? theme.accent : theme.textMuted,
                      fontWeight: sel ? "500" : "400",
                      borderBottomWidth: sel ? 2 : 0,
                      borderBottomColor: theme.accent,
                      paddingBottom: 4,
                    }}
                  >
                    {tabId === "browse" ? t("learn.browse") : t("learn.review")}
                    {tabId === "review" && srsQ.data && srsQ.data.due > 0 && (
                      <Text style={{ color: theme.accent, fontSize: 14 }}>
                        {" "}
                        · {srsQ.data.due}
                      </Text>
                    )}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* Game shortcut */}
        <ActionCard
          glyph={info.nativeName.charAt(0)}
          title={
            isCharScript(language)
              ? t("learn.hanziMatch")
              : t("learn.wordMatch")
          }
          description={`${t("learn.pair")} ${wordLabel(language, false)} ${t("learn.toMeanings")} ${examDisplayName(examType)} ${examLevel} deck.`}
          onPress={() => router.push("/game-match")}
        />

        <ActionCard
          glyph={motifChar(language)}
          title={t("learn.library")}
          description={t("learn.libraryDesc")}
          onPress={() => router.push("/library")}
        />

        <ActionCard
          glyph={motifChar(language)}
          title={t("learn.program")}
          description={`${t("learn.programPrefix")} ${examDisplayName(examType)} ${t("learn.programSuffix")}`}
          onPress={() => router.push("/program")}
        />

        <ActionCard
          glyph={motifChar(language)}
          title={t("learn.listening")}
          description={t("learn.listeningDesc")}
          onPress={() => router.push("/listening-drill")}
        />

        <ActionCard
          glyph={motifChar(language)}
          title={t("learn.speaking")}
          description={t("learn.speakingDesc")}
          onPress={() => router.push("/speaking")}
        />

        <ActionCard
          glyph={motifChar(language)}
          title={t("learn.writing")}
          description={t("learn.writingDesc")}
          onPress={() => router.push("/writing")}
        />

        {tab === "browse" ? (
          <BrowseTab
            search={search}
            setSearch={setSearch}
            examTypes={examTypes}
            examType={examType}
            setExamType={pickExamType}
            examLevel={examLevel}
            setExamLevel={setExamLevel}
            levels={levels}
            vocabLoading={vocabAll.isLoading}
            vocabData={vocabAll.data ?? []}
            language={language}
          />
        ) : (
          <ReviewTab
            dueCount={srsQ.data?.due ?? 0}
            loading={dueCardsQ.isLoading}
            language={language}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Browse sub-tab ────────────────────────────────────────────────────────
function BrowseTab({
  vocabData,
  vocabLoading,
  search,
  setSearch,
  examType,
  setExamType,
  examLevel,
  setExamLevel,
  examTypes,
  levels,
  language,
}: {
  vocabData: import("@/types/api").VocabWord[]
  vocabLoading: boolean
  examTypes: string[]
  language: import("@/lib/languages").LanguageCode
  search: string
  setSearch: (s: string) => void
  examType: string
  setExamType: (s: string) => void
  examLevel: string
  setExamLevel: (s: string) => void
  levels: string[]
}) {
  const { theme } = useTheme()
  const t = useT()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return vocabData
      .filter((w) => {
        if (
          examLevel &&
          String(w.examMappings?.[examType] ?? "").toUpperCase() !== examLevel
        )
          return false
        if (!q) return true
        return (
          headword(w).toLowerCase().includes(q) ||
          (reading(w) ?? "").toLowerCase().includes(q) ||
          (w.translation ?? "").toLowerCase().includes(q)
        )
      })
      .slice(0, 50)
  }, [vocabData, search, examLevel, examType])

  return (
    <View style={{ gap: 20 }}>
      {/* Exam type chips */}
      <View style={{ gap: 10 }}>
        <Text style={[type.labelSm, { color: theme.textMuted }]}>
          {t("learn.curriculum")}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {examTypes.map((t) => (
            <Chip
              key={t}
              label={examDisplayName(t)}
              selected={examType === t}
              onPress={() => {
                setExamType(t)
                // Reset level — different exams have different ladders
                setExamLevel(examLevels(t)[0])
              }}
            />
          ))}
        </ScrollView>
      </View>

      {/* Level selector */}
      <View style={{ gap: 10 }}>
        <Text style={[type.labelSm, { color: theme.textMuted }]}>
          {t("learn.level")}
        </Text>
        {vocabLoading ? (
          <ActivityIndicator color={theme.accent} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {levels.length === 0 && (
              <Text style={[type.caption, { color: theme.textDim }]}>
                {t("learn.noLevels")}
              </Text>
            )}
            {levels.map((lv) => (
              <Chip
                key={lv}
                label={lv.toUpperCase()}
                selected={examLevel === lv}
                onPress={() => setExamLevel(lv)}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Search */}
      <View style={{ gap: 10 }}>
        <Text style={[type.labelSm, { color: theme.textMuted }]}>
          {t("learn.search")}
        </Text>
        <Input
          placeholder={wordLabel(language) + " " + t("learn.searchHint")}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Results */}
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={[type.labelSm, { color: theme.textMuted }]}>
            {t("learn.results")}
          </Text>
          {filtered.length > 0 && (
            <Text style={[type.caption, { color: theme.textMuted }]}>
              {filtered.length.toLocaleString()} {t("learn.entries")}
            </Text>
          )}
        </View>

        {vocabLoading ? (
          <ActivityIndicator color={theme.accent} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={t("learn.nothingHere")}
            message={t("learn.tryDifferent")}
            glyph={motifChar(language)}
          />
        ) : (
          <View>
            {filtered.map((w, i) => (
              <View
                key={w.id}
                style={
                  i > 0
                    ? { borderTopWidth: 1, borderTopColor: theme.border }
                    : undefined
                }
              >
                <WordRow word={w} language={language} />
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}

const WordRow = memo(function WordRow({
  word,
  language,
}: {
  word: VocabWord
  language: import("@/lib/languages").LanguageCode
}) {
  const { theme } = useTheme()
  const router = useRouter()
  const charScript = isCharScript(language)
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/vocab/[id]" as never,
          params: { id: word.id } as never,
        })
      }
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        gap: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: 32,
          color: theme.text,
          ...(charScript ? { width: 56 } : { minWidth: 56, flexShrink: 1 }),
        }}
      >
        {headword(word)}
      </Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.caption, { color: theme.textMuted }]}>
          {reading(word) ?? "—"}
        </Text>
        <Text style={[type.bodySm, { color: theme.text }]} numberOfLines={1}>
          {(word as { translation?: string }).translation ?? ""}
        </Text>
      </View>
      <Text
        style={{ color: theme.textDim, fontFamily: fonts.serif, fontSize: 18 }}
      >
        →
      </Text>
    </Pressable>
  )
})

// ─── Review sub-tab ────────────────────────────────────────────────────────
function ReviewTab({
  dueCount,
  loading,
  language,
}: {
  dueCount: number
  loading: boolean
  language: import("@/lib/languages").LanguageCode
}) {
  const { theme } = useTheme()
  const t = useT()
  const router = useRouter()

  return (
    <View style={{ gap: 20 }}>
      <Card>
        <View style={{ gap: 12 }}>
          <Text style={[type.labelSm, { color: theme.textMuted }]}>
            {t("learn.srs")}
          </Text>
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 48,
              color: theme.accent,
              fontWeight: "400",
              lineHeight: 56,
            }}
          >
            {dueCount}
          </Text>
          <Text style={[type.bodySm, { color: theme.textMuted }]}>
            {t("learn.cardsDue")}
          </Text>
          <ProgressBar
            value={dueCount === 0 ? 1 : 0.0}
            height={2}
            tint={theme.accent}
          />
        </View>
      </Card>

      {dueCount === 0 ? (
        <EmptyState
          title={t("learn.allReviewed")}
          message={t("learn.comeBack")}
          glyph={motifChar(language)}
        />
      ) : (
        <Button
          title={loading ? t("learn.loading") : t("learn.startReview")}
          onPress={() => router.push("/review")}
          loading={loading}
          size="lg"
        />
      )}
    </View>
  )
}
