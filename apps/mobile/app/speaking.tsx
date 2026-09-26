import { useState } from "react"
import { ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { LiftedFace, PaperCard, QuietPill } from "@/components/study/PaperCard"
import { QueuedNote } from "@/components/study/QueuedNote"
import { Motif } from "@/components/ui/Motif"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentLayout } from "@/theme/layout"
import { paperType } from "@/theme/paperType"
import { motifChar } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useT } from "@/i18n"
import { logStudyWithQueue } from "@/utils/offlineQueue"
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

  const finishM = useMutation({
    mutationFn: (g: Verdict) => logStudyWithQueue(5, g === "fluent" ? 40 : 20),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["progress"] }),
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
