import { memo, useMemo, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { Chip } from "@/components/ui/Chip"
import { EmptyState } from "@/components/ui/EmptyState"
import { Input } from "@/components/ui/Input"
import { Motif } from "@/components/ui/Motif"
import { Card } from "@/components/ui/Card"
import { ProgressBar } from "@/components/ui/ProgressBar"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
import { progress } from "@/api/endpoints"
import { loadVocabulary } from "@/lib/content-data"
import type { VocabWord } from "@/types/api"

const EXAM_TYPES = ["hsk", "tocfl"]

export default function LearnTab() {
  const { theme } = useTheme()
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [examType, setExamType] = useState<string>("hsk")
  const [examLevel, setExamLevel] = useState<string>("1")
  const [tab, setTab] = useState<"browse" | "review">("browse")

  const vocabAll = useQuery({
    queryKey: ["vocab-all"],
    queryFn: () => loadVocabulary(),
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
                Library
              </Text>
              <Text style={[type.display, { color: theme.text, fontSize: 36 }]}>
                Learn
              </Text>
            </View>
            <Motif char="学" size={56} />
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
            {(["browse", "review"] as const).map((t) => {
              const sel = tab === t
              return (
                <Pressable key={t} onPress={() => setTab(t)}>
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
                    {t === "browse" ? "Browse" : "Review"}
                    {t === "review" && srsQ.data && srsQ.data.due > 0 && (
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
        <Pressable
          onPress={() => router.push("/game-match")}
          style={{
            padding: 18,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 4,
            backgroundColor: theme.surface,
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 40,
              color: theme.accent,
              fontWeight: "500",
            }}
          >
            玩
          </Text>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[type.h3, { color: theme.text }]}>Hanzi Match</Text>
            <Text style={[type.bodySm, { color: theme.textMuted }]}>
              Pair characters to meanings. HSK 1 deck.
            </Text>
          </View>
          <Text
            style={{
              color: theme.textDim,
              fontFamily: fonts.serif,
              fontSize: 18,
            }}
          >
            →
          </Text>
        </Pressable>

        {tab === "browse" ? (
          <BrowseTab
            search={search}
            setSearch={setSearch}
            examType={examType}
            setExamType={setExamType}
            examLevel={examLevel}
            setExamLevel={setExamLevel}
            levels={levels}
            vocabLoading={vocabAll.isLoading}
            vocabData={vocabAll.data ?? []}
          />
        ) : (
          <ReviewTab
            dueCount={srsQ.data?.due ?? 0}
            loading={dueCardsQ.isLoading}
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
  levels,
}: {
  vocabData: import("@/types/api").VocabWord[]
  vocabLoading: boolean
  search: string
  setSearch: (s: string) => void
  examType: string
  setExamType: (s: string) => void
  examLevel: string
  setExamLevel: (s: string) => void
  levels: string[]
}) {
  const { theme } = useTheme()

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
          (w.hanzi ?? "").toLowerCase().includes(q) ||
          (w.pinyin ?? "").toLowerCase().includes(q) ||
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
          Curriculum
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {EXAM_TYPES.map((t) => (
            <Chip
              key={t}
              label={t.toUpperCase()}
              selected={examType === t}
              onPress={() => {
                setExamType(t)
                // Reset level — different exams have different ladders
                setExamLevel(t === "hsk" ? "1" : t === "tocfl" ? "A1" : "1")
              }}
            />
          ))}
        </ScrollView>
      </View>

      {/* Level selector */}
      <View style={{ gap: 10 }}>
        <Text style={[type.labelSm, { color: theme.textMuted }]}>Level</Text>
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
                No levels discovered.
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
        <Text style={[type.labelSm, { color: theme.textMuted }]}>Search</Text>
        <Input
          placeholder="汉字, pinyin, or meaning…"
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
            Results
          </Text>
          {filtered.length > 0 && (
            <Text style={[type.caption, { color: theme.textMuted }]}>
              {filtered.length.toLocaleString()} entries
            </Text>
          )}
        </View>

        {vocabLoading ? (
          <ActivityIndicator color={theme.accent} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(w) => w.id}
            renderItem={({ item }) => <WordRow word={item} />}
            initialNumToRender={12}
            maxToRenderPerBatch={8}
            windowSize={5}
            removeClippedSubviews
            ItemSeparatorComponent={() => (
              <View
                style={{ borderTopWidth: 1, borderTopColor: theme.border }}
              />
            )}
            ListEmptyComponent={
              <EmptyState
                title="Nothing here"
                message="Try a different search term or level."
                glyph="空"
              />
            }
          />
        )}
      </View>
    </View>
  )
}

const WordRow = memo(function WordRow({ word }: { word: VocabWord }) {
  const { theme } = useTheme()
  const router = useRouter()
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
          width: 56,
        }}
      >
        {word.hanzi}
      </Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.caption, { color: theme.textMuted }]}>
          {(word as { pinyin?: string }).pinyin ?? "—"}
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
}: {
  dueCount: number
  loading: boolean
}) {
  const { theme } = useTheme()
  const router = useRouter()

  return (
    <View style={{ gap: 20 }}>
      <Card>
        <View style={{ gap: 12 }}>
          <Text style={[type.labelSm, { color: theme.textMuted }]}>
            Spaced repetition
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
            cards due for review today
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
          title="All reviewed"
          message="Come back tomorrow for a fresh batch."
          glyph="完"
        />
      ) : (
        <Pressable
          onPress={() => router.push("/review")}
          style={{
            backgroundColor: theme.accent,
            paddingVertical: 16,
            alignItems: "center",
            borderRadius: 2,
          }}
          disabled={loading}
        >
          <Text
            style={{
              color: theme.white,
              fontWeight: "700",
              fontSize: 16,
              letterSpacing: 0.5,
            }}
          >
            {loading ? "Loading…" : "Start review session"}
          </Text>
        </Pressable>
      )}
    </View>
  )
}
