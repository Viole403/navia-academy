import { Pressable, ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { EmptyState } from "@/components/ui/EmptyState"
import { Motif } from "@/components/ui/Motif"
import { ProgressBar } from "@/components/ui/ProgressBar"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
import { useT } from "@/i18n"
import { motifChar } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"

type P = {
  // Provided by exam-session submit redirect
  total?: string
  correct?: string
  score?: string
  passing?: string
  time?: string
  examType?: string
  examLevel?: string
}

export default function ExamResultScreen() {
  const { theme } = useTheme()
  const t = useT()
  const language = useOnboardingStore((s) => s.language)
  const router = useRouter()
  const p = useLocalSearchParams<P>()

  const total = Number(p.total ?? 0)
  const correct = Number(p.correct ?? 0)
  const score = Number(p.score ?? 0)
  const passing = Number(p.passing ?? 0)
  const timeTaken = Number(p.time ?? 0)
  const ratio = total > 0 ? correct / total : 0
  const passed = score >= passing

  if (!p.total) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            gap: 16,
          }}
        >
          <EmptyState
            title={t("xres.noResult")}
            message={t("xres.noResultMsg")}
            glyph="？"
          />
          <Button
            title={t("xres.backToExams")}
            onPress={() => router.replace("/(tabs)/exam")}
          />
        </View>
      </SafeAreaView>
    )
  }

  const mm = Math.floor(timeTaken / 60)
  const ss = String(timeTaken % 60).padStart(2, "0")

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ padding: 24, gap: 28, flexGrow: 1 }}>
        {/* Masthead */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <View style={{ flex: 1, gap: 10 }}>
            <Text style={[type.labelSm, { color: theme.textMuted }]}>
              {p.examType?.toUpperCase() ?? t("xres.examDefault")} ·{" "}
              {t("xres.levelWord")} {p.examLevel ?? "—"}
            </Text>
            <Text style={[type.display, { color: theme.text, fontSize: 40 }]}>
              {passed ? t("xres.passedTitle") : t("xres.closedTitle")}
            </Text>
          </View>
          <Motif char={motifChar(language)} size={64} />
        </View>
        <View style={{ height: 1, backgroundColor: theme.border }} />

        {/* Score tile */}
        <Card padded={false}>
          <View style={{ padding: 24, gap: 20 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                gap: 8,
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.serif,
                  fontSize: 84,
                  lineHeight: 92,
                  color: passed ? theme.accent : theme.textMuted,
                  fontWeight: "500",
                }}
              >
                {score}
              </Text>
              <Text
                style={[
                  type.labelSm,
                  { color: passed ? theme.green : theme.red },
                ]}
              >
                {passed ? t("xres.pass") : t("xres.retry")}
              </Text>
            </View>

            <ProgressBar
              value={ratio}
              height={3}
              tint={passed ? theme.accent : theme.red}
            />

            <View
              style={{
                flexDirection: "row",
                borderTopWidth: 1,
                borderTopColor: theme.border,
                paddingTop: 16,
              }}
            >
              <Meta label={t("xres.correct")} value={`${correct}/${total}`} />
              <MetaSep color={theme.border} />
              <Meta label={t("xres.passing")} value={String(passing)} />
              <MetaSep color={theme.border} />
              <Meta label={t("xres.time")} value={`${mm}:${ss}`} />
            </View>
          </View>
        </Card>

        <View style={{ gap: 12, marginTop: "auto" }}>
          <Button
            title={t("xres.backToExams")}
            onPress={() => router.replace("/(tabs)/exam")}
            size="lg"
          />
          <Pressable onPress={() => router.replace("/(tabs)")}>
            <Text
              style={{
                color: theme.textMuted,
                textAlign: "center",
                paddingVertical: 12,
                textDecorationLine: "underline",
              }}
            >
              {t("xres.returnHome")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme()
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={[type.labelSm, { color: theme.textMuted }]}>{label}</Text>
      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: 22,
          color: theme.text,
        }}
      >
        {value}
      </Text>
    </View>
  )
}

function MetaSep({ color }: { color: string }) {
  return (
    <View style={{ width: 1, backgroundColor: color, marginHorizontal: 12 }} />
  )
}
