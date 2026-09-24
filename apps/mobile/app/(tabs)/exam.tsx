import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Chip } from "@/components/ui/Chip"
import { EmptyState } from "@/components/ui/EmptyState"
import { Motif } from "@/components/ui/Motif"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
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
import type { ExamProgress, ExamSession } from "@/types/api"

export default function ExamTab() {
  const { theme } = useTheme()
  const t = useT()
  const router = useRouter()
  const qc = useQueryClient()
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

  const pickExamType = (t: string) => {
    setExamType(t)
    setExamLevel(examLevels(t)[0])
    setStoredExamType(t)
    settings.update({ active_exam_type: t }).then(() => {
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
  const recommendedQ = useQuery({
    queryKey: ["exam-recommended"],
    queryFn: exam.recommended,
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
  const history = historyQ.data ?? []

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={{ padding: 24, gap: 28, paddingBottom: 48 }}
      >
        {/* Masthead */}
        <View style={{ gap: 12 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={[type.labelSm, { color: theme.textMuted }]}>
                {t("exam.kicker")}
              </Text>
              <Text style={[type.display, { color: theme.text, fontSize: 36 }]}>
                {t("exam.title")}
              </Text>
            </View>
            <Motif char={motifChar(language)} size={56} />
          </View>
          <View style={{ height: 1, backgroundColor: theme.border }} />
        </View>

        {/* Active sessions first */}
        {active.length > 0 && (
          <View style={{ gap: 12 }}>
            <Text style={[type.labelSm, { color: theme.textMuted }]}>
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
        )}

        {/* Start a new exam */}
        <View style={{ gap: 16 }}>
          <Text style={[type.labelSm, { color: theme.textMuted }]}>
            {t("exam.beginNew")}
          </Text>
          <Card>
            <View style={{ gap: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor:
                      (examBadgeColor(examType) ?? theme.accent) + "1F",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: examBadgeColor(examType) ?? theme.accent,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[type.h3, { color: theme.text }]}>
                    {examDisplayName(examType)}
                  </Text>
                  <Text style={[type.caption, { color: theme.textMuted }]}>
                    {examLevels(examType).length} levels · {info.nativeName}
                  </Text>
                </View>
              </View>
              {examTypes.length > 1 && (
                <View style={{ gap: 8 }}>
                  <Text style={[type.labelSm, { color: theme.textMuted }]}>
                    {t("exam.track")}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {examTypes.map((t) => (
                      <Chip
                        key={t}
                        label={examDisplayName(t)}
                        selected={examType === t}
                        tint={examBadgeColor(t)}
                        onPress={() => pickExamType(t)}
                      />
                    ))}
                  </ScrollView>
                </View>
              )}
              <View style={{ gap: 8 }}>
                <Text style={[type.labelSm, { color: theme.textMuted }]}>
                  {t("exam.level")}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {examLevels(examType).map((lv) => (
                    <Chip
                      key={lv}
                      label={lv}
                      selected={examLevel === lv}
                      onPress={() => setExamLevel(lv)}
                    />
                  ))}
                </View>
              </View>
              <Button
                title={
                  startM.isPending
                    ? t("exam.preparing")
                    : `Start ${examDisplayName(examType)} ${examLevel}`
                }
                onPress={() => startM.mutate()}
                disabled={startM.isPending}
                loading={startM.isPending}
              />
            </View>
          </Card>
        </View>

        {/* Progress per exam */}
        {progressList.length > 0 && (
          <View style={{ gap: 12 }}>
            <Text style={[type.labelSm, { color: theme.textMuted }]}>
              {t("exam.standing")}
            </Text>
            <View style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
              {progressList.map((p: ExamProgress, i: number) => (
                <View
                  key={p.exam_type}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 14,
                    borderBottomWidth: i === progressList.length - 1 ? 1 : 0,
                    borderBottomColor: theme.border,
                    justifyContent: "space-between",
                  }}
                >
                  <View>
                    <Text style={[type.h3, { color: theme.text }]}>
                      {examDisplayName(p.exam_type)}
                    </Text>
                    <Text style={[type.caption, { color: theme.textMuted }]}>
                      Level {p.current_level ?? "—"} · {p.total_attempts}{" "}
                      {t("exam.attempts")}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: fonts.serif,
                      fontSize: 28,
                      color: theme.accent,
                    }}
                  >
                    {p.highest_score}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* History */}
        <View style={{ gap: 12 }}>
          <Text style={[type.labelSm, { color: theme.textMuted }]}>
            {t("exam.past")}
          </Text>
          {historyQ.isLoading ? (
            <ActivityIndicator color={theme.accent} />
          ) : history.length === 0 ? (
            <EmptyState
              title={t("exam.noSittings")}
              message={t("exam.firstExam")}
              glyph="◷"
            />
          ) : (
            <View style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
              {history.slice(0, 10).map((r, i) => (
                <View
                  key={r.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 12,
                    borderBottomWidth:
                      i === history.slice(0, 10).length - 1 ? 1 : 0,
                    borderBottomColor: theme.border,
                    gap: 12,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.serif,
                      fontSize: 22,
                      color:
                        r.score >= r.passing_score ? theme.green : theme.red,
                      width: 56,
                    }}
                  >
                    {r.score}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        type.bodySm,
                        { color: theme.text, fontWeight: "600" },
                      ]}
                    >
                      {examDisplayName(r.exam_type)} · Level {r.exam_level}
                    </Text>
                    <Text style={[type.caption, { color: theme.textMuted }]}>
                      {new Date(r.created_at).toLocaleDateString()} ·{" "}
                      {r.correct_answers}/{r.total_questions}{" "}
                      {t("exam.correct")}
                    </Text>
                  </View>
                  <Text
                    style={[
                      type.labelSm,
                      {
                        color:
                          r.score >= r.passing_score
                            ? theme.green
                            : theme.textMuted,
                      },
                    ]}
                  >
                    {r.score >= r.passing_score ? t("exam.pass") : "—"}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function ActiveSessionCard({
  session,
  onResume,
}: {
  session: ExamSession
  onResume: () => void
}) {
  const { theme } = useTheme()
  const t = useT()
  return (
    <Pressable
      onPress={onResume}
      style={{
        padding: 20,
        borderWidth: 1.5,
        borderColor: theme.accent,
        backgroundColor: theme.accent + "0A",
        borderRadius: 2,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={[type.labelSm, { color: theme.textMuted }]}>
          {t("exam.resume")}
        </Text>
        <Text style={[type.labelSm, { color: theme.accent }]}>
          {t("exam.active")}
        </Text>
      </View>
      <Text style={[type.h2, { color: theme.text }]}>
        {examDisplayName(session.exam_type)} · Level {session.exam_level}
      </Text>
      <Text style={[type.bodySm, { color: theme.textMuted }]}>
        Question {session.current_question_index + 1} of{" "}
        {session.question_count}
      </Text>
    </Pressable>
  )
}
