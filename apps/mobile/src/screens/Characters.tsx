import { useMemo, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native"
import { useQuery } from "@tanstack/react-query"
import { Screen } from "@/components/ui/Screen"
import { Chip } from "@/components/ui/Chip"
import { EmptyState } from "@/components/ui/EmptyState"
import { Input } from "@/components/ui/Input"
import { StudyCard, SectionHeader } from "@/components/study/StudyCard"
import { CONTENT_MAX, spacing, studyType } from "@/components/study/tokens"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts } from "@/theme/typography"
import { loadCharacters } from "@/lib/content-data"
import { isCharScript, motifChar } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useT } from "@/i18n"
import { tick } from "@/utils/feedback"
import type { HanziChar } from "@/types/api"

/**
 * /characters — read-only teaching set (web parity: /characters).
 * Ported from Chinese-Easy `Radicals`: radical chips + search + grid,
 * detail expands inline (strokes · radical · meaning). Never added to
 * My Words — these are reference, not vocabulary.
 */
export function Characters() {
  const { theme } = useTheme()
  const t = useT()
  const language = useOnboardingStore((s) => s.language)

  const [search, setSearch] = useState("")
  const [radical, setRadical] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const charsQ = useQuery({
    queryKey: ["characters", language],
    queryFn: () => loadCharacters(language),
  })

  const radicals = useMemo(() => {
    const m = new Set<string>()
    for (const c of charsQ.data ?? []) if (c.radical) m.add(c.radical)
    return [...m].sort()
  }, [charsQ.data])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (charsQ.data ?? [])
      .filter((c) => {
        if (radical && c.radical !== radical) return false
        if (!q) return true
        const glyph = (c.char ?? c.hanzi ?? "").toLowerCase()
        return (
          glyph.includes(q) ||
          (c.pinyin ?? "").toLowerCase().includes(q) ||
          (c.meaning ?? "").toLowerCase().includes(q)
        )
      })
      .slice(0, 120)
  }, [charsQ.data, search, radical])

  if (!isCharScript(language)) {
    return (
      <Screen>
        <EmptyState title={t("lib.noChars")} glyph={motifChar(language)} />
      </Screen>
    )
  }

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
        <SectionHeader kicker={t("char.kicker")} title={t("char.title")} />
        <Input
          placeholder={t("char.search")}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm }}
        >
          <Chip
            label={t("char.allRadicals")}
            selected={radical === null}
            onPress={() => {
              tick()
              setRadical(null)
            }}
          />
          {radicals.map((r) => (
            <Chip
              key={r}
              label={r}
              selected={radical === r}
              onPress={() => {
                tick()
                setRadical(radical === r ? null : r)
              }}
            />
          ))}
        </ScrollView>

        {charsQ.isLoading ? (
          <ActivityIndicator color={theme.accent} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={t("learn.nothingHere")}
            message={t("learn.tryDifferent")}
            glyph={motifChar(language)}
          />
        ) : (
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}
          >
            {filtered.map((c) => {
              const glyph = c.char ?? c.hanzi ?? c.id
              const open = openId === c.id
              return (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    tick()
                    setOpenId(open ? null : c.id)
                  }}
                  style={{
                    width: "31%",
                    minWidth: 96,
                    flexGrow: 1,
                    backgroundColor: open ? theme.accent + "14" : theme.surface,
                    borderColor: open ? theme.accent : theme.border,
                    borderWidth: 1,
                    borderRadius: 14,
                    padding: spacing.md,
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.serif,
                      fontSize: 40,
                      lineHeight: 48,
                      color: theme.text,
                    }}
                  >
                    {glyph}
                  </Text>
                  {!!c.pinyin && (
                    <Text
                      style={[
                        studyType.statLabel,
                        {
                          color: theme.accent,
                          fontFamily: fonts.sans,
                          fontWeight: "700",
                        },
                      ]}
                    >
                      {c.pinyin}
                    </Text>
                  )}
                  {open && (
                    <View
                      style={{ gap: 2, alignItems: "center", paddingTop: 4 }}
                    >
                      {!!c.meaning && (
                        <Text
                          style={[
                            studyType.statLabel,
                            {
                              color: theme.text,
                              fontFamily: fonts.sans,
                              textAlign: "center",
                            },
                          ]}
                          numberOfLines={2}
                        >
                          {c.meaning}
                        </Text>
                      )}
                      <Text
                        style={[
                          studyType.statLabel,
                          {
                            color: theme.textMuted,
                            fontFamily: fonts.sans,
                            textAlign: "center",
                          },
                        ]}
                      >
                        {[
                          c.strokes ? `${c.strokes} ${t("lib.strokes")}` : "",
                          c.radical ? `${t("lib.radical")} ${c.radical}` : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    </View>
                  )}
                </Pressable>
              )
            })}
          </View>
        )}

        <StudyCard
          tone="neutral"
          title={t("char.meaning")}
          body={t("learn.charsDesc")}
        />
      </View>
    </Screen>
  )
}
