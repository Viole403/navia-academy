import { useMemo, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/Button"
import { EmptyState } from "@/components/ui/EmptyState"
import { Enter } from "@/components/ui/Enter"
import { ProgressBar } from "@/components/ui/ProgressBar"
import { useTheme } from "@/theme/ThemeProvider"
import { type } from "@/theme/typography"
import { loadVocabulary } from "@/lib/content-data"
import { headword, motifChar } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useTts } from "@/hooks/useTts"
import { useT } from "@/i18n"
import { logStudyWithQueue } from "@/utils/offlineQueue"
import type { VocabWord } from "@/types/api"

const ROUNDS = 10

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function ListeningDrillScreen() {
  const { theme, paper } = useTheme()
  const t = useT()
  const language = useOnboardingStore((s) => s.language)
  const qc = useQueryClient()
  const tts = useTts()

  const [round, setRound] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  const poolQ = useQuery({
    queryKey: ["listening-pool", language],
    queryFn: () => loadVocabulary(language),
  })

  const rounds = useMemo(() => {
    const pool = shuffle(poolQ.data ?? []).slice(0, ROUNDS)
    return pool.map((w) => {
      const distractors = shuffle(
        (poolQ.data ?? []).filter((x) => x.id !== w.id)
      ).slice(0, 3)
      return { word: w, options: shuffle([w, ...distractors]) }
    })
  }, [poolQ.data])

  const current = rounds[round]

  const finishM = useMutation({
    mutationFn: (finalScore: number) =>
      logStudyWithQueue(8, Math.round((finalScore / ROUNDS) * 100)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["progress"] }),
  })

  const pick = (w: VocabWord) => {
    if (picked || !current) return
    setPicked(w.id)
    const correct = w.id === current.word.id
    const next = score + (correct ? 1 : 0)
    if (correct) setScore(next)
    setTimeout(() => {
      if (round + 1 >= rounds.length) {
        setDone(true)
        finishM.mutate(next)
      } else {
        setRound(round + 1)
        setPicked(null)
      }
    }, 900)
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: paper.paper }}
      edges={["top"]}
    >
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
        <Enter index={0}>
          <View style={{ gap: 4 }}>
            <Text style={[type.labelSm, { color: theme.textMuted }]}>
              {t("listen.kicker")}
            </Text>
            <Text style={[type.display, { color: theme.text, fontSize: 32 }]}>
              {t("listen.title")}
            </Text>
          </View>
        </Enter>

        {poolQ.isLoading ? (
          <ActivityIndicator color={theme.accent} />
        ) : rounds.length === 0 ? (
          <EmptyState title={t("listen.noWords")} glyph={motifChar(language)} />
        ) : done ? (
          <Enter index={1}>
            <View style={{ gap: 12, alignItems: "center", paddingTop: 24 }}>
              <Text style={[type.display, { color: theme.text, fontSize: 56 }]}>
                {score}/{rounds.length}
              </Text>
              <Text style={[type.bodySm, { color: theme.textMuted }]}>
                {score === rounds.length
                  ? t("listen.perfect")
                  : score >= rounds.length / 2
                    ? t("listen.good")
                    : t("listen.retry")}
              </Text>
            </View>
          </Enter>
        ) : (
          current && (
            <View style={{ gap: 16 }}>
              <ProgressBar value={round / rounds.length} tint={theme.accent} />
              <Enter index={1} key={`q-${round}`}>
                <View
                  style={{ gap: 12, alignItems: "center", paddingVertical: 12 }}
                >
                  <Text style={[type.labelSm, { color: theme.textMuted }]}>
                    {t("listen.round")} {round + 1} {t("listen.of")}{" "}
                    {rounds.length} · {t("listen.score")} {score}
                  </Text>
                  <Button
                    title={tts.playing ? t("listen.playing") : t("listen.play")}
                    onPress={() => tts.play(headword(current.word))}
                    disabled={tts.loading || tts.playing}
                  />
                  {!!tts.error && (
                    <Text style={[type.caption, { color: theme.red }]}>
                      {tts.error}
                    </Text>
                  )}
                </View>
              </Enter>
              {current.options.map((o, i) => {
                const isAnswer = o.id === current.word.id
                const selected = picked === o.id
                const dim = picked && !isAnswer && !selected
                return (
                  <Enter key={o.id} index={Math.min(i + 2, 6)}>
                    <Pressable
                      onPress={() => pick(o)}
                      disabled={!!picked}
                      style={{
                        padding: 16,
                        borderWidth: 1.5,
                        borderRadius: 4,
                        borderColor: selected
                          ? isAnswer
                            ? theme.green
                            : theme.red
                          : picked && isAnswer
                            ? theme.green
                            : theme.border,
                        backgroundColor: theme.surface,
                        opacity: dim ? 0.5 : 1,
                      }}
                    >
                      <Text style={[type.body, { color: theme.text }]}>
                        {o.translation ?? o.id}
                      </Text>
                    </Pressable>
                  </Enter>
                )
              })}
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
