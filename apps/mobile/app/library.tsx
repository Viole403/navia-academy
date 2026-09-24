import { useMemo, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useQuery } from "@tanstack/react-query"
import { Chip } from "@/components/ui/Chip"
import { EmptyState } from "@/components/ui/EmptyState"
import { Enter } from "@/components/ui/Enter"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
import {
  loadCharacters,
  loadConversations,
  loadGrammar,
  loadReadings,
} from "@/lib/content-data"
import { headword, isCharScript, motifChar, reading } from "@/lib/languages"
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
  const { theme } = useTheme()
  const t = useT()
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

  const loading =
    (active === "grammar" && grammarQ.isLoading) ||
    (active === "readings" && readingsQ.isLoading) ||
    (active === "conversations" && conversationsQ.isLoading) ||
    (active === "characters" && charactersQ.isLoading)

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={["top"]}
    >
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
        <Enter index={0}>
          <View style={{ gap: 4 }}>
            <Text style={[type.labelSm, { color: theme.textMuted }]}>
              {t("lib.kicker")}
            </Text>
            <Text style={[type.display, { color: theme.text, fontSize: 32 }]}>
              {t("lib.title")}
            </Text>
          </View>
        </Enter>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {sections.map((s) => (
            <Chip
              key={s}
              label={t(SECTION_LABEL[s])}
              selected={active === s}
              onPress={() => {
                setSection(s)
                setOpenId(null)
              }}
            />
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={theme.accent} />
        ) : active === "grammar" ? (
          <ItemList
            t={t}
            items={(grammarQ.data ?? []).map((g: GrammarPoint) => ({
              id: g.id,
              title: g.title,
              sub: g.pattern ?? g.level ?? "",
            }))}
            openId={openId}
            onToggle={setOpenId}
            renderDetail={(id) => {
              const g = (grammarQ.data ?? []).find(
                (x: GrammarPoint) => x.id === id
              )
              if (!g) return null
              return (
                <View style={{ gap: 8 }}>
                  {!!g.simpleExplanation && (
                    <Text style={[type.bodySm, { color: theme.text }]}>
                      {g.simpleExplanation}
                    </Text>
                  )}
                  {(g.examples ?? []).slice(0, 3).map((e, i) => (
                    <Text
                      key={i}
                      style={[type.bodySm, { color: theme.textMuted }]}
                    >
                      {headword(e)} {reading(e) ? `· ${reading(e)}` : ""}
                    </Text>
                  ))}
                </View>
              )
            }}
          />
        ) : active === "readings" ? (
          <ItemList
            t={t}
            items={(readingsQ.data ?? []).map((r: Reading) => ({
              id: r.id,
              title: r.title,
              sub: r.summary ?? r.level ?? "",
            }))}
            openId={openId}
            onToggle={setOpenId}
            renderDetail={(id) => {
              const r = (readingsQ.data ?? []).find((x: Reading) => x.id === id)
              if (!r) return null
              return (
                <View style={{ gap: 10 }}>
                  {(r.paragraphs ?? [])
                    .slice(0, 3)
                    .map((p: ReadingParagraph, i: number) => (
                      <View key={i} style={{ gap: 2 }}>
                        <Text
                          style={{
                            fontFamily: fonts.serif,
                            fontSize: 17,
                            color: theme.text,
                          }}
                        >
                          {headword(p)}
                        </Text>
                        {!!reading(p) && (
                          <Text
                            style={[type.caption, { color: theme.textMuted }]}
                          >
                            {reading(p)}
                          </Text>
                        )}
                      </View>
                    ))}
                </View>
              )
            }}
          />
        ) : active === "conversations" ? (
          <ItemList
            t={t}
            items={(conversationsQ.data ?? []).map(
              (c: ConversationScenario) => ({
                id: c.id,
                title: c.title,
                sub: c.context ?? c.level ?? "",
              })
            )}
            openId={openId}
            onToggle={setOpenId}
            renderDetail={(id) => {
              const c = (conversationsQ.data ?? []).find(
                (x: ConversationScenario) => x.id === id
              )
              if (!c) return null
              return (
                <View style={{ gap: 8 }}>
                  {(c.turns ?? [])
                    .slice(0, 6)
                    .map((t: DialogueTurn, i: number) => (
                      <View key={i} style={{ gap: 2 }}>
                        {!!t.speaker && (
                          <Text style={[type.labelSm, { color: theme.accent }]}>
                            {t.speaker}
                          </Text>
                        )}
                        <Text style={[type.bodySm, { color: theme.text }]}>
                          {headword(t)}
                        </Text>
                        {!!reading(t) && (
                          <Text
                            style={[type.caption, { color: theme.textMuted }]}
                          >
                            {reading(t)}
                          </Text>
                        )}
                      </View>
                    ))}
                </View>
              )
            }}
          />
        ) : (charactersQ.data ?? []).length === 0 && !charactersQ.isLoading ? (
          <EmptyState title={t("lib.noChars")} glyph={motifChar(language)} />
        ) : (
          <ItemList
            t={t}
            items={(charactersQ.data ?? []).map((c: HanziChar) => ({
              id: c.id,
              title: c.char ?? c.hanzi ?? c.id,
              sub: `${reading(c) ?? ""}${c.meaning ? ` · ${c.meaning}` : ""}`,
            }))}
            openId={openId}
            onToggle={setOpenId}
            renderDetail={(id) => {
              const c = (charactersQ.data ?? []).find(
                (x: HanziChar) => x.id === id
              )
              if (!c) return null
              return (
                <View style={{ gap: 4 }}>
                  {!!c.meaning && (
                    <Text style={[type.bodySm, { color: theme.text }]}>
                      {c.meaning}
                    </Text>
                  )}
                  <Text style={[type.caption, { color: theme.textMuted }]}>
                    {[
                      c.strokes ? `${c.strokes} ${t("lib.strokes")}` : "",
                      c.radical ? `${t("lib.radical")} ${c.radical}` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
              )
            }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function ItemList({
  t,
  items,
  openId,
  onToggle,
  renderDetail,
}: {
  t: (key: I18nKey) => string
  items: { id: string; title: string; sub: string }[]
  openId: string | null
  onToggle: (id: string | null) => void
  renderDetail: (id: string) => React.ReactNode
}) {
  const { theme } = useTheme()
  if (items.length === 0) {
    return <EmptyState title={t("lib.nothing")} message={t("lib.nothingMsg")} />
  }
  return (
    <View style={{ gap: 4 }}>
      {items.slice(0, 50).map((item, i) => {
        const open = openId === item.id
        return (
          <Enter key={item.id} index={Math.min(i, 8)}>
            <Pressable
              onPress={() => onToggle(open ? null : item.id)}
              style={{
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
                gap: 2,
              }}
            >
              <Text
                style={[type.body, { color: theme.text, fontWeight: "600" }]}
              >
                {item.title}
              </Text>
              {!!item.sub && (
                <Text
                  style={[type.caption, { color: theme.textMuted }]}
                  numberOfLines={open ? undefined : 1}
                >
                  {item.sub}
                </Text>
              )}
              {open && (
                <View style={{ paddingTop: 8 }}>{renderDetail(item.id)}</View>
              )}
            </Pressable>
          </Enter>
        )
      })}
    </View>
  )
}
