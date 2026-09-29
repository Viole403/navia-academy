import { useEffect, useRef, useState } from "react"
import { ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { transcriptSimilarity } from "@navia/utils"
import { LiftedFace, PaperCard, QuietPill } from "@/components/study/PaperCard"
import { QueuedNote } from "@/components/study/QueuedNote"
import { Motif } from "@/components/ui/Motif"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentLayout } from "@/theme/layout"
import { paperType } from "@/theme/paperType"
import { motifChar } from "@/lib/languages"
import {
  ensureMicPermission,
  startSTT,
  sttModulePresent,
  sttSupported,
} from "@/lib/stt"
import { useOnboardingStore } from "@/store/onboarding"
import { useT } from "@/i18n"
import { STUDY_DIRTY_KEYS, logStudyWithQueue } from "@/utils/offlineQueue"
import { speakingPrompts } from "@/lib/prompts"

type Verdict = "fluent" | "rough"

export default function SpeakingScreen() {
  const { paper } = useTheme()
  const { column } = useContentLayout()
  const t = useT()
  const qc = useQueryClient()
  const language = useOnboardingStore((s) => s.language)
  const prompts = speakingPrompts(language)

  const [promptIdx, setPromptIdx] = useState(0)
  const [said, setSaid] = useState(false)
  const [grade, setGrade] = useState<Verdict | null>(null)
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState("")
  const [micError, setMicError] = useState<string | null>(null)

  // A handle outlives the render that created it, so the stop button and the
  // unmount cleanup reach the same recogniser.
  const recRef = useRef<{ stop: () => void; abort: () => void } | null>(null)
  const canListen = sttSupported()
  const prompt = prompts[promptIdx]
  const score = heard ? transcriptSimilarity(heard, prompt, language) : null

  useEffect(() => {
    return () => recRef.current?.abort()
  }, [])

  // Changing prompt invalidates anything heard against the old one.
  useEffect(() => {
    setHeard("")
    setMicError(null)
  }, [promptIdx])

  const stopListening = () => {
    recRef.current?.stop()
    recRef.current = null
    setListening(false)
  }

  const listen = async () => {
    setMicError(null)
    if (!(await ensureMicPermission())) {
      setMicError(t("speak.micDenied"))
      return
    }
    const rec = startSTT(
      language,
      (final) => {
        setHeard(final)
        // A final result is the end of this utterance; leaving the recogniser
        // running would keep the microphone open after the learner is done.
        stopListening()
        setSaid(true)
      },
      (interim) => setHeard(interim),
      (message) => {
        setMicError(message)
        setListening(false)
      },
      () => setListening(false)
    )
    if (!rec) {
      setMicError(t("speak.unavailable"))
      return
    }
    recRef.current = rec
    setHeard("")
    setListening(true)
  }

  const finishM = useMutation({
    mutationFn: (g: Verdict) => logStudyWithQueue(5, g === "fluent" ? 40 : 20),
    onSuccess: () =>
      STUDY_DIRTY_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  })

  const next = () => {
    setPromptIdx((i) => (i + 1) % prompts.length)
    setSaid(false)
    setGrade(null)
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: paper.paper }}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 48,
          gap: 22,
          maxWidth: column,
          width: "100%",
          alignSelf: "center",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={[paperType.label, { color: paper.inkMuted }]}>
              {t("speak.kicker")}
            </Text>
            <Text
              style={[
                paperType.greeting,
                { color: paper.ink, fontSize: 30, lineHeight: 34 },
              ]}
            >
              {t("speak.title")}
            </Text>
          </View>
          <Motif char={motifChar(language)} size={56} />
        </View>

        <View style={{ height: 1, backgroundColor: paper.line }} />

        <PaperCard tone="word">
          <Text style={[paperType.label, { color: paper.green }]}>
            {t("speak.prompt")} {promptIdx + 1} {t("speak.of")} {prompts.length}
          </Text>
          <Text
            style={[
              paperType.cardTitle,
              { color: paper.ink, fontSize: 22, lineHeight: 30 },
            ]}
          >
            {prompts[promptIdx]}
          </Text>
          <Text style={[paperType.note, { color: paper.inkMuted }]}>
            {t("speak.note")}
          </Text>
        </PaperCard>

        {canListen ? (
          <View style={{ gap: 10 }}>
            {listening ? (
              <LiftedFace
                title={t("speak.stop")}
                face={paper.ink}
                textColor={paper.paper}
                onPress={stopListening}
              />
            ) : (
              <LiftedFace
                title={t("speak.record")}
                face={paper.green}
                onPress={listen}
              />
            )}
            {micError && (
              <Text style={[paperType.note, { color: paper.inkMuted }]}>
                {micError}
              </Text>
            )}
            {heard.length > 0 && (
              <PaperCard tone="plain">
                <Text
                  style={[
                    paperType.label,
                    { color: paper.inkMuted, fontSize: 11 },
                  ]}
                >
                  {listening ? t("speak.listening") : t("speak.heard")}
                </Text>
                <Text
                  style={[
                    paperType.cardTitle,
                    { color: paper.ink, fontSize: 18, lineHeight: 26 },
                  ]}
                >
                  {heard}
                </Text>
                {score !== null && !listening && (
                  <>
                    <Text style={[paperType.note, { color: paper.inkMuted }]}>
                      {t("speak.similarity")} — {Math.round(score * 100)}%
                    </Text>
                    <Text
                      style={[
                        paperType.note,
                        { color: score >= 0.8 ? paper.green : paper.inkMuted },
                      ]}
                    >
                      {score >= 0.8 ? t("speak.match") : t("speak.partial")}
                    </Text>
                  </>
                )}
              </PaperCard>
            )}
          </View>
        ) : !sttModulePresent() ? (
          // Shown rather than hidden. A missing button is indistinguishable from
          // a feature that was never built, and the learner is left guessing
          // whether the app is broken or the phone is.
          <Text style={[paperType.note, { color: paper.inkMuted }]}>
            {t("speak.unavailable")}
          </Text>
        ) : null}

        <LiftedFace
          title={said ? t("speak.saidIt") : t("speak.iSaidIt")}
          face={said ? paper.ink : paper.green}
          textColor={paper.paper}
          onPress={() => setSaid(true)}
        />

        {said && (
          <View style={{ gap: 12 }}>
            <Text style={[paperType.label, { color: paper.inkMuted }]}>
              {t("speak.howSound")}
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(
                [
                  ["fluent", t("speak.fluent")],
                  ["rough", t("speak.rough")],
                ] as [Verdict, string][]
              ).map(([value, label]) => (
                <QuietPill
                  key={value}
                  title={label}
                  onPress={() => setGrade(value)}
                  tone={grade === value ? "challenge" : "plain"}
                />
              ))}
            </View>
            <LiftedFace
              title={t("speak.log")}
              face={paper.green}
              disabled={!grade || finishM.isPending}
              onPress={() => grade && finishM.mutate(grade)}
            />
            <QueuedNote show={finishM.isSuccess && !!finishM.data?.offline} />
            {finishM.isSuccess && (
              <LiftedFace
                title={t("speak.next")}
                face={paper.ink}
                textColor={paper.paper}
                onPress={next}
              />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
