import { useState } from "react"
import { ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/Button"
import { Chip } from "@/components/ui/Chip"
import { Enter } from "@/components/ui/Enter"
import { Input } from "@/components/ui/Input"
import { useTheme } from "@/theme/ThemeProvider"
import { type } from "@/theme/typography"
import { useT } from "@/i18n"
import { logStudyWithQueue } from "@/utils/offlineQueue"

const PROMPTS = [
  "Write three sentences about your morning routine.",
  "Describe your hometown to someone who has never been there.",
  "Write about a goal you want to reach this year and why.",
  "Describe a meal you cooked or ate recently, step by step.",
  "Write a short message inviting a friend to study together.",
]

type Rubric = "on-target" | "partial" | "off-topic"

export default function WritingScreen() {
  const { theme, paper } = useTheme()
  const t = useT()
  const qc = useQueryClient()

  const [promptIdx, setPromptIdx] = useState(0)
  const [draft, setDraft] = useState("")
  const [grade, setGrade] = useState<Rubric | null>(null)

  const finishM = useMutation({
    mutationFn: (g: Rubric) =>
      logStudyWithQueue(10, g === "on-target" ? 60 : g === "partial" ? 30 : 10),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["progress"] }),
  })

  const next = () => {
    setPromptIdx((i) => (i + 1) % PROMPTS.length)
    setDraft("")
    setGrade(null)
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
              {t("write.kicker")}
            </Text>
            <Text style={[type.display, { color: theme.text, fontSize: 32 }]}>
              {t("write.title")}
            </Text>
          </View>
        </Enter>

        <Enter index={1}>
          <View
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 4,
              backgroundColor: theme.surface,
              padding: 18,
              gap: 8,
            }}
          >
            <Text style={[type.labelSm, { color: theme.accent }]}>
              {t("write.prompt")} {promptIdx + 1} {t("write.of")}{" "}
              {PROMPTS.length}
            </Text>
            <Text style={[type.h3, { color: theme.text }]}>
              {PROMPTS[promptIdx]}
            </Text>
          </View>
        </Enter>

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
          <Enter index={2}>
            <View style={{ gap: 12 }}>
              <Text style={[type.labelSm, { color: theme.textMuted }]}>
                {t("write.selfGrade")}
              </Text>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                <Chip
                  label={t("write.onTarget")}
                  selected={grade === "on-target"}
                  tint={theme.green}
                  onPress={() => setGrade("on-target")}
                />
                <Chip
                  label={t("write.partial")}
                  selected={grade === "partial"}
                  tint={theme.gold}
                  onPress={() => setGrade("partial")}
                />
                <Chip
                  label={t("write.offTopic")}
                  selected={grade === "off-topic"}
                  tint={theme.red}
                  onPress={() => setGrade("off-topic")}
                />
              </View>
              <Button
                title={t("write.log")}
                disabled={!grade || finishM.isPending}
                onPress={() => grade && finishM.mutate(grade)}
              />
              {finishM.isSuccess && (
                <Button
                  title={t("write.next")}
                  variant="ghost"
                  onPress={next}
                />
              )}
            </View>
          </Enter>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
