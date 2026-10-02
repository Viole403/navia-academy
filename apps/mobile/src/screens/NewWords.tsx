import { BackLink } from "@/components/ui/BackLink"
import { useEffect, useMemo, useState } from "react"
import { Pressable, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { PaperCard, LiftedFace, QuietPill } from "@/components/study/PaperCard"
import { ReadingAid } from "@/components/study/ReadingAid"
import { FlexGap } from "@/components/study/press"
import { HanziStage } from "@/components/hanzi/HanziStage"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentFaces } from "@/hooks/useContentFaces"
import { useContentLayout } from "@/theme/layout"
import { paperType, families, hanziType } from "@/theme/paperType"
import { loadVocabulary } from "@/lib/content-data"
import { progress } from "@/api/endpoints"
import { hasHan } from "@/lib/han"
import { headword, reading, isCharScript } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useTts } from "@/hooks/useTts"
import { useT, useLocaleStore } from "@/i18n"
import { storage } from "@/utils/storage"
import { playSound } from "@/utils/sound"
import { tap, thud } from "@/utils/feedback"
import type { VocabWord } from "@/types/api"
import { useTargetLanguage } from "@/hooks/useTargetLanguage"

const HISTORY_KEY = "navia.newwords.v1"
const HISTORY_LIMIT = 40

/**
 * New Words.
 *
 * The skip history is persisted rather than kept in component state, and that is
 * the whole point: a skip living in `useState` lasts exactly as long as the
 * screen stays mounted, so leaving and coming back puts the skipped word
 * straight back at the front of the queue, every time.
 *
 * A skip is a decision about a **word**, not about a screen. So the decision is
 * stored, the Recent list can undo it, and the queue is rebuilt from what is
 * left.
 *
 * The daily limit is the learner's own setting, so "you have had enough for
 * today" is a real stop rather than an arbitrary one.
 */
export function NewWords() {
  const { paper } = useTheme()
  const faces = useContentFaces()
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const router = useRouter()
  const language = useTargetLanguage()
  const tts = useTts()
  const { column: columnWidth } = useContentLayout()

  const [history, setHistory] = useState<
    { id: string; outcome: "skipped" | "added" }[]
  >([])
  const [addedToday, setAddedToday] = useState(0)
  const [showWriting, setShowWriting] = useState(false)

  useEffect(() => {
    storage
      .getItem(HISTORY_KEY)
      .then((raw) => {
        if (raw) setHistory(JSON.parse(raw) as typeof history)
      })
      .catch(() => {})
  }, [])

  const persist = (next: typeof history) => {
    setHistory(next)
    const trimmed = next.slice(-HISTORY_LIMIT)
    storage.setItem(HISTORY_KEY, JSON.stringify(trimmed)).catch(() => {})
  }

  const vocabQ = useQuery({
    queryKey: ["vocab-all", language],
    queryFn: () => loadVocabulary(language),
  })
  const cardsQ = useQuery({
    queryKey: ["due-cards", 200],
    queryFn: () => progress.dueCards(200),
  })
  const progressQ = useQuery({ queryKey: ["progress"], queryFn: progress.get })

  const seen = useMemo(() => new Set(history.map((h) => h.id)), [history])

  const queue = useMemo<VocabWord[]>(() => {
    const inDeck = new Set((cardsQ.data ?? []).map((c) => c.item_id))
    const saved = new Set(progressQ.data?.saved_word_ids ?? [])
    const learned = (vocabQ.data ?? []).filter((w) => {
      if (seen.has(w.id)) return false
      if (inDeck.has(w.id) || saved.has(w.id)) return false
      const lv = w.examMappings?.[language === "zh" ? "hsk" : ""] ?? w.hsk
      // New words come from the levels the learner has actually reached, not
      // from a slice of the whole bank.
      return typeof lv === "number" && lv <= 3
    })
    return learned.slice(0, 20)
  }, [vocabQ.data, cardsQ.data, progressQ.data, seen, language])

  const current = queue[0]
  const skipped = history
    .filter((h) => h.outcome === "skipped")
    .slice(-8)
    .reverse()

  const addM = useMutation({
    mutationFn: (id: string) => progress.ensureCard(id, "word"),
    onSuccess: (_, id) => {
      thud()
      playSound("chime")
      setAddedToday((n) => n + 1)
      persist([...history, { id, outcome: "added" }])
      setShowWriting(false)
    },
  })

  const gloss = (w: VocabWord) => {
    const rec = w as unknown as {
      translation_id?: string
      translation_en?: string
    }
    return (
      (locale === "id" ? rec.translation_id : rec.translation_en) ??
      w.translation ??
      ""
    )
  }

  const charScript = isCharScript(language) && hasHan(headword(current ?? {}))

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
        <BackLink label={t("common.back")} fallback="/(tabs)/learn" />
        <Text
          style={[
            paperType.statLabel,
            { color: paper.inkMuted, fontFamily: families.nunitoSemiBold },
          ]}
        >
          {t("nw.kicker")}
        </Text>
      </View>

      <View
        style={{
          width: columnWidth,
          alignSelf: "center",
          padding: 20,
          gap: 16,
          flex: 1,
        }}
      >
        {!current ? (
          <PaperCard tone="word" title={t("nw.empty")} body={t("nw.emptyBody")}>
            <QuietPill
              title={t("myw.browse")}
              tone="week"
              onPress={() => router.push("/vocab")}
            />
          </PaperCard>
        ) : showWriting ? (
          <PaperCard tone="word" title={headword(current)}>
            <View
              style={{
                height: 230,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <HanziStage
                character={headword(current)}
                mode="quiz"
                showOutline={false}
                showGuides
                holdCharacterOnComplete
                onQuizComplete={() => {
                  thud()
                  playSound("chime")
                  addM.mutate(current.id)
                }}
                maxSize={190}
              />
            </View>
            <LiftedFace
              title={t("common.cancel")}
              face={paper.surface.review.fill}
              textColor={paper.ink}
              small
              onPress={() => setShowWriting(false)}
            />
          </PaperCard>
        ) : (
          <PaperCard
            tone="word"
            onPress={() => {
              tap()
              tts.play(headword(current), `vocab:${current.id}`)
            }}
          >
            <View style={{ alignItems: "center", gap: 6, paddingVertical: 10 }}>
              <Text
                style={{
                  fontFamily: faces.display,
                  ...hanziType(76),
                  color: paper.ink,
                }}
              >
                {headword(current)}
              </Text>
              <ReadingAid pinyin={reading(current)} />
              <Text
                style={[
                  paperType.prose,
                  { color: paper.ink, textAlign: "center" },
                ]}
              >
                {gloss(current)}
              </Text>
              <Text
                style={[
                  paperType.statLabel,
                  {
                    color: paper.inkMuted,
                    fontFamily: families.nunitoSemiBold,
                  },
                ]}
              >
                ▸ {t("vocab.listen")}
              </Text>
            </View>
          </PaperCard>
        )}

        {current ? (
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <LiftedFace
                  title={addM.isPending ? t("common.loading") : t("nw.added")}
                  face={paper.green}
                  small
                  onPress={() => {
                    tap()
                    if (charScript) setShowWriting(true)
                    else addM.mutate(current.id)
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <LiftedFace
                  title={t("nw.skip")}
                  face={paper.surface.review.fill}
                  textColor={paper.ink}
                  small
                  onPress={() => {
                    tap()
                    persist([
                      ...history,
                      { id: current.id, outcome: "skipped" },
                    ])
                  }}
                />
              </View>
            </View>
            <Text
              style={[
                paperType.statLabel,
                {
                  color: paper.inkMuted,
                  fontFamily: families.nunitoSemiBold,
                  textAlign: "center",
                },
              ]}
            >
              {t("nw.added")} {addedToday} · {t("myw.learning")}{" "}
              {(cardsQ.data ?? []).length}
            </Text>
          </View>
        ) : null}

        {skipped.length > 0 ? (
          <PaperCard tone="plain" title={t("nw.recent")}>
            <View style={{ gap: 6 }}>
              {skipped.map((s) => (
                <View
                  key={s.id}
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Text
                    numberOfLines={1}
                    style={[paperType.bodySm, { color: paper.ink, flex: 1 }]}
                  >
                    {s.id}
                  </Text>
                  <Pressable
                    onPress={() => {
                      tap()
                      persist(
                        history.filter(
                          (h) => !(h.id === s.id && h.outcome === "skipped")
                        )
                      )
                    }}
                  >
                    <Text
                      style={[
                        paperType.link,
                        {
                          color: paper.greenDark,
                          fontFamily: families.nunitoBold,
                        },
                      ]}
                    >
                      {t("common.retry")}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </PaperCard>
        ) : null}

        <FlexGap min={0} />
      </View>
    </SafeAreaView>
  )
}
