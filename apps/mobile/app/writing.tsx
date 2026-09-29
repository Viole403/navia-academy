import { useState } from "react"
import { ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Input } from "@/components/ui/Input"
import { LiftedFace, PaperCard, QuietPill } from "@/components/study/PaperCard"
import { QueuedNote } from "@/components/study/QueuedNote"
import { Motif } from "@/components/ui/Motif"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentLayout } from "@/theme/layout"
import { paperType } from "@/theme/paperType"
import { useContentFaces } from "@/hooks/useContentFaces"
import { motifChar } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useT } from "@/i18n"
import { STUDY_DIRTY_KEYS, logStudyWithQueue } from "@/utils/offlineQueue"
import { writingPrompts } from "@/lib/prompts"

type Rubric = "on-target" | "partial" | "off-topic"

const RUBRIC_XP: Record<Rubric, number> = {
  "on-target": 60,
  partial: 30,
  "off-topic": 10,
}

export default function WritingScreen() {
  const { paper } = useTheme()
  const { column } = useContentLayout()
  const faces = useContentFaces()
  const t = useT()
  const qc = useQueryClient()
  const language = useOnboardingStore((s) => s.language)
  const prompts = writingPrompts(language)

  const [promptIdx, setPromptIdx] = useState(0)
  const [draft, setDraft] = useState("")
  const [grade, setGrade] = useState<Rubric | null>(null)

  const finishM = useMutation({
    mutationFn: (g: Rubric) => logStudyWithQueue(10, RUBRIC_XP[g]),
    onSuccess: () =>
      STUDY_DIRTY_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  })

  const next = () => {
    setPromptIdx((i) => (i + 1) % prompts.length)
    setDraft("")
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
              {t("write.kicker")}
            </Text>
            <Text
              style={[
                paperType.greeting,
                { color: paper.ink, fontSize: 30, lineHeight: 34 },
              ]}
            >
              {t("write.title")}
            </Text>
          </View>
          <Motif char={motifChar(language)} size={56} />
        </View>

        <View style={{ height: 1, backgroundColor: paper.line }} />

        <PaperCard tone="word">
          <Text style={[paperType.label, { color: paper.green }]}>
            {t("write.prompt")} {promptIdx + 1} {t("write.of")} {prompts.length}
          </Text>
          {/* The prompt is content in the learner's own script, so it must not
              be set in the Latin serif that the interface chrome uses. */}
          <Text
            style={[
              paperType.cardTitle,
              { color: paper.ink, fontSize: 22, lineHeight: 30 },
            ]}
          >
            {prompts[promptIdx]}
          </Text>
        </PaperCard>

        <Input
          label={t("write.answerLabel")}
          placeholder={t("write.answerPh")}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          value={draft}
          onChangeText={setDraft}
        />

        {draft.trim().length > 0 && (
          <View style={{ gap: 12 }}>
            <Text style={[paperType.label, { color: paper.inkMuted }]}>
              {t("write.selfGrade")}
            </Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {(
                [
                  ["on-target", t("write.onTarget")],
                  ["partial", t("write.partial")],
                  ["off-topic", t("write.offTopic")],
                ] as [Rubric, string][]
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
              title={t("write.log")}
              face={paper.green}
              disabled={!grade || finishM.isPending}
              onPress={() => grade && finishM.mutate(grade)}
            />
            <QueuedNote show={finishM.isSuccess && !!finishM.data?.offline} />
            {finishM.isSuccess && (
              <LiftedFace
                title={t("write.next")}
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
