import { useState } from "react"
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
import { exam } from "@/api/endpoints"
import type { ExamProgress, ExamSession } from "@/types/api"

const EXAM_TYPES = ["hsk", "tocfl"]

export default function ExamTab() {
  const { theme } = useTheme()
  const router = useRouter()
  const qc = useQueryClient()
  const [examType, setExamType] = useState("hsk")
  const [examLevel, setExamLevel] = useState("1")

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
                Assessments
              </Text>
              <Text style={[type.display, { color: theme.text, fontSize: 36 }]}>
                Exam hall
              </Text>
            </View>
            <Motif char="考" size={56} />
          </View>
          <View style={{ height: 1, backgroundColor: theme.border }} />
        </View>

        {/* Active sessions first */}
        {active.length > 0 && (
          <View style={{ gap: 12 }}>
            <Text style={[type.labelSm, { color: theme.textMuted }]}>
              In progress
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
            Begin a new exam
          </Text>
          <Card>
            <View style={{ gap: 16 }}>
              <View style={{ gap: 8 }}>
                <Text style={[type.labelSm, { color: theme.textMuted }]}>
                  Body
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {EXAM_TYPES.map((t) => (
                    <Chip
                      key={t}
                      label={t.toUpperCase()}
                      selected={examType === t}
                      onPress={() => setExamType(t)}
                    />
                  ))}
                </ScrollView>
              </View>
              <View style={{ gap: 8 }}>
                <Text style={[type.labelSm, { color: theme.textMuted }]}>
                  Level
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {(examType === "hsk"
                    ? ["1", "2", "3", "4", "5", "6"]
                    : examType === "tocfl"
                      ? ["A1", "A2", "B1", "B2", "C1"]
                      : ["1", "2", "3"]
                  ).map((lv) => (
                    <Chip
                      key={lv}
                      label={lv.toUpperCase()}
                      selected={examLevel === lv}
                      onPress={() => setExamLevel(lv)}
                    />
                  ))}
                </ScrollView>
              </View>
              <Button
                title={
                  startM.isPending
                    ? "Preparing…"
                    : `Start ${examType.toUpperCase()} ${examLevel.toUpperCase()}`
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
              Standing
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
                      {p.exam_type.toUpperCase()}
                    </Text>
                    <Text style={[type.caption, { color: theme.textMuted }]}>
                      Level {p.current_level ?? "—"} · {p.total_attempts}{" "}
                      attempts
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
            Past sittings
          </Text>
          {historyQ.isLoading ? (
            <ActivityIndicator color={theme.accent} />
          ) : history.length === 0 ? (
            <EmptyState
              title="No sittings yet"
              message="Start your first exam above."
              glyph="史"
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
                      {r.exam_type.toUpperCase()} · Level {r.exam_level}
                    </Text>
                    <Text style={[type.caption, { color: theme.textMuted }]}>
                      {new Date(r.created_at).toLocaleDateString()} ·{" "}
                      {r.correct_answers}/{r.total_questions} correct
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
                    {r.score >= r.passing_score ? "PASS" : "—"}
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
          Resume exam
        </Text>
        <Text style={[type.labelSm, { color: theme.accent }]}>Active</Text>
      </View>
      <Text style={[type.h2, { color: theme.text }]}>
        {session.exam_type.toUpperCase()} · Level {session.exam_level}
      </Text>
      <Text style={[type.bodySm, { color: theme.textMuted }]}>
        Question {session.current_question_index + 1} of{" "}
        {session.question_count}
      </Text>
    </Pressable>
  )
}
