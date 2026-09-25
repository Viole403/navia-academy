import { useState } from "react"
import { ActivityIndicator, Pressable, Text, View } from "react-native"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { Screen } from "@/components/ui/Screen"
import { EmptyState } from "@/components/ui/EmptyState"
import { ProgressBar } from "@/components/ui/ProgressBar"
import { StudyCard } from "@/components/study/StudyCard"
import { LiftedButton } from "@/components/study/LiftedButton"
import { CONTENT_MAX, spacing, studyType } from "@/components/study/tokens"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
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
 * /lesson/[id] — step player (web parity: /lesson/[lessonId]).
 * Ported from Chinese-Easy `LessonPlayer` in structure (one step at a
 * time, fixed plan) but renders Navia's CDN steps (title + body) instead
 * of match/scramble exercises. Completing logs study + XP like program.
 */
export function LessonView() {
  const { theme } = useTheme()
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
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{
          padding: spacing.lg,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <Pressable onPress={goBack}>
          <Text style={{ color: theme.textMuted, fontSize: 16 }}>
            {t("review.back")}
          </Text>
        </Pressable>
        <Text style={[type.labelSm, { color: theme.textMuted }]}>
          {steps.length === 0
            ? (lesson?.title ?? "")
            : `${step + 1} ${t("lesson.of")} ${steps.length}`}
        </Text>
      </View>
      <ProgressBar
        value={steps.length === 0 ? 0 : (step + 1) / steps.length}
        height={2}
        tint={theme.accent}
      />
      <Screen>
        <View
          style={{
            width: "100%",
            maxWidth: CONTENT_MAX,
            alignSelf: "center",
            gap: spacing.lg,
            flexGrow: 1,
          }}
        >
          {curriculumQ.isLoading ? (
            <ActivityIndicator color={theme.accent} />
          ) : !lesson ? (
            <EmptyState
              title={t("vocab.notFound")}
              message={t("lib.nothingMsg")}
              glyph={motifChar(language)}
            />
          ) : steps.length === 0 || !current ? (
            <StudyCard tone="word" title={lesson.title} body={lesson.subtitle}>
              <LiftedButton
                title={t("prog.markComplete")}
                onPress={() => doneM.mutate()}
              />
            </StudyCard>
          ) : (
            <>
              <StudyCard
                tone="word"
                tag={(current.type ?? t("lesson.of")).toUpperCase()}
                title={current.title ?? lesson.title}
              >
                {(current.body ?? []).map((p, i) => (
                  <Text key={i} style={[type.body, { color: theme.text }]}>
                    {p}
                  </Text>
                ))}
              </StudyCard>
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                {step > 0 && (
                  <View style={{ flex: 1 }}>
                    <LiftedButton
                      small
                      title={t("common.back")}
                      face={theme.surfaceAlt}
                      textColor={theme.text}
                      onPress={() => {
                        tap()
                        setStep((s) => s - 1)
                      }}
                    />
                  </View>
                )}
                <View style={{ flex: 2 }}>
                  {last ? (
                    <LiftedButton
                      small
                      title={t("prog.markComplete")}
                      face={theme.green}
                      onPress={() => doneM.mutate()}
                    />
                  ) : (
                    <LiftedButton
                      small
                      title={t("common.next")}
                      onPress={() => {
                        tap()
                        setStep((s) => s + 1)
                      }}
                    />
                  )}
                </View>
              </View>
              <Text
                style={[
                  studyType.statLabel,
                  {
                    color: theme.textDim,
                    fontFamily: fonts.sans,
                    textAlign: "center",
                  },
                ]}
              >
                {lesson.durationMin ?? 10} min · {lesson.xp ?? 20} XP
              </Text>
            </>
          )}
        </View>
      </Screen>
    </SafeAreaView>
  )
}
