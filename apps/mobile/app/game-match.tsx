import { BackLink } from "@/components/ui/BackLink"
import { useMemo, useRef, useState } from "react"
import { ActivityIndicator, ScrollView, Text, View } from "react-native"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { EmptyState } from "@/components/ui/EmptyState"
import { LiftedFace, PaperCard, PaperStat } from "@/components/study/PaperCard"
import { PressableScale } from "@/components/study/press"
import { useContentFaces } from "@/hooks/useContentFaces"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentLayout } from "@/theme/layout"
import { paperType, families } from "@/theme/paperType"
import { progress, game } from "@/api/endpoints"
import { loadVocabulary } from "@/lib/content-data"
import { headword, isCharScript, motifChar } from "@/lib/languages"
import { useT } from "@/i18n"
import { useOnboardingStore } from "@/store/onboarding"
import { STUDY_DIRTY_KEYS, logStudyWithQueue } from "@/utils/offlineQueue"
import type { VocabWord } from "@/types/api"

interface Card {
  id: string
  label: string
  /** Which half of the pair this card shows — not which script it is set in. */
  side: "term" | "meaning"
  wordId: string
  matched: boolean
}

export default function GameMatch() {
  const { paper } = useTheme()
  const { column } = useContentLayout()
  const faces = useContentFaces()
  const router = useRouter()
  const qc = useQueryClient()
  const language = useOnboardingStore((s) => s.language)
  const t = useT()

  const page = useQuery({
    queryKey: ["game-match-pool", language],
    queryFn: async () => {
      const all = await loadVocabulary(language)
      return all.slice(0, 8)
    },
  })

  const [cards, setCards] = useState<Card[]>([])
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState<string | null>(null)
  const [wrong, setWrong] = useState<string[]>([])
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [matches, setMatches] = useState(0)
  const [moves, setMoves] = useState(0)
  const [startTs, setStartTs] = useState<number | null>(null)

  const totalPairs = useMemo(() => cards.length / 2, [cards])

  /**
   * Saving is the last thing this screen does, and the learner is standing on
   * the "all matched" screen waiting for it. Navigating away in the press
   * handler instead of here meant a failed POST left the accuracy and XP
   * nowhere — the screen had already gone, and nothing was ever retried. The
   * exit belongs to the result, not to the tap.
   */
  const submitM = useMutation({
    mutationFn: async () => {
      if (!page.data) return
      const pairs = page.data.length
      const accuracy = pairs === 0 ? 0 : matches / pairs
      await game.addGameResult(
        isCharScript(language) ? "match-hanzi" : "match-word",
        accuracy,
        matches * 10
      )
      const durMin = startTs
        ? Math.max(1, Math.round((Date.now() - startTs) / 60000))
        : 1
      await logStudyWithQueue(durMin, matches * 10)
    },
    onSuccess: () => {
      STUDY_DIRTY_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
      qc.invalidateQueries({ queryKey: ["progress", "overview"] })
      router.back()
    },
  })

  const start = () => {
    if (!page.data) return
    const list: Card[] = []
    page.data.forEach((w) => {
      list.push({
        id: `${w.id}-t`,
        label: headword(w),
        side: "term",
        wordId: w.id,
        matched: false,
      })
      list.push({
        id: `${w.id}-m`,
        label: (w as { translation?: string }).translation ?? "—",
        side: "meaning",
        wordId: w.id,
        matched: false,
      })
    })
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[list[i], list[j]] = [list[j], list[i]]
    }
    setCards(list)
    setOpen(null)
    setMatches(0)
    setMoves(0)
    setStartTs(Date.now())
  }

  const flip = (id: string) => {
    if (!open) {
      setOpen(id)
      return
    }
    if (open === id) {
      setOpen(null)
      return
    }
    const c1 = cards.find((c) => c.id === open)
    const c2 = cards.find((c) => c.id === id)
    setMoves((m) => m + 1)
    if (c1 && c2 && c1.wordId === c2.wordId && c1.side !== c2.side) {
      setCards((cs) =>
        cs.map((c) =>
          c.id === c1.id || c.id === c2.id ? { ...c, matched: true } : c
        )
      )
      setMatches((m) => m + 1)
      setOpen(null)
      return
    }
    // Hold the pair face-up in the "wrong" colour before turning it back.
    // Closing straight away left the second tap with no result to read at all.
    setWrong([c1?.id, c2?.id].filter((v): v is string => !!v))
    setOpen(null)
    if (wrongTimer.current) clearTimeout(wrongTimer.current)
    wrongTimer.current = setTimeout(() => setWrong([]), 700)
  }

  // "1 moves" reads as a bug; Indonesian has no plural forms, so the two keys
  // only differ in English.
  const counted = (n: number, one: "game.move", many: "game.moves") =>
    `${n} ${t(n === 1 ? one : many)}`

  const masthead = (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <BackLink label={t("game.back")} fallback="/(tabs)" />
        {cards.length > 0 && (
          <Text style={[paperType.label, { color: paper.inkMuted }]}>
            {matches}/{totalPairs} {t("game.pairs")} ·{" "}
            {counted(moves, "game.move", "game.moves")}
          </Text>
        )}
      </View>
      <View style={{ height: 1, backgroundColor: paper.line }} />
    </View>
  )

  if (page.isLoading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: paper.paper,
          alignItems: "center",
          justifyContent: "center",
        }}
        edges={["top"]}
      >
        <ActivityIndicator color={paper.green} size="large" />
      </SafeAreaView>
    )
  }

  if (page.isError) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: paper.paper }}
        edges={["top"]}
      >
        <ScrollView
          contentContainerStyle={{
            padding: 20,
            // The fixed 48 left the last row under the navigation bar.
            paddingBottom: 48 + insets.bottom,
            gap: 22,
            maxWidth: column,
            width: "100%",
            alignSelf: "center",
          }}
        >
          {masthead}
          <EmptyState
            title={t("game.failedTitle")}
            message={t("common.loadFailed")}
            glyph={motifChar(language)}
          />
          <LiftedFace
            title={t("common.retry")}
            face={paper.green}
            onPress={() => page.refetch()}
          />
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (!page.data) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: paper.paper }}
        edges={["top"]}
      >
        <ScrollView
          contentContainerStyle={{
            padding: 20,
            // The fixed 48 left the last row under the navigation bar.
            paddingBottom: 48 + insets.bottom,
            gap: 22,
            maxWidth: column,
            width: "100%",
            alignSelf: "center",
          }}
        >
          {masthead}
          <EmptyState
            title={t("game.nothingToPlay")}
            glyph={motifChar(language)}
          />
          <LiftedFace
            title={t("game.back")}
            face={paper.ink}
            textColor={paper.paper}
            onPress={() => router.back()}
          />
        </ScrollView>
      </SafeAreaView>
    )
  }

  const won = totalPairs > 0 && matches === totalPairs

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
        {masthead}

        {cards.length === 0 ? (
          <PaperCard tone="word" style={{ gap: 16, alignItems: "center" }}>
            <Text
              style={[
                paperType.cardTitle,
                { color: paper.ink, textAlign: "center" },
              ]}
            >
              {isCharScript(language)
                ? t("learn.hanziMatch")
                : t("learn.wordMatch")}
            </Text>
            <Text
              style={[
                paperType.note,
                { color: paper.inkMuted, textAlign: "center" },
              ]}
            >
              {isCharScript(language) ? t("game.pairChar") : t("game.pairWord")}{" "}
              {page.data.length} {t("game.cards")}
            </Text>
            <LiftedFace
              title={t("game.start")}
              face={paper.green}
              onPress={start}
            />
          </PaperCard>
        ) : won ? (
          <PaperCard tone="review" style={{ gap: 16, alignItems: "center" }}>
            <Text
              style={[
                paperType.cardTitle,
                { color: paper.ink, textAlign: "center" },
              ]}
            >
              {t("game.allMatched")}
            </Text>
            <PaperStat
              value={`+${matches * 10}`}
              label={`${t("game.xpLogged")} · ${counted(moves, "game.move", "game.moves")}`}
            />
            {submitM.isError && (
              <Text
                style={[
                  paperType.note,
                  { color: paper.coral, textAlign: "center" },
                ]}
              >
                {t("game.saveFailed")}
              </Text>
            )}
            <LiftedFace
              title={submitM.isPending ? t("game.saving") : t("game.saveExit")}
              face={paper.green}
              disabled={submitM.isPending}
              onPress={() => submitM.mutate()}
            />
          </PaperCard>
        ) : (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              marginHorizontal: -4,
              rowGap: 8,
            }}
          >
            {cards.map((c) => {
              const isOpen = open === c.id
              const isWrong = wrong.includes(c.id)
              const faceUp = c.matched || isOpen || isWrong
              return (
                <View key={c.id} style={{ width: "50%", padding: 4 }}>
                  <PressableScale
                    onPress={() => !c.matched && flip(c.id)}
                    disabled={c.matched}
                    accessibilityLabel={faceUp ? c.label : t("game.faceDown")}
                  >
                    <View
                      style={{
                        aspectRatio: 1.3,
                        borderWidth: 1,
                        borderRadius: 12,
                        borderColor: c.matched
                          ? paper.green
                          : isWrong
                            ? paper.coral
                            : isOpen
                              ? paper.ring
                              : paper.line,
                        backgroundColor: c.matched
                          ? paper.greenSoft
                          : isWrong
                            ? paper.coralSoft
                            : isOpen
                              ? paper.cardAlt
                              : paper.card,
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 10,
                      }}
                    >
                      <Text
                        style={{
                          // The face follows what the card is showing, not
                          // which side of the pair it is: a German headword in
                          // a CJK typeface reads as a mistake, and a Chinese
                          // one in the Latin serif is missing its glyphs.
                          fontFamily: faceUp
                            ? c.side === "term"
                              ? faces.display
                              : families.nunito
                            : families.nunito,
                          fontSize: faceUp ? (c.side === "term" ? 24 : 15) : 26,
                          color: c.matched
                            ? paper.greenDark
                            : isWrong
                              ? paper.coral
                              : faceUp
                                ? paper.ink
                                : paper.inkMuted,
                          textAlign: "center",
                        }}
                        numberOfLines={2}
                      >
                        {faceUp ? c.label : "?"}
                      </Text>
                    </View>
                  </PressableScale>
                </View>
              )
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
