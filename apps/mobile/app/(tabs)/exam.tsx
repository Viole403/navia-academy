import { useEffect, useState } from "react"
import { ActivityIndicator, ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  PaperCard,
  LiftedFace,
  QuietPill,
  PaperStat,
} from "@/components/study/PaperCard"
import { PressableScale } from "@/components/study/press"
import { EmptyState } from "@/components/ui/EmptyState"
import { Motif } from "@/components/ui/Motif"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentLayout } from "@/theme/layout"
import { paperType, families } from "@/theme/paperType"
import { exam, settings } from "@/api/endpoints"
import {
  examBadgeColor,
  examDisplayName,
  examLevels,
  languageInfo,
  motifChar,
} from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useT } from "@/i18n"
import { tap } from "@/utils/feedback"
import type { ExamProgress, ExamSession } from "@/types/api"

/**
 * The exam tab, as a page of paper.
 *
 * Four bands, each answering one question, in the order a person sitting down to
 * an exam actually asks them: *do I have one open?* · *let me start one* · *is
 * there another way?* · *how have I done, and what did I get last time?*
 *
 * **A live session is put first and styled as the only thing on the page that is
 * unfinished.** Everything else waits behind it. An exam half-answered is work
 * already spent, and burying it under a level picker is how a person quietly
 * loses twenty minutes of work they had already done.
 *
 * Level and track selection is a **grid of pills, not a menu** — the counts are
 * small and fixed (HSK 1–6, TOCFL 1–6, Goethe A1–C1, JLPT N5–N1, TOEFL-style),
 * so a list of every combination would be a worse read than the grid for no gain,
 * and the grid lets the whole ladder be seen at once.
 *
 * Pass and fail in the history read as *two different ordinary things*, not as
 * a verdict: the score keeps its green/ink and only the small word at the right
 * differs. A row that turned red told someone who had merely not reached the
 * pass mark that they had failed, which is not the same statement and is not
 * worth the extra red on the page.
 */
export default function ExamTab() {
  const { theme, paper } = useTheme()
  const t = useT()
  const router = useRouter()
  const qc = useQueryClient()
  const { column } = useContentLayout()
  const language = useOnboardingStore((s) => s.language)
  const storedExamType = useOnboardingStore((s) => s.examType)
  const setStoredExamType = useOnboardingStore((s) => s.setExamType)
  const examTypes = languageInfo(language).examTypes
  const info = languageInfo(language)
  const initType =
    storedExamType && examTypes.includes(storedExamType)
      ? storedExamType
      : examTypes[0]
  const [examType, setExamType] = useState(initType)
  const [examLevel, setExamLevel] = useState(examLevels(initType)[0])

  useEffect(() => {
    const types = languageInfo(language).examTypes
    const next =
      storedExamType && types.includes(storedExamType)
        ? storedExamType
        : types[0]
    setExamType(next)
    setExamLevel(examLevels(next)[0])
  }, [language, storedExamType])

  const pickExamType = (next: string) => {
    setExamType(next)
    setExamLevel(examLevels(next)[0])
    setStoredExamType(next)
    settings.update({ active_exam_type: next }).then(() => {
      qc.invalidateQueries({ queryKey: ["settings"] })
    })
  }

  const activeQ = useQuery({ queryKey: ["exam-active"], queryFn: exam.active })
  const progressQ = useQuery({
    queryKey: ["exam-progress"],
    queryFn: exam.progress,
  })
  const historyQ = useQuery({
    queryKey: ["exam-history"],
    queryFn: () => exam.history(),
  })

  const startM = useMutation({
    mutationFn: () => exam.create(examType, examLevel, { questionCount: 20 }),
    onSuccess: (session) => {
      qc.invalidateQueries({ queryKey: ["exam-active"] })
      router.push({
        pathname: "/exam-session" as never,
        params: { id: String(session.id) } as never,
      })
    },
  })

  const active = activeQ.data ?? []
  const progressList = progressQ.data ?? []
  const history = (historyQ.data ?? []).slice(0, 10)
  const accent = examBadgeColor(examType) ?? paper.green

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: paper.paper }}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          gap: 24,
          maxWidth: column,
          width: "100%",
          alignSelf: "center",
        }}
      >
        <View style={{ gap: 12 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={[paperType.label, { color: paper.inkMuted }]}>
                {t("exam.kicker")}
              </Text>
              <Text
                style={[
                  paperType.greeting,
                  { color: paper.ink },
                  { fontSize: 30, lineHeight: 34 },
                ]}
              >
                {t("exam.title")}
              </Text>
            </View>
            <Motif char={motifChar(language)} size={56} />
          </View>
          <View style={{ height: 1, backgroundColor: paper.line }} />
        </View>

        {active.length > 0 ? (
          <View style={{ gap: 10 }}>
            <Text style={[paperType.label, { color: paper.inkMuted }]}>
              {t("exam.inProgress")}
            </Text>
            {active.map((s) => (
              <ActiveSessionCard
                key={s.id}
                session={s}
                onResume={() =>
                  router.push({
                    pathname: "/exam-session" as never,
                    params: { id: String(s.id) } as never,
                  })
                }
              />
            ))}
          </View>
        ) : null}

        <PaperCard tone="plain">
          <View style={{ gap: 14 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  borderWidth: 1.5,
                  borderColor: accent,
                  backgroundColor: paper.cardAlt,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: 6,
                    backgroundColor: accent,
                  }}
                />
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={[paperType.cardTitle, { color: paper.ink }]}>
                  {examDisplayName(examType)}
                </Text>
                <Text style={[paperType.cardBody, { color: paper.inkMuted }]}>
                  {examLevels(examType).length} {t("exam.levels")} ·{" "}
                  {info.nativeName}
                </Text>
              </View>
            </View>

            {examTypes.length > 1 ? (
              <View style={{ gap: 6 }}>
                <Text style={[paperType.label, { color: paper.inkMuted }]}>
                  {t("exam.track")}
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {examTypes.map((x) => (
                    <QuietPill
                      key={x}
                      title={examDisplayName(x)}
                      onPress={() => pickExamType(x)}
                      style={
                        examType === x
                          ? {
                              borderColor: accent,
                              backgroundColor: paper.cardAlt,
                            }
                          : undefined
                      }
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <View style={{ gap: 6 }}>
              <Text style={[paperType.label, { color: paper.inkMuted }]}>
                {t("exam.level")}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {examLevels(examType).map((lv) => (
                  <QuietPill
                    key={lv}
                    title={lv}
                    onPress={() => {
                      tap()
                      setExamLevel(lv)
                    }}
                    style={
                      examLevel === lv
                        ? {
                            borderColor: accent,
                            backgroundColor: paper.cardAlt,
                          }
                        : undefined
                    }
                  />
                ))}
              </View>
            </View>

            <LiftedFace
              title={
                startM.isPending
                  ? t("exam.preparing")
                  : `${t("exam.beginNew")} · ${examDisplayName(examType)} ${examLevel}`
              }
              onPress={() => startM.mutate()}
              disabled={startM.isPending}
              face={accent}
              style={{ marginTop: 2 }}
            />
          </View>
        </PaperCard>

        <PressableScale onPress={() => router.push("/exam-adaptive")}>
          <PaperCard tone="challenge" padded>
            <View style={{ gap: 4 }}>
              <Text
                style={[
                  paperType.tag,
                  {
                    color: paper.surface.challenge.border,
                    alignSelf: "flex-start",
                  },
                ]}
              >
                {t("adapt.kicker").toUpperCase()}
              </Text>
              <Text style={[paperType.cardTitle, { color: paper.ink }]}>
                {t("adapt.title")}
              </Text>
              <Text style={[paperType.cardBody, { color: paper.inkSoft }]}>
                {t("adapt.intro")}
              </Text>
            </View>
          </PaperCard>
        </PressableScale>

        {progressList.length > 0 ? (
          <View style={{ gap: 10 }}>
            <Text style={[paperType.label, { color: paper.inkMuted }]}>
              {t("exam.standing")}
            </Text>
            <PaperCard padded>
              {progressList.map((p: ExamProgress, i: number) => (
                <View
                  key={p.exam_type}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 12,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: paper.lineSoft,
                  }}
                >
                  <View style={{ flex: 1, gap: 1 }}>
                    <Text style={[paperType.cardTitleSm, { color: paper.ink }]}>
                      {examDisplayName(p.exam_type)}
                    </Text>
                    <Text
                      style={[paperType.statLabel, { color: paper.inkMuted }]}
                    >
                      {t("exam.level")} {p.current_level ?? "—"} ·{" "}
                      {p.total_attempts} {t("exam.attempts")}
                    </Text>
                  </View>
                  <Text
                    style={[
                      paperType.statValue,
                      { color: paper.green, fontSize: 24, lineHeight: 28 },
                    ]}
                  >
                    {p.highest_score}
                  </Text>
                </View>
              ))}
            </PaperCard>
          </View>
        ) : null}

        <View style={{ gap: 10 }}>
          <Text style={[paperType.label, { color: paper.inkMuted }]}>
            {t("exam.past")}
          </Text>
          {historyQ.isLoading ? (
            <ActivityIndicator color={paper.green} />
          ) : history.length === 0 ? (
            <EmptyState
              title={t("exam.noSittings")}
              message={t("exam.firstExam")}
              glyph="◷"
            />
          ) : (
            <PaperCard padded>
              {history.map((r, i) => {
                const passed = r.score >= r.passing_score
                return (
                  <View
                    key={r.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      paddingVertical: 11,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: paper.lineSoft,
                    }}
                  >
                    <Text
                      style={[
                        paperType.statValue,
                        {
                          color: passed ? paper.green : paper.ink,
                          width: 52,
                          fontSize: 22,
                          lineHeight: 26,
                        },
                      ]}
                    >
                      {r.score}
                    </Text>
                    <View style={{ flex: 1, gap: 1 }}>
                      <Text
                        style={[
                          paperType.cardBody,
                          {
                            color: paper.ink,
                            fontFamily: families.nunitoExtraBold,
                          },
                        ]}
                      >
                        {examDisplayName(r.exam_type)} · {t("exam.level")}{" "}
                        {r.exam_level}
                      </Text>
                      <Text
                        style={[paperType.statLabel, { color: paper.inkMuted }]}
                      >
                        {new Date(r.created_at).toLocaleDateString()} ·{" "}
                        {r.correct_answers}/{r.total_questions}{" "}
                        {t("exam.correct")}
                      </Text>
                    </View>
                    <Text
                      style={[
                        paperType.statLabel,
                        { color: passed ? paper.green : paper.inkMuted },
                      ]}
                    >
                      {passed ? t("exam.pass") : "—"}
                    </Text>
                  </View>
                )
              })}
            </PaperCard>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

/**
 * The one unfinished thing on the page. Inked in the accent and set on a tinted
 * card so it reads as *open* rather than as another card in a list — the resume
 * action is the whole card, so a 20px circle is not the tap target.
 */
function ActiveSessionCard({
  session,
  onResume,
}: {
  session: ExamSession
  onResume: () => void
}) {
  const { paper } = useTheme()
  const t = useT()
  return (
    <PressableScale onPress={onResume}>
      <PaperCard
        tone="plain"
        style={{ borderColor: paper.green, borderWidth: 1.5 }}
      >
        <View style={{ gap: 6 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={[paperType.label, { color: paper.inkMuted }]}>
              {t("exam.resume")}
            </Text>
            <View
              style={{
                backgroundColor: paper.greenSoft,
                borderRadius: paper.radius.tag,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Text style={[paperType.tag, { color: paper.greenDark }]}>
                {t("exam.active").toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={[paperType.cardTitle, { color: paper.ink }]}>
            {examDisplayName(session.exam_type)} · {t("exam.level")}{" "}
            {session.exam_level}
          </Text>
          <View style={{ flexDirection: "row", gap: 18 }}>
            <PaperStat
              value={`${session.current_question_index + 1}`}
              label={t("exam.question")}
            />
            <PaperStat
              value={`${session.question_count}`}
              label={t("exam.total")}
            />
          </View>
        </View>
      </PaperCard>
    </PressableScale>
  )
}
