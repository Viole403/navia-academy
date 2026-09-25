import { Pressable, ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { EmptyState } from "@/components/ui/EmptyState"
import { PaperCard, LiftedFace, PaperStat } from "@/components/study/PaperCard"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentFaces } from "@/hooks/useContentFaces"
import { useContentLayout } from "@/theme/layout"
import { type } from "@/theme/typography"
import { examBadgeColor, examDisplayName } from "@/lib/languages"
import { useT } from "@/i18n"
import { useOnboardingStore } from "@/store/onboarding"
import { Celebration } from "@/components/study/Celebration"
import { tap } from "@/utils/feedback"

type P = {
  // Provided by the exam-session submit redirect
  total?: string
  correct?: string
  score?: string
  passing?: string
  time?: string
  examType?: string
  examLevel?: string
}

/**
 * Exam results.
 *
 * The score is the only thing on this page, so it is set at 84pt in the reading
 * face with nothing competing for it, and the pass/fail word sits on the same
 * baseline beside it rather than in a coloured band underneath — the number and
 * its verdict have to be read as one thing.
 *
 * A **failed** exam is not dressed as a failure. The screen is the same shape
 * either way, the retry copy is one line, and the celebration only fires on a
 * pass. Making the failure state visually punitive is how a product teaches
 * someone to close the app.
 *
 * The level is spelled out rather than shown as a bare code. `HSK · B1` means
 * nothing to someone who does not already know the exam; "HSK · Level B1" at
 * least tells them what they were looking at.
 */
export default function ExamResultScreen() {
  const { theme, paper } = useTheme()
  const faces = useContentFaces()
  const { column } = useContentLayout()
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
      <SafeAreaView style={{ flex: 1, backgroundColor: paper.paper }}>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            gap: 18,
          }}
        >
          <EmptyState
            title={t("xres.noResult")}
            message={t("xres.noResultMsg")}
            glyph="？"
          />
          <LiftedFace
            title={t("xres.backToExams")}
            face={theme.accent}
            onPress={() => router.replace("/(tabs)/exam")}
          />
        </View>
      </SafeAreaView>
    )
  }

  const mm = Math.floor(timeTaken / 60)
  const ss = String(timeTaken % 60).padStart(2, "0")
  const tint = passed ? theme.accent : theme.textMuted
  const mark = examBadgeColor(p.examType ?? "") ?? theme.accent

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: paper.paper }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: "center" }}>
        <View
          style={{
            width: column,
            padding: 20,
            gap: 26,
            flexGrow: 1,
          }}
        >
          {passed ? <Celebration visible /> : null}

          {/* Masthead */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={[type.labelSm, { color: mark, letterSpacing: 1.2 }]}>
                {p.examType
                  ? `${examDisplayName(p.examType)} · ${t("xres.levelWord")} ${p.examLevel ?? "—"}`
                  : t("xres.examDefault")}
              </Text>
              <Text style={[type.display, { color: theme.text, fontSize: 34 }]}>
                {passed ? t("xres.passedTitle") : t("xres.closedTitle")}
              </Text>
            </View>
            {/* the content face, so 你 / あ / Ä each draw in their own script */}
            <Text
              style={{
                fontFamily: faces.display,
                fontSize: 44,
                color: theme.accent,
                opacity: 0.5,
              }}
            >
              {language === "zh" ? "榜" : language === "ja" ? "録" : "✦"}
            </Text>
          </View>

          {/* Score */}
          <PaperCard>
            <View style={{ gap: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    fontFamily: faces.display,
                    fontSize: 80,
                    lineHeight: 88,
                    color: tint,
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

              {/* The bar is the score out of 100; the pass line is marked on it,
                  because "38" and "40 to pass" are only comparable together. */}
              <View style={{ gap: 6 }}>
                <View
                  style={{
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.border,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      width: `${Math.max(0, Math.min(100, score))}%`,
                      height: "100%",
                      backgroundColor: passed ? theme.green : theme.red,
                    }}
                  />
                </View>
                <View
                  style={{ flexDirection: "row", justifyContent: "flex-end" }}
                >
                  <Text style={[type.caption, { color: theme.textDim }]}>
                    {t("xres.passing")} {passing}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                  paddingTop: 14,
                  gap: 12,
                }}
              >
                <PaperStat
                  label={t("xres.correct")}
                  value={`${correct}/${total}`}
                />
                <PaperStat label={t("xres.time")} value={`${mm}:${ss}`} />
              </View>
            </View>
          </PaperCard>

          {!passed ? (
            <PaperCard tone="plain">
              <Text
                style={[
                  type.bodySm,
                  { color: theme.textMuted, lineHeight: 21 },
                ]}
              >
                {t("xres.retryHint", { count: String(total - correct) })}
              </Text>
            </PaperCard>
          ) : null}

          <View style={{ gap: 12, marginTop: "auto" }}>
            <LiftedFace
              title={t("xres.backToExams")}
              face={theme.accent}
              onPress={() => {
                tap()
                router.replace("/(tabs)/exam")
              }}
            />
            <Pressable
              onPress={() => {
                tap()
                router.replace("/(tabs)")
              }}
            >
              <Text
                style={[
                  type.bodySm,
                  {
                    color: theme.textMuted,
                    textAlign: "center",
                    paddingVertical: 10,
                  },
                ]}
              >
                {t("xres.returnHome")}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
