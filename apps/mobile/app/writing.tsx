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
  const { theme } = useTheme()
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
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={["top"]}
    >
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
        <Enter index={0}>
          <View style={{ gap: 4 }}>
            <Text style={[type.labelSm, { color: theme.textMuted }]}>
              Writing
            </Text>
            <Text style={[type.display, { color: theme.text, fontSize: 32 }]}>
              Put it in words
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
              Prompt {promptIdx + 1} of {PROMPTS.length}
            </Text>
            <Text style={[type.h3, { color: theme.text }]}>
              {PROMPTS[promptIdx]}
            </Text>
          </View>
        </Enter>

        <Input
          label="Your text"
          placeholder="Write in your learning language…"
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
                Self-grade: does it answer the prompt?
              </Text>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                <Chip
                  label="On-target"
                  selected={grade === "on-target"}
                  tint={theme.green}
                  onPress={() => setGrade("on-target")}
                />
                <Chip
                  label="Partial"
                  selected={grade === "partial"}
                  tint={theme.gold}
                  onPress={() => setGrade("partial")}
                />
                <Chip
                  label="Off-topic"
                  selected={grade === "off-topic"}
                  tint={theme.red}
                  onPress={() => setGrade("off-topic")}
                />
              </View>
              <Button
                title="Log writing"
                disabled={!grade || finishM.isPending}
                onPress={() => grade && finishM.mutate(grade)}
              />
              {finishM.isSuccess && (
                <Button title="Next prompt" variant="ghost" onPress={next} />
              )}
            </View>
          </Enter>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
