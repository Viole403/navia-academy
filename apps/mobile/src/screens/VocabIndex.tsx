import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { Screen } from "@/components/ui/Screen"
import { Chip } from "@/components/ui/Chip"
import { EmptyState } from "@/components/ui/EmptyState"
import { Input } from "@/components/ui/Input"
import { SectionHeader } from "@/components/study/StudyCard"
import { CONTENT_MAX, spacing } from "@/components/study/tokens"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
import { loadVocabulary } from "@/lib/content-data"
import { rankVocabulary } from "@/lib/dictionary-rank"
import {
  examDisplayName,
  headword,
  isCharScript,
  languageInfo,
  motifChar,
  reading,
  wordLabel,
} from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useT } from "@/i18n"
import { tick } from "@/utils/feedback"
import type { VocabWord } from "@/types/api"

/**
 * /vocab — dictionary browse (web parity: /vocabulary).
 * Search ladder ranks exact-gloss above loose pinyin; the level filter is
 * one button carrying its value (not a chip row) with a panel on demand.
 */
export function VocabIndex() {
  const { theme } = useTheme()
  const t = useT()
  const router = useRouter()
  const language = useOnboardingStore((s) => s.language)
  const storedExamType = useOnboardingStore((s) => s.examType)
  const info = languageInfo(language)
  const examTypes = info.examTypes
  const examType =
    storedExamType && examTypes.includes(storedExamType)
      ? storedExamType
      : examTypes[0]

  const [search, setSearch] = useState("")
  const [level, setLevel] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const vocabQ = useQuery({
    queryKey: ["vocab-all", language],
    queryFn: () => loadVocabulary(language),
  })

  const levels = useMemo(() => {
    const m = new Set<string>()
    for (const w of vocabQ.data ?? []) {
      const lv = w.examMappings?.[examType]
      if (lv !== undefined) m.add(String(lv).toUpperCase())
    }
    return [...m].sort()
  }, [vocabQ.data, examType])

  useEffect(() => {
    if (level && !levels.includes(level)) setLevel(null)
  }, [levels, level])

  const results = useMemo(() => {
    const pool = (vocabQ.data ?? []).filter((w) => {
      if (!level) return true
      return String(w.examMappings?.[examType] ?? "").toUpperCase() === level
    })
    const q = search.trim()
    if (!q) return pool.slice(0, 50)
    return rankVocabulary(pool, q).slice(0, 50)
  }, [vocabQ.data, search, level, examType])

  return (
    <Screen>
      <View
        style={{
          width: "100%",
          maxWidth: CONTENT_MAX,
          alignSelf: "center",
          gap: spacing.lg,
        }}
      >
        <SectionHeader kicker={t("dict.kicker")} title={t("dict.title")} />

        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Input
              placeholder={`${wordLabel(language)} · ${examDisplayName(examType)}…`}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <Pressable
            onPress={() => {
              tick()
              setPanelOpen((o) => !o)
            }}
            style={{
              borderWidth: 1,
              borderColor: level ? theme.accent : theme.border,
              borderRadius: 2,
              paddingHorizontal: spacing.md,
              justifyContent: "center",
              backgroundColor: level ? theme.accent + "14" : "transparent",
            }}
          >
            <Text
              style={{
                color: level ? theme.accent : theme.textMuted,
                fontWeight: "700",
                fontSize: 13,
              }}
            >
              {level ?? t("dict.level")}
            </Text>
          </Pressable>
        </View>

        {panelOpen && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm }}
          >
            <Chip
              label={t("dict.all")}
              selected={level === null}
              onPress={() => {
                tick()
                setLevel(null)
                setPanelOpen(false)
              }}
            />
            {levels.map((lv) => (
              <Chip
                key={lv}
                label={lv}
                selected={level === lv}
                onPress={() => {
                  tick()
                  setLevel(lv)
                  setPanelOpen(false)
                }}
              />
            ))}
          </ScrollView>
        )}

        {vocabQ.isLoading ? (
          <ActivityIndicator color={theme.accent} />
        ) : results.length === 0 ? (
          <EmptyState
            title={t("learn.nothingHere")}
            message={t("learn.tryDifferent")}
            glyph={motifChar(language)}
          />
        ) : (
          <View>
            {results.map((w) => (
              <WordRow key={w.id} word={w} />
            ))}
          </View>
        )}
      </View>
    </Screen>
  )
}

function WordRow({ word }: { word: VocabWord }) {
  const { theme } = useTheme()
  const router = useRouter()
  const language = useOnboardingStore((s) => s.language)
  const charScript = isCharScript(language)
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: "/vocab/[id]", params: { id: word.id } })
      }
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        gap: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: 30,
          color: theme.text,
          ...(charScript ? { width: 52 } : { minWidth: 52, flexShrink: 1 }),
        }}
        numberOfLines={1}
      >
        {headword(word)}
      </Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.caption, { color: theme.textMuted }]}>
          {reading(word) ?? "—"}
        </Text>
        <Text style={[type.bodySm, { color: theme.text }]} numberOfLines={1}>
          {String(word.translation ?? "")}
        </Text>
      </View>
      <Text
        style={{ color: theme.textDim, fontFamily: fonts.serif, fontSize: 18 }}
      >
        →
      </Text>
    </Pressable>
  )
}
