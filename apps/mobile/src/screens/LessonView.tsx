import { BackLink } from "@/components/ui/BackLink"
import { useState } from "react"
import { ActivityIndicator, ScrollView, Text, View } from "react-native"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { EmptyState } from "@/components/ui/EmptyState"
import { ProgressBar } from "@/components/ui/ProgressBar"
import { LiftedFace, PaperCard } from "@/components/study/PaperCard"
import { PressableScale } from "@/components/study/press"
import { useContentFaces } from "@/hooks/useContentFaces"
import { useContentLayout } from "@/theme/layout"
import { useTheme } from "@/theme/ThemeProvider"
import { paperType } from "@/theme/paperType"
import { loadCurriculum } from "@/lib/content-data"
import { motifChar } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { logStudyWithQueue } from "@/utils/offlineQueue"
import { useT } from "@/i18n"
import { tap, thud } from "@/utils/feedback"

interface LessonStep {
  id: string
  type?: string
  title?: string
  body?: string[]
}

interface Lesson {
  id: string
  unitId?: string
  order?: number
  title: string
  subtitle?: string
  durationMin?: number
  xp?: number
  steps?: LessonStep[]
}

/**
 * /lesson/[id] — the step player (web parity: /lesson/[lessonId]).
 *
 * One step at a time against a fixed plan, rendering the curriculum bundle's
 * steps. **Completing a lesson logs the time and XP it is worth** — the same
 * write the program browser makes, so a lesson is not a thing you read and a
 * progress bar is not a thing you watch.
 *
 * The steps are teaching material in the learner's own language, so their text
 * is set in the content face. A CJK lesson body rendered in the Latin serif
 * silently loses its glyphs, and a Latin one set in a CJK face reads as a
 * mistake.
 */
export function LessonView() {
  const { paper } = useTheme()
  const { column: columnWidth } = useContentLayout()
  const faces = useContentFaces()
  const t = useT()
  const router = useRouter()
  const qc = useQueryClient()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const language = useOnboardingStore((s) => s.language)

  const [step, setStep] = useState(0)

  const curriculumQ = useQuery({
    queryKey: ["curriculum", language],
    queryFn: () => loadCurriculum(language),
  })
  const lesson = ((curriculumQ.data?.lessons ?? []) as Lesson[]).find(
    (l) => l.id === id
  )
  const steps = lesson?.steps ?? []

  const doneM = useMutation({
    mutationFn: () =>
      logStudyWithQueue(lesson?.durationMin ?? 10, lesson?.xp ?? 20),
    onSuccess: () => {
      thud()
      qc.invalidateQueries({ queryKey: ["progress"] })
      goBack()
    },
  })

  const goBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace("/program")
  }

  const current = steps[step]
  const last = steps.length > 0 && step >= steps.length - 1

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: paper.paper }}
      edges={["top"]}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 14,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <BackLink label={t("review.back")} fallback="/program" />
        <Text style={[paperType.label, { color: paper.inkMuted }]}>
          {steps.length === 0
            ? (lesson?.title ?? "")
            : `${step + 1} ${t("lesson.of")} ${steps.length}`}
        </Text>
      </View>
      <ProgressBar
        value={steps.length === 0 ? 0 : (step + 1) / steps.length}
        height={2}
        tint={paper.green}
      />
      <ScrollView
        contentContainerStyle={{
          width: "100%",
          maxWidth: columnWidth,
          alignSelf: "center",
          padding: 20,
          paddingBottom: 48,
          gap: 22,
        }}
      >
        {curriculumQ.isLoading ? (
          <PaperCard tone="review" style={{ alignItems: "center" }}>
            <ActivityIndicator color={paper.green} />
          </PaperCard>
        ) : curriculumQ.isError ? (
          <View style={{ gap: 16 }}>
            <EmptyState
              title={t("lib.failedTitle")}
              message={t("common.loadFailed")}
              glyph={motifChar(language)}
            />
            <LiftedFace
              title={t("common.retry")}
              face={paper.green}
              onPress={() => curriculumQ.refetch()}
            />
          </View>
        ) : !lesson ? (
          <EmptyState
            title={t("vocab.notFound")}
            message={t("lib.nothingMsg")}
            glyph={motifChar(language)}
          />
        ) : steps.length === 0 || !current ? (
          <PaperCard tone="word" title={lesson.title} body={lesson.subtitle} />
        ) : (
          <>
            <PaperCard tone="word">
              <Text style={[paperType.label, { color: paper.greenDark }]}>
                {(current.type ?? t("lesson.of")).toUpperCase()}
              </Text>
              <Text
                style={[
                  paperType.cardTitle,
                  { color: paper.ink, fontSize: 22, lineHeight: 28 },
                ]}
              >
                {current.title ?? lesson.title}
              </Text>
              {(current.body ?? []).map((p, i) => (
                <Text
                  key={i}
                  style={{
                    fontFamily: faces.display,
                    fontSize: 17,
                    lineHeight: 26,
                    color: paper.inkSoft,
                  }}
                >
                  {p}
                </Text>
              ))}
            </PaperCard>

            <View style={{ flexDirection: "row", gap: 10 }}>
              {step > 0 && (
                <View style={{ flex: 1 }}>
                  <LiftedFace
                    small
                    title={t("common.back")}
                    face={paper.inkSoft}
                    textColor={paper.ink}
                    onPress={() => {
                      tap()
                      setStep((s) => s - 1)
                    }}
                  />
                </View>
              )}
              <View style={{ flex: 2 }}>
                <LiftedFace
                  small
                  title={last ? t("prog.markComplete") : t("common.next")}
                  face={last ? paper.green : paper.coral}
                  disabled={doneM.isPending}
                  onPress={() => {
                    tap()
                    if (last) doneM.mutate()
                    else setStep((s) => s + 1)
                  }}
                />
              </View>
            </View>

            <Text
              style={[
                paperType.statLabel,
                { color: paper.inkMuted, textAlign: "center" },
              ]}
            >
              {lesson.durationMin ?? 10} {t("journey.minAbbrev")} ·{" "}
              {lesson.xp ?? 20} XP
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
