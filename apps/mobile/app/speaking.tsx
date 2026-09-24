import { useState } from "react"
import { ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/Button"
import { Chip } from "@/components/ui/Chip"
import { Enter } from "@/components/ui/Enter"
import { useTheme } from "@/theme/ThemeProvider"
import { type } from "@/theme/typography"
import { logStudyWithQueue } from "@/utils/offlineQueue"

const PROMPTS = [
  "Describe what you did yesterday in three sentences.",
  "Introduce yourself: name, where you live, what you do.",
  "Describe your favorite food and why you like it.",
  "Talk about your plans for next weekend.",
  "Describe the weather today and what you wear for it.",
]

export default function SpeakingScreen() {
  const { theme } = useTheme()
  const qc = useQueryClient()

  const [promptIdx, setPromptIdx] = useState(0)
  const [said, setSaid] = useState(false)
  const [grade, setGrade] = useState<"fluent" | "rough" | null>(null)

  const finishM = useMutation({
    mutationFn: (g: "fluent" | "rough") =>
      logStudyWithQueue(5, g === "fluent" ? 40 : 20),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["progress"] }),
  })

  const next = () => {
    setPromptIdx((i) => (i + 1) % PROMPTS.length)
    setSaid(false)
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
              Speaking
            </Text>
            <Text style={[type.display, { color: theme.text, fontSize: 32 }]}>
              Say it aloud
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
            <Text style={[type.bodySm, { color: theme.textMuted }]}>
              On-device speech recognition needs a dev build. For now: read the
              prompt aloud, then grade yourself honestly.
            </Text>
          </View>
        </Enter>

        <Button
          title={said ? "Said it" : "I said it aloud"}
          variant={said ? "secondary" : "primary"}
          onPress={() => setSaid(true)}
        />

        {said && (
          <Enter index={2}>
            <View style={{ gap: 12 }}>
              <Text style={[type.labelSm, { color: theme.textMuted }]}>
                How did it sound?
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Chip
                  label="Fluent"
                  selected={grade === "fluent"}
                  tint={theme.green}
                  onPress={() => setGrade("fluent")}
                />
                <Chip
                  label="Rough"
                  selected={grade === "rough"}
                  tint={theme.gold}
                  onPress={() => setGrade("rough")}
                />
              </View>
              <Button
                title="Log practice"
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
