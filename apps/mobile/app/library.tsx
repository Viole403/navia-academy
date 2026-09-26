import { useMemo, useState } from "react"
import { ActivityIndicator, ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { EmptyState } from "@/components/ui/EmptyState"
import { Motif } from "@/components/ui/Motif"
import { LiftedFace, PaperCard, QuietPill } from "@/components/study/PaperCard"
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
import { headword, isCharScript, motifChar, reading } from "@/lib/languages"
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

  const rows: { id: string; title: string; sub: string }[] =
    active === "grammar"
      ? ((grammarQ.data ?? []) as GrammarPoint[]).map((g) => ({
          id: g.id,
          title: g.title,
          sub: g.pattern ?? g.level ?? "",
        }))
      : active === "readings"
        ? ((readingsQ.data ?? []) as Reading[]).map((r) => ({
            id: r.id,
            title: r.title,
            sub: r.summary ?? r.level ?? "",
          }))
        : active === "conversations"
          ? ((conversationsQ.data ?? []) as ConversationScenario[]).map(
              (c) => ({
                id: c.id,
                title: c.title,
                sub: c.context ?? c.level ?? "",
              })
            )
          : ((charactersQ.data ?? []) as HanziChar[]).map((c) => ({
              id: c.id,
              title: c.char ?? c.hanzi ?? c.id,
              sub: `${reading(c) ?? ""}${c.meaning ? ` · ${c.meaning}` : ""}`,
            }))

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
            <Text key={i} style={[paperType.note, { color: paper.inkMuted }]}>
              {headword(e)} {reading(e) ? `· ${reading(e)}` : ""}
            </Text>
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
                {!!reading(p) && (
                  <Text style={[paperType.note, { color: paper.inkMuted }]}>
                    {reading(p)}
                  </Text>
                )}
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
              {!!reading(turn) && (
                <Text style={[paperType.note, { color: paper.inkMuted }]}>
                  {reading(turn)}
                </Text>
              )}
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
              }}
            />
          ))}
        </View>

        {errored ? (
          <View style={{ gap: 16 }}>
            <EmptyState
              glyph="∅"
              title={t("lib.failedTitle")}
              message={t("lib.failedMsg")}
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
          <EmptyState
            title={
              active === "characters" ? t("lib.noChars") : t("lib.nothing")
            }
            message={t("lib.nothingMsg")}
            glyph={motifChar(language)}
          />
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
          {open ? "▾" : "›"}
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
