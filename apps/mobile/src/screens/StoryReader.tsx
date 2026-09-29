import { useMemo, useState } from "react"
import { Pressable, Text, View } from "react-native"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ReadingShell, TappableText } from "@/components/study/reading"
import { PaperCard } from "@/components/study/PaperCard"
import { MultipleChoiceCard } from "@/components/study/MultipleChoiceCard"
import { QueuedNote } from "@/components/study/QueuedNote"
import { STUDY_DIRTY_KEYS, logStudyWithQueue } from "@/utils/offlineQueue"
import { useTheme } from "@/theme/ThemeProvider"
import { paperType, families } from "@/theme/paperType"
import { loadReadings } from "@/lib/content-data"
import { useOnboardingStore } from "@/store/onboarding"
import { useDisplayMode } from "@/hooks/useDisplayMode"
import { useTts } from "@/hooks/useTts"
import { useT, useLocaleStore } from "@/i18n"
import { playSound } from "@/utils/sound"
import { tap } from "@/utils/feedback"
import type { ReadingParagraph } from "@/types/api"

/**
 * The story reader.
 *
 * The readings here are authored as **sentence-sized paragraphs**, each
 * carrying its own reading, phonetic script and translation — so the page turn is
 * the content's own rather than a re-cut of a long string, and the narration
 * position is a paragraph index rather than a character offset reconstructed
 * from speech boundary events.
 *
 * What is kept: tap-to-look-up (every recognised word opens its entry without
 * leaving the page), per-paragraph replay, a transport for the whole passage,
 * and the guarded back arrow.
 */
export function StoryReader() {
  const { paper } = useTheme()
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const language = useOnboardingStore((s) => s.language)
  const tts = useTts()
  const { showsPinyin, showsZhuyin, showsTranslation } = useDisplayMode()
  const qc = useQueryClient()

  const readingsQ = useQuery({
    queryKey: ["library-readings", language],
    queryFn: () => loadReadings(language),
  })
  const story = useMemo(
    () => (readingsQ.data ?? []).find((r) => r.id === id),
    [readingsQ.data, id]
  )

  const paragraphs = (story?.paragraphs ?? []) as ReadingParagraph[]
  const [showQuestions, setShowQuestions] = useState(false)
  const questions = story?.questions ?? []

  // Reading is worth a little study time and more for a right answer, which is
  // the same weight the web reader gives it.
  const answeredM = useMutation({
    mutationFn: (ok: boolean) => logStudyWithQueue(2, ok ? 8 : 2),
    onSuccess: () =>
      STUDY_DIRTY_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  })

  /** Indonesian-first gloss, English fallback — the content's own rule. */
  const gloss = (p: ReadingParagraph) => {
    const rec = p as unknown as {
      translation_id?: string
      translation_en?: string
    }
    return (
      (locale === "id" ? rec.translation_id : rec.translation_en) ??
      p.translation ??
      ""
    )
  }

  const playAll = () => {
    if (!story) return
    tap()
    playSound("tap")
    const text = paragraphs.map((p) => p.hanzi ?? p.text ?? "").join("\n")
    tts.play(text)
  }

  if (!readingsQ.isLoading && !story) {
    return (
      <ReadingShell title={t("vocab.notFound")} fallback="/books">
        <Text
          style={[
            paperType.cardBody,
            { color: paper.inkMuted, fontFamily: families.nunitoSemiBold },
          ]}
        >
          {t("lib.nothingMsg")}
        </Text>
      </ReadingShell>
    )
  }

  return (
    <ReadingShell
      title={story?.title ?? t("common.loading")}
      kicker={
        story
          ? [
              story.level ?? "",
              story.hsk ? `HSK ${story.hsk}` : "",
              `${story.wordCount ?? 0} ${t("read.words")}`,
            ]
              .filter(Boolean)
              .join(" · ")
          : undefined
      }
      fallback="/books"
    >
      <Stack.Screen options={{ headerShown: false }} />

      {!!story?.summary && (
        <Text
          style={[
            paperType.proseSm,
            { color: paper.inkSoft, fontStyle: "italic" },
          ]}
        >
          {story.summary}
        </Text>
      )}

      {/* Transport for the whole passage. */}
      <PaperCard tone="week">
        <Pressable
          onPress={playAll}
          style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
        >
          <Text style={{ fontSize: 22 }}>
            {tts.playing || tts.loading ? "⏸" : "▶"}
          </Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              style={[
                paperType.cardBody,
                { color: paper.ink, fontFamily: families.nunitoBold },
              ]}
            >
              {tts.playing || tts.loading
                ? t("vocab.playing")
                : t("read.playAll")}
            </Text>
            <Text
              style={[
                paperType.statLabel,
                { color: paper.inkMuted, fontFamily: families.nunitoSemiBold },
              ]}
            >
              {t("read.tapHint")}
            </Text>
          </View>
        </Pressable>
      </PaperCard>

      {paragraphs.map((p, i) => (
        <View key={i} style={{ gap: 6 }}>
          <TappableText text={p.hanzi ?? p.text ?? ""} size={22} />
          {/* The content carries both scripts, but showing both to everyone
              buries the passage. Which one appears follows the display
              preference, so a learner reading pinyin is not also handed
              zhuyin under every line. */}
          {showsPinyin() && !!p.pinyin && (
            <Text
              style={[
                paperType.statLabel,
                { color: paper.coral, fontFamily: families.nunitoSemiBold },
              ]}
            >
              {p.pinyin}
            </Text>
          )}
          {showsZhuyin() && !!p.zhuyin && (
            <Text
              style={[
                paperType.statLabel,
                { color: paper.inkMuted, fontFamily: families.nunitoSemiBold },
              ]}
            >
              {p.zhuyin}
            </Text>
          )}
          {showsTranslation() && gloss(p) ? (
            <Text style={[paperType.proseSm, { color: paper.inkSoft }]}>
              {gloss(p)}
            </Text>
          ) : null}
          <Pressable
            onPress={() => {
              tap()
              tts.play(p.hanzi ?? p.text ?? "")
            }}
            style={{ alignSelf: "flex-start", paddingVertical: 2 }}
          >
            <Text
              style={[
                paperType.link,
                { color: paper.inkMuted, fontFamily: families.nunitoBold },
              ]}
            >
              ▸ {t("read.replay")}
            </Text>
          </Pressable>
        </View>
      ))}

      {/* Comprehension. Most passages carry questions and this reader used to
          stop at the last paragraph, so on the majority of reading material the
          questions existed in the bundle and nothing ever showed them. Kept
          behind a press: the passage is the thing, and a wall of questions
          before it has been read is a different activity. */}
      {questions.length > 0 && (
        <View style={{ gap: 14, marginTop: 6 }}>
          <Pressable
            onPress={() => setShowQuestions((v) => !v)}
            accessibilityRole="button"
          >
            <PaperCard tone="week">
              <Text
                style={[
                  paperType.cardBody,
                  { color: paper.ink, fontFamily: families.nunitoBold },
                ]}
              >
                {showQuestions ? t("read.hideQuestions") : t("read.questions")}
                {"  "}
                {String.fromCharCode(0x25be)}
              </Text>
            </PaperCard>
          </Pressable>

          {showQuestions && (
            <>
              {questions.map((q) => (
                <MultipleChoiceCard
                  key={q.id}
                  exercise={q}
                  onAnswered={(ok: boolean) => {
                    answeredM.mutate(ok)
                  }}
                />
              ))}
              <QueuedNote
                show={answeredM.isSuccess && !!answeredM.data?.offline}
              />
            </>
          )}
        </View>
      )}
    </ReadingShell>
  )
}
