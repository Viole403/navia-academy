import { Ionicons } from "@expo/vector-icons"
import { STUDY_DIRTY_KEYS } from "@/utils/offlineQueue"
import { useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native"
import { Stack, useLocalSearchParams } from "expo-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { DetailShell } from "@/components/study/DetailShell"
import { PaperCard, LiftedFace } from "@/components/study/PaperCard"
import { ReadingAid } from "@/components/study/ReadingAid"
import { HanziStage } from "@/components/hanzi/HanziStage"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentFaces } from "@/hooks/useContentFaces"
import { paperType, families, hanziFont, hanziType } from "@/theme/paperType"
import { progress } from "@/api/endpoints"
import { findWord } from "@/lib/content-data"
import { isCharScript, headword, reading } from "@/lib/languages"
import { hasHan } from "@/lib/han"
import { useDisplayMode } from "@/hooks/useDisplayMode"
import { useOnboardingStore } from "@/store/onboarding"
import { useTts } from "@/hooks/useTts"
import { useT } from "@/i18n"
import { playSound } from "@/utils/sound"
import { tap, thud } from "@/utils/feedback"
import type { VocabWord } from "@/types/api"

interface Example {
  hanzi?: string
  text?: string
  pinyin?: string
  zhuyin?: string
  translation?: string
  translation_id?: string
  audio?: string
}

/**
 * Word detail.
 *
 * One gloss in the masthead, every sense below it — and the content already
 * separates the two, which is why the split is safe rather than a guess.
 *
 * A dictionary-derived bank lists every attested sense, and seven of them on a
 * flashcard teaches nothing. Here `translation` is the single canonical gloss the
 * quiz and answer logic already use, while `meanings[]` is the full list: 1,536
 * of the 10,894 words carry more than one sense, and those are exactly the words
 * the senses section exists for.
 */
export function WordDetail() {
  const { paper } = useTheme()
  const faces = useContentFaces()
  const t = useT()
  const qc = useQueryClient()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const language = useOnboardingStore((s) => s.language)
  const markWordViewed = useOnboardingStore((s) => s.markWordViewed)
  const tts = useTts()
  const {
    modeFor,
    showsPinyin: wantPinyin,
    showsZhuyin: wantZhuyin,
    showsTranslation: wantTranslation,
  } = useDisplayMode()
  const [strokesOpen, setStrokesOpen] = useState(false)
  const [hintKey, setHintKey] = useState(0)
  const [revealKey, setRevealKey] = useState(0)
  const [playingText, setPlayingText] = useState<string | null>(null)

  const wordQ = useQuery({
    queryKey: ["vocab-word", id],
    queryFn: async () => (await findWord(id as string)).word,
    enabled: !!id,
    staleTime: 60_000,
  })
  const progressQ = useQuery({ queryKey: ["progress"], queryFn: progress.get })
  const w = wordQ.data
  const isSaved = (progressQ.data?.saved_word_ids ?? []).includes(id ?? "")

  const saveM = useMutation({
    mutationFn: async () => {
      const current = progressQ.data?.saved_word_ids ?? []
      const next = isSaved
        ? current.filter((x) => x !== id)
        : [...current, id as string]
      return progress.update({ saved_word_ids: next })
    },
    onSuccess: () =>
      STUDY_DIRTY_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  })

  const addM = useMutation({
    mutationFn: () => progress.ensureCard(id as string, "word"),
    onSuccess: () => {
      thud()
      playSound("chime")
      qc.invalidateQueries({ queryKey: ["due-cards"] })
      qc.invalidateQueries({ queryKey: ["srs-stats"] })
    },
  })

  // Opening a word is the decision to learn it, so the card is created on
  // arrival rather than behind a button. `ensureCard` derives the card id from
  // user and item and does nothing on conflict, so re-opening is a no-op.
  const addedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!w || !id) return
    if (addedRef.current === id) return
    addedRef.current = id
    markWordViewed(id)
    addM.mutate()
  }, [w, id, addM, markWordViewed])

  if (wordQ.isLoading) {
    return (
      <DetailShell title={t("common.loading")} fallback="/vocab">
        <ActivityIndicator color={paper.coral} />
      </DetailShell>
    )
  }

  if (!w) {
    return (
      <DetailShell title={t("vocab.notFound")} fallback="/vocab">
        <Text
          style={[
            paperType.cardBody,
            { color: paper.inkMuted, fontFamily: families.nunitoSemiBold },
          ]}
        >
          {t("vocab.notInDict")}
        </Text>
      </DetailShell>
    )
  }

  const senses = (w.meanings as string[] | undefined) ?? []

  // Which readings sit under the character is the learner's call, not the
  // page's. A learner who reads pinyin fluently does not also want zhuyin
  // under every word, and one working from characters wants neither.
  const hskLevel =
    typeof w.hsk === "number"
      ? w.hsk
      : typeof w.level === "number"
        ? w.level
        : null
  const effMode = modeFor(hskLevel)
  const showPinyin = wantPinyin(effMode) && Boolean(reading(w))
  const showZhuyin = wantZhuyin(effMode) && Boolean(w.zhuyin)
  const showTranslation = wantTranslation(effMode)
  const examples = (w.examples as Example[] | undefined) ?? []
  const charScript = isCharScript(language) && hasHan(headword(w))

  return (
    <DetailShell
      title={headword(w)}
      kicker={String(w.examMappings?.hsk ?? w.examMappings?.tocfl ?? "")}
      fallback="/vocab"
      headerRight={
        <Pressable onPress={() => saveM.mutate()} disabled={saveM.isPending}>
          <Text
            style={{
              color: isSaved ? paper.coral : paper.inkMuted,
              fontFamily: families.nunitoExtraBold,
              fontSize: 10.5,
              letterSpacing: 0.6,
            }}
          >
            {isSaved ? t("vocab.saved") : t("vocab.save")}
          </Text>
        </Pressable>
      }
    >
      {/* Masthead: the glyph, its reading, its one gloss. */}
      <PaperCard tone="word">
        <View style={{ alignItems: "center", gap: 6, paddingVertical: 8 }}>
          <Text
            style={{
              fontFamily: faces.display,
              ...hanziType(96),
              color: paper.ink,
              textAlign: "center",
            }}
          >
            {headword(w)}
          </Text>
          {showPinyin && (
            <Text
              style={[
                paperType.cardBody,
                { color: paper.coral, fontFamily: families.nunitoBold },
              ]}
            >
              {reading(w)}
            </Text>
          )}
          {showZhuyin && (
            <Text style={[paperType.bodySm, { color: paper.inkSoft }]}>
              {String(w.zhuyin)}
            </Text>
          )}
          {!!w.traditional && (
            <Text
              style={[
                paperType.statLabel,
                { color: paper.inkMuted, fontFamily: families.nunitoSemiBold },
              ]}
            >
              {t("vocab.traditional")} · {w.traditional}
            </Text>
          )}
          {showTranslation && (
            <Text
              style={[
                paperType.prose,
                { color: paper.ink, textAlign: "center" },
              ]}
            >
              {String(w.translation ?? "")}
            </Text>
          )}
        </View>
      </PaperCard>

      {/* Every sense, one per line — the detail card's whole job. */}
      {senses.length > 0 && (
        <PaperCard tone="plain" title={t("wd.senses")}>
          <View style={{ gap: 6 }}>
            {senses.map((sense, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 8 }}>
                <Text
                  style={{
                    color: paper.greenDark,
                    fontFamily: families.nunitoBold,
                    fontSize: 12,
                  }}
                >
                  {i + 1}
                </Text>
                <Text style={[paperType.bodySm, { color: paper.ink, flex: 1 }]}>
                  {sense}
                </Text>
              </View>
            ))}
          </View>
        </PaperCard>
      )}

      {/* Examples, each with its own reading and translation. */}
      {examples.length > 0 ? (
        <PaperCard tone="week" title={t("wd.examples")}>
          <View style={{ gap: 14 }}>
            {examples.slice(0, 3).map((e, i) => {
              const line = e.hanzi ?? e.text ?? ""
              const speaking =
                playingText === line && (tts.playing || tts.loading)
              return (
                <Pressable
                  key={i}
                  onPress={() => {
                    tap()
                    setPlayingText(line)
                    tts.play(line)
                  }}
                  style={{ gap: 3 }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: faces.display,
                        ...hanziType(20),
                        color: paper.ink,
                        flex: 1,
                      }}
                    >
                      {line}
                    </Text>
                    {/* The sentence is already in the voice manifest, so it is
                        playable — it just has to look playable. */}
                    <Ionicons
                      name={speaking ? "volume-high" : "volume-medium-outline"}
                      size={15}
                      color={speaking ? paper.coral : paper.inkMuted}
                    />
                  </View>
                  <ReadingAid
                    pinyin={e.pinyin}
                    translation={e.translation}
                    size="label"
                    translationColor={paper.inkSoft}
                  />
                </Pressable>
              )
            })}
          </View>
        </PaperCard>
      ) : null}

      {/* Stroke order, behind a sheet so the detail page stays scannable. */}
      {charScript ? (
        <Pressable
          onPress={() => {
            tap()
            setStrokesOpen(true)
          }}
        >
          <PaperCard
            tone="challenge"
            title={t("wd.strokeOrder")}
            body={t("wd.strokeBody")}
          >
            <Text
              style={[
                paperType.link,
                { color: paper.lavender, fontFamily: families.nunitoBold },
              ]}
            >
              {t("wd.open")} →
            </Text>
          </PaperCard>
        </Pressable>
      ) : null}

      {/* Exam mapping, if this word is mapped at all. */}
      {w.examMappings && Object.keys(w.examMappings).length > 0 ? (
        <PaperCard tone="plain" title={t("vocab.includedIn")}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(w.examMappings)
              .filter(([k]) => k !== "metadata")
              .map(([exam, lv]) => (
                <View
                  key={`${exam}-${String(lv)}`}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderWidth: 1,
                    borderColor: paper.line,
                    borderRadius: paper.radius.pill,
                  }}
                >
                  <Text
                    style={{
                      color: paper.inkMuted,
                      fontFamily: families.nunitoBold,
                      fontSize: 11,
                      letterSpacing: 0.5,
                    }}
                  >
                    {exam.toUpperCase()} {String(lv).toUpperCase()}
                  </Text>
                </View>
              ))}
          </View>
        </PaperCard>
      ) : null}

      {/* Listen sits in the flow, under the exam mapping. As a pinned footer
          it was fighting the system nav bar for the last stretch of screen. */}
      <LiftedFace
        title={
          tts.playing || tts.loading ? t("vocab.playing") : t("vocab.listen")
        }
        face={paper.lavender}
        onPress={() => {
          tap()
          setPlayingText(null)
          tts.play(headword(w))
        }}
      />

      {strokesOpen ? (
        <StrokeSheet
          word={headword(w)}
          onClose={() => setStrokesOpen(false)}
          onHint={() => setHintKey((k) => k + 1)}
          onReveal={() => setRevealKey((k) => k + 1)}
          hintKey={hintKey}
          revealKey={revealKey}
        />
      ) : null}
      <Stack.Screen options={{ headerShown: false }} />
    </DetailShell>
  )
}

/**
 * The stroke-order sheet.
 *
 * The resting character derives its size rather than using a fixed 120pt with
 * `adjustsFontSizeToFit`: that prop is iOS-only, so on Android any word wide
 * enough simply lost its tail off the edge. CJK glyphs are full-width, which
 * makes available-width ÷ character count a good bound, capped at the design
 * size and against window height.
 */
function StrokeSheet({
  word,
  onClose,
  onHint,
  onReveal,
  hintKey,
  revealKey,
}: {
  word: string
  onClose: () => void
  onHint: () => void
  onReveal: () => void
  hintKey: number
  revealKey: number
}) {
  const { paper } = useTheme()
  const t = useT()
  const { width, height } = useWindowDimensions()
  const chars = [...word].length || 1
  const size = Math.min(
    150,
    Math.floor((width - 80) / chars),
    Math.floor(height * 0.28)
  )

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: paper.ink + "66",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Pressable onPress={onClose} style={{ position: "absolute", inset: 0 }} />
      <PaperCard tone="plain" style={{ width: "86%" }}>
        <View style={{ gap: 12 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={[
                paperType.cardTitleSm,
                { color: paper.ink, fontFamily: families.nunitoExtraBold },
              ]}
            >
              {t("wd.strokeOrder")}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
            >
              <Ionicons name="close" size={18} color={paper.inkMuted} />
            </Pressable>
          </View>

          <View
            style={{
              height: size + 24,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <HanziStage
              character={word}
              mode="demo"
              showOutline
              showGuides
              hintKey={hintKey}
              revealKey={revealKey}
              maxSize={size}
            />
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <LiftedFace
                title={t("wd.hint")}
                face={paper.surface.week.fill}
                textColor={paper.ink}
                small
                onPress={onHint}
              />
            </View>
            <View style={{ flex: 1 }}>
              <LiftedFace
                title={t("wd.reveal")}
                face={paper.lavender}
                small
                onPress={onReveal}
              />
            </View>
          </View>
        </View>
      </PaperCard>
    </View>
  )
}
