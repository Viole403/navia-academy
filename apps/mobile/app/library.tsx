import { Ionicons } from "@expo/vector-icons"
import { Fragment, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { EmptyState } from "@/components/ui/EmptyState"
import { Motif } from "@/components/ui/Motif"
import { LiftedFace, PaperCard, QuietPill } from "@/components/study/PaperCard"
import { ReadingAid } from "@/components/study/ReadingAid"
import { useDisplayMode } from "@/hooks/useDisplayMode"
import { PressableScale } from "@/components/study/press"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentLayout } from "@/theme/layout"
import { families, paperType } from "@/theme/paperType"
import {
  loadCharacters,
  loadConversations,
  loadGrammar,
  loadReadings,
} from "@/lib/content-data"
import {
  examDisplayName,
  examLevels,
  headword,
  isCharScript,
  languageForExam,
  levelLabelFor,
  motifChar,
  reading,
} from "@/lib/languages"
import { useContentFaces } from "@/hooks/useContentFaces"
import { useOnboardingStore } from "@/store/onboarding"
import { useT, type I18nKey } from "@/i18n"
import type {
  ConversationScenario,
  DialogueTurn,
  GrammarPoint,
  HanziChar,
  Reading,
  ReadingParagraph,
} from "@/types/api"

type LibSection = "grammar" | "readings" | "conversations" | "characters"

const SECTION_LABEL: Record<LibSection, I18nKey> = {
  grammar: "lib.grammar",
  readings: "lib.readings",
  conversations: "lib.conversations",
  characters: "lib.characters",
}

export default function LibraryScreen() {
  const { paper } = useTheme()
  const { column } = useContentLayout()
  const t = useT()
  const router = useRouter()
  const language = useOnboardingStore((s) => s.language)
  const charScript = isCharScript(language)

  const sections = useMemo<LibSection[]>(
    () =>
      charScript
        ? ["grammar", "readings", "conversations", "characters"]
        : ["grammar", "readings", "conversations"],
    [charScript]
  )
  const [section, setSection] = useState<LibSection>("grammar")
  const [openId, setOpenId] = useState<string | null>(null)

  // Grammar arrives as a few hundred points spanning every level, so the list
  // is unusable without narrowing it. The filters mirror the web library: the
  // exam the learner is actually sitting decides which ladder of levels is
  // meaningful, because "Level 5" means something different under TOCFL than
  // under JLPT.
  const examType = useOnboardingStore((s) => s.examType)
  const { showsPinyin, showsTranslation } = useDisplayMode()
  const [query, setQuery] = useState("")
  const [level, setLevel] = useState("all")
  const [difficulty, setDifficulty] = useState("all")
  const [filterOpen, setFilterOpen] = useState(false)

  // Switching section can leave a stored section the current language no longer
  // offers (characters only exist for character scripts), so the active section
  // is resolved rather than trusted.
  const active: LibSection = sections.includes(section) ? section : "grammar"

  const grammarQ = useQuery({
    queryKey: ["library-grammar", language],
    queryFn: () => loadGrammar(language),
    enabled: active === "grammar",
  })
  const readingsQ = useQuery({
    queryKey: ["library-readings", language],
    queryFn: () => loadReadings(language),
    enabled: active === "readings",
  })
  const conversationsQ = useQuery({
    queryKey: ["library-conversations", language],
    queryFn: () => loadConversations(language),
    enabled: active === "conversations",
  })
  const charactersQ = useQuery({
    queryKey: ["library-characters", language],
    queryFn: () => loadCharacters(language),
    enabled: active === "characters",
  })

  const activeQ =
    active === "grammar"
      ? grammarQ
      : active === "readings"
        ? readingsQ
        : active === "conversations"
          ? conversationsQ
          : charactersQ

  // Every section is a separate request, so "this section did not load" and
  // "this section is empty" have to be told apart. Reporting the first as the
  // second told a learner with a dead connection that their language had no
  // grammar published — a claim they had no way to check and no reason to
  // believe.
  const errored = activeQ.isError

  const grammarPoints = (grammarQ.data ?? []) as GrammarPoint[]
  const examName = examDisplayName(examType ?? languageForExam("hsk"))
  const levelLadder = examLevels(examType ?? languageForExam("hsk"))
  const filteredGrammar = useMemo(() => {
    const q = query.trim().toLowerCase()
    return grammarPoints.filter((g) => {
      if (level !== "all") {
        const mapped = (g.examMappings as Record<string, string> | undefined)?.[
          examType ?? ""
        ]
        const gLevel = String(mapped ?? g.level ?? g.hsk ?? "")
        if (gLevel !== level) return false
      }
      if (difficulty !== "all" && String(g.difficulty ?? "") !== difficulty) {
        return false
      }
      if (q) {
        const fields = [g.title, g.pattern, g.simpleExplanation]
        if (!fields.some((s) => s?.toLowerCase().includes(q))) return false
      }
      return true
    })
  }, [grammarPoints, query, level, difficulty, examType])

  // Difficulty is a 1–6 scale in the published content. Deriving the options
  // from the points themselves keeps the pills honest if a language ships a
  // narrower range than another.
  const difficultyLadder = useMemo(() => {
    const seen = new Set<string>()
    for (const g of grammarPoints) {
      if (g.difficulty != null) seen.add(String(g.difficulty))
    }
    return [...seen].sort((a, b) => Number(a) - Number(b))
  }, [grammarPoints])

  const filtering =
    active === "grammar" &&
    (query.trim() !== "" || level !== "all" || difficulty !== "all")

  const rows: { id: string; title: string; sub: string }[] =
    active === "grammar"
      ? filteredGrammar.map((g) => ({
          id: g.id,
          title: g.title,
          sub: g.pattern ?? (g.level != null ? String(g.level) : ""),
        }))
      : active === "readings"
        ? ((readingsQ.data ?? []) as Reading[]).map((r) => ({
            id: r.id,
            title: r.title,
            sub: r.summary ?? levelLabelFor(examType, r.level),
          }))
        : active === "conversations"
          ? ((conversationsQ.data ?? []) as ConversationScenario[]).map(
              (c) => ({
                id: c.id,
                title: c.title,
                sub: c.context ?? levelLabelFor(examType, c.level),
              })
            )
          : ((charactersQ.data ?? []) as HanziChar[]).map((c) => ({
              id: c.id,
              title: c.char ?? c.hanzi ?? c.id,
              sub: charSub(c),
            }))

  // The row subtitle is one string, so the reading is joined in only when the
  // mode asks for one — otherwise a character-only mode still gets pinyin here.
  const charSub = (c: HanziChar) => {
    const bits: string[] = []
    if (showsPinyin()) {
      const r = reading(c)
      if (r) bits.push(r)
    }
    if (showsTranslation() && c.meaning) bits.push(c.meaning)
    return bits.join(" · ")
  }

  const open = (id: string) => setOpenId((cur) => (cur === id ? null : id))

  const detail = (id: string) => {
    if (active === "grammar") {
      const g = ((grammarQ.data ?? []) as GrammarPoint[]).find(
        (x) => x.id === id
      )
      if (!g) return null
      return (
        <View style={{ gap: 8 }}>
          {!!g.simpleExplanation && (
            <Text style={[paperType.bodySm, { color: paper.ink }]}>
              {g.simpleExplanation}
            </Text>
          )}
          {(g.examples ?? []).slice(0, 3).map((e, i) => (
            <Fragment key={i}>
              <Text style={[paperType.note, { color: paper.inkMuted }]}>
                {headword(e)}
              </Text>
              <ReadingAid
                pinyin={reading(e)}
                size="label"
                color={paper.inkMuted}
              />
            </Fragment>
          ))}
        </View>
      )
    }
    if (active === "readings") {
      const r = ((readingsQ.data ?? []) as Reading[]).find((x) => x.id === id)
      if (!r) return null
      return (
        <View style={{ gap: 10 }}>
          {(r.paragraphs ?? [])
            .slice(0, 3)
            .map((p: ReadingParagraph, i: number) => (
              <View key={i} style={{ gap: 2 }}>
                <Text
                  style={{
                    fontFamily: families.lora,
                    fontSize: 17,
                    color: paper.ink,
                  }}
                >
                  {headword(p)}
                </Text>
                <ReadingAid
                  pinyin={reading(p)}
                  size="label"
                  color={paper.inkMuted}
                />
              </View>
            ))}
        </View>
      )
    }
    if (active === "conversations") {
      const c = ((conversationsQ.data ?? []) as ConversationScenario[]).find(
        (x) => x.id === id
      )
      if (!c) return null
      return (
        <View style={{ gap: 8 }}>
          {(c.turns ?? []).slice(0, 6).map((turn: DialogueTurn, i: number) => (
            <View key={i} style={{ gap: 2 }}>
              {!!turn.speaker && (
                <Text style={[paperType.label, { color: paper.greenDark }]}>
                  {turn.speaker}
                </Text>
              )}
              <Text style={[paperType.bodySm, { color: paper.ink }]}>
                {headword(turn)}
              </Text>
              <ReadingAid
                pinyin={reading(turn)}
                size="label"
                color={paper.inkMuted}
              />
            </View>
          ))}
        </View>
      )
    }
    const c = ((charactersQ.data ?? []) as HanziChar[]).find((x) => x.id === id)
    if (!c) return null
    return (
      <View style={{ gap: 4 }}>
        {!!c.meaning && (
          <Text style={[paperType.bodySm, { color: paper.ink }]}>
            {c.meaning}
          </Text>
        )}
        <Text style={[paperType.note, { color: paper.inkMuted }]}>
          {[
            c.strokes ? `${c.strokes} ${t("lib.strokes")}` : "",
            c.radical ? `${t("lib.radical")} ${c.radical}` : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </View>
    )
  }

  const openEntry = (id: string) => {
    if (active === "grammar")
      router.push({ pathname: "/grammar/[id]", params: { id } })
    else if (active === "readings")
      router.push({ pathname: "/reading/[id]", params: { id } })
    else if (active === "conversations")
      router.push({ pathname: "/conversation/[id]", params: { id } })
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: paper.paper }}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 48,
          gap: 22,
          maxWidth: column,
          width: "100%",
          alignSelf: "center",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={[paperType.label, { color: paper.inkMuted }]}>
              {t("lib.kicker")}
            </Text>
            <Text
              style={[
                paperType.greeting,
                { color: paper.ink, fontSize: 30, lineHeight: 34 },
              ]}
            >
              {t("lib.title")}
            </Text>
          </View>
          <Motif char={motifChar(language)} size={56} />
        </View>
        <View style={{ height: 1, backgroundColor: paper.line }} />

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {sections.map((s) => (
            <QuietPill
              key={s}
              title={t(SECTION_LABEL[s])}
              tone={active === s ? "challenge" : "plain"}
              onPress={() => {
                setSection(s)
                setOpenId(null)
                setQuery("")
                setLevel("all")
                setDifficulty("all")
                setFilterOpen(false)
              }}
            />
          ))}
        </View>

        {active === "grammar" && !errored && !activeQ.isLoading && (
          <View style={{ gap: 10 }}>
            <View
              style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
            >
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t("gram.searchPlaceholder")}
                placeholderTextColor={paper.inkMuted}
                accessibilityLabel={t("gram.searchAria")}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
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
                onPress={() => setFilterOpen((o) => !o)}
                accessibilityRole="button"
                accessibilityLabel={t("gram.difficultyFilter")}
                style={{
                  borderWidth: 1,
                  borderColor:
                    level !== "all" || difficulty !== "all"
                      ? paper.coral
                      : paper.line,
                  borderRadius: paper.radius.inner,
                  paddingHorizontal: 12,
                  paddingVertical: 11,
                  backgroundColor: paper.card,
                }}
              >
                <Text
                  style={[
                    paperType.label,
                    {
                      color:
                        level !== "all" || difficulty !== "all"
                          ? paper.coral
                          : paper.inkMuted,
                    },
                  ]}
                >
                  <Ionicons
                    name={filterOpen ? "chevron-down" : "options-outline"}
                    size={16}
                    color={
                      level !== "all" || difficulty !== "all"
                        ? paper.coral
                        : paper.inkMuted
                    }
                  />
                </Text>
              </Pressable>
            </View>

            {filterOpen && (
              <View style={{ gap: 10 }}>
                <View style={{ gap: 6 }}>
                  <Text style={[paperType.label, { color: paper.inkMuted }]}>
                    {t("gram.levelFilter")}
                  </Text>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                  >
                    <QuietPill
                      title={t("gram.allLevels", { exam: examName })}
                      tone={level === "all" ? "challenge" : "plain"}
                      onPress={() => setLevel("all")}
                    />
                    {levelLadder.map((l) => (
                      <QuietPill
                        key={l}
                        title={t("gram.levelOption", {
                          exam: examName,
                          level: l,
                        })}
                        tone={level === l ? "challenge" : "plain"}
                        onPress={() => setLevel(l)}
                      />
                    ))}
                  </View>
                </View>
                <View style={{ gap: 6 }}>
                  <Text style={[paperType.label, { color: paper.inkMuted }]}>
                    {t("gram.difficultyFilter")}
                  </Text>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                  >
                    <QuietPill
                      title={t("gram.allDifficulties")}
                      tone={difficulty === "all" ? "challenge" : "plain"}
                      onPress={() => setDifficulty("all")}
                    />
                    {difficultyLadder.map((d) => (
                      <QuietPill
                        key={d}
                        title={t("gram.difficultyOption", { n: d })}
                        tone={difficulty === d ? "challenge" : "plain"}
                        onPress={() => setDifficulty(d)}
                      />
                    ))}
                  </View>
                </View>
              </View>
            )}

            {filtering && rows.length > 0 && (
              <Text style={[paperType.note, { color: paper.inkMuted }]}>
                {t("gram.showing", {
                  n: rows.length,
                  total: grammarPoints.length,
                })}
              </Text>
            )}
          </View>
        )}

        {errored ? (
          <View style={{ gap: 16 }}>
            <EmptyState
              glyph="∅"
              title={t("lib.failedTitle")}
              message={t("common.loadFailed")}
            />
            <LiftedFace
              title={t("common.retry")}
              face={paper.green}
              disabled={activeQ.isFetching}
              onPress={() => activeQ.refetch()}
            />
          </View>
        ) : activeQ.isLoading ? (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <ActivityIndicator color={paper.green} />
          </View>
        ) : rows.length === 0 ? (
          <View style={{ gap: 16 }}>
            <EmptyState
              title={
                filtering
                  ? t("gram.noResults")
                  : active === "characters"
                    ? t("lib.noChars")
                    : t("lib.nothing")
              }
              message={filtering ? t("gram.clearFilters") : t("lib.nothingMsg")}
              glyph={motifChar(language)}
            />
            {filtering && (
              <LiftedFace
                title={t("gram.clearFilters")}
                face={paper.green}
                onPress={() => {
                  setQuery("")
                  setLevel("all")
                  setDifficulty("all")
                }}
              />
            )}
          </View>
        ) : (
          <PaperCard padded={false}>
            {rows.map((item, i) => (
              <LibraryRow
                key={item.id}
                title={item.title}
                sub={item.sub}
                open={openId === item.id}
                first={i === 0}
                onPress={() => open(item.id)}
              >
                {detail(item.id)}
                {active !== "characters" && (
                  <PressableScale
                    scale={0.99}
                    onPress={() => openEntry(item.id)}
                    accessibilityLabel={t("lib.open")}
                  >
                    <Text
                      style={[
                        paperType.bodySm,
                        { color: paper.greenDark, fontWeight: "700" },
                      ]}
                    >
                      {t("lib.open")} →
                    </Text>
                  </PressableScale>
                )}
              </LibraryRow>
            ))}
          </PaperCard>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function LibraryRow({
  title,
  sub,
  open,
  first,
  onPress,
  children,
}: {
  title: string
  sub: string
  open: boolean
  first: boolean
  onPress: () => void
  children?: React.ReactNode
}) {
  const { paper } = useTheme()
  const faces = useContentFaces()
  return (
    <View
      style={{
        borderTopWidth: first ? 0 : 1,
        borderTopColor: paper.lineSoft,
      }}
    >
      <PressableScale
        onPress={onPress}
        scale={0.995}
        accessibilityLabel={title}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 13,
          paddingHorizontal: 14,
        }}
      >
        <View style={{ flex: 1, gap: 3 }}>
          <Text
            style={[
              // Entries here are the learner's own script — a character
              // library is glyphs first — so the face follows the language
              // rather than falling back to the Latin serif.
              paperType.cardTitleSm,
              { color: paper.ink, fontFamily: faces.display },
            ]}
            numberOfLines={2}
          >
            {title}
          </Text>
          {!!sub && (
            <Text
              style={[paperType.note, { color: paper.inkMuted }]}
              numberOfLines={open ? undefined : 1}
            >
              {sub}
            </Text>
          )}
        </View>
        <Text
          style={{
            fontFamily: families.lora,
            fontSize: 17,
            color: open ? paper.green : paper.inkMuted,
          }}
        >
          <Ionicons
            name={open ? "chevron-down" : "chevron-forward"}
            size={15}
            color={open ? paper.green : paper.inkMuted}
          />
        </Text>
      </PressableScale>
      {open && !!children && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10 }}>
          {children}
        </View>
      )}
    </View>
  )
}
