import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/Button"
import { EmptyState } from "@/components/ui/EmptyState"
import { ProgressBar } from "@/components/ui/ProgressBar"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
import { exam } from "@/api/endpoints"
import type { ExamQuestion, ExamSession } from "@/types/api"

export default function ExamSessionScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const params = useLocalSearchParams<{ id?: string }>()
  const sessionId = Number(params.id)
  const qc = useQueryClient()

  const [picked, setPicked] = useState<Record<string, unknown>>({})
  const [elapsed, setElapsed] = useState(0)

  const sessionQ = useQuery({
    queryKey: ["exam-session", sessionId],
    queryFn: () => exam.get(sessionId),
    enabled: Number.isFinite(sessionId) && sessionId > 0,
  })
  const session = sessionQ.data

  const questions = useMemo<ExamQuestion[]>(
    () => (session?.questions ?? []) as ExamQuestion[],
    [session]
  )
  const currentIdx = session?.current_question_index ?? 0
  const current: ExamQuestion | undefined = questions[currentIdx]

  const answerM = useMutation({
    mutationFn: (vars: { qid: string; answer: unknown }) =>
      exam.answer(sessionId, vars.qid, vars.answer),
  })
  const submitM = useMutation({
    mutationFn: () => exam.submit(sessionId),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["exam-active"] })
      qc.invalidateQueries({ queryKey: ["exam-history"] })
      router.replace({
        pathname: "/exam-result" as never,
        params: {
          total: String(result.total_questions ?? 0),
          correct: String(result.correct_answers ?? 0),
          score: String(result.score ?? 0),
          passing: String(result.passing_score ?? 0),
          time: String(result.time_taken ?? 0),
          examType: result.exam_type ?? "",
          examLevel: result.exam_level ?? "",
        } as never,
      })
    },
    onError: (e: unknown) => {
      Alert.alert(
        "Could not submit",
        (e as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? "Try again."
      )
    },
  })

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const pick = (qid: string, option: string) => {
    setPicked((p) => ({ ...p, [qid]: option }))
    answerM.mutate({ qid, answer: option })
  }

  const nextQ = () => {
    if (!session) return
    if (currentIdx + 1 >= questions.length) {
      Alert.alert("Submit exam?", "You cannot undo this.", [
        { text: "Cancel", style: "cancel" },
        { text: "Submit", onPress: () => submitM.mutate() },
      ])
    } else {
      // Optimistically advance: the backend tracks current_question_index;
      // we re-query to move on.
      qc.setQueryData<ExamSession | undefined>(
        ["exam-session", sessionId],
        (old) =>
          old ? { ...old, current_question_index: currentIdx + 1 } : old
      )
    }
  }

  if (sessionQ.isLoading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: theme.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={theme.accent} size="large" />
      </SafeAreaView>
    )
  }

  if (!session || questions.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
          }}
        >
          <EmptyState
            title="Session not found"
            message="It may have ended. Start a new exam."
            glyph="疑"
          />
          <Button title="Go back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    )
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0")
  const ss = String(elapsed % 60).padStart(2, "0")

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Top bar */}
      <View
        style={{
          padding: 16,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <View>
          <Text style={[type.labelSm, { color: theme.textMuted }]}>
            {session.exam_type.toUpperCase()} · Level {session.exam_level}
          </Text>
          <Text
            style={[type.labelSm, { color: theme.textMuted, marginTop: 4 }]}
          >
            Q {currentIdx + 1} of {questions.length}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text
            style={{
              fontFamily: fonts.mono,
              fontSize: 20,
              color: theme.text,
              fontWeight: "600",
            }}
          >
            {mm}:{ss}
          </Text>
          <Pressable
            onPress={() =>
              Alert.alert("Abandon exam?", "Progress will be lost.", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Abandon",
                  style: "destructive",
                  onPress: async () => {
                    await exam.abandon(sessionId)
                    qc.invalidateQueries({ queryKey: ["exam-active"] })
                    router.back()
                  },
                },
              ])
            }
          >
            <Text
              style={{
                color: theme.red,
                fontSize: 12,
                letterSpacing: 0.4,
                marginTop: 4,
              }}
            >
              ABANDON
            </Text>
          </Pressable>
        </View>
      </View>
      <ProgressBar
        value={
          questions.length
            ? (currentIdx + (picked[current?.id ?? ""] ? 1 : 0)) /
              questions.length
            : 0
        }
        height={2}
        tint={theme.accent}
      />

      <ScrollView contentContainerStyle={{ padding: 24, gap: 24, flexGrow: 1 }}>
        {/* Question */}
        {current ? (
          <View style={{ gap: 20 }}>
            <View style={{ gap: 8 }}>
              <Text style={[type.labelSm, { color: theme.textMuted }]}>
                {current.type ?? "Question"}
              </Text>
              <Text style={[type.h3, { color: theme.text }]}>
                {current.prompt}
              </Text>
              {current.prompt_chinese && (
                <Text
                  style={{
                    fontFamily: fonts.serif,
                    fontSize: 26,
                    lineHeight: 36,
                    color: theme.text,
                  }}
                >
                  {current.prompt_chinese}
                </Text>
              )}
            </View>

            {/* Options */}
            <View style={{ gap: 10 }}>
              {(current.options ?? []).map((opt) => {
                const sel = picked[current.id] === opt
                return (
                  <Pressable
                    key={opt}
                    onPress={() => pick(current.id, opt)}
                    style={{
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderRadius: 2,
                      borderWidth: 1.5,
                      borderColor: sel ? theme.accent : theme.border,
                      backgroundColor: sel
                        ? `${theme.accent}0A`
                        : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        color: theme.text,
                        fontSize: 16,
                        fontWeight: sel ? "600" : "400",
                      }}
                    >
                      {opt}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        ) : (
          <EmptyState title="No question at this index" glyph="？" />
        )}
      </ScrollView>

      {/* Bottom nav */}
      <View
        style={{
          padding: 16,
          gap: 10,
          borderTopWidth: 1,
          borderTopColor: theme.border,
        }}
      >
        <Button
          title={
            currentIdx + 1 >= questions.length
              ? submitM.isPending
                ? "Submitting…"
                : "Submit exam"
              : "Next question"
          }
          onPress={nextQ}
          disabled={!current || !picked[current.id] || submitM.isPending}
          loading={submitM.isPending}
          size="lg"
        />
      </View>
    </SafeAreaView>
  )
}
