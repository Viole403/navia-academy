import { ActivityIndicator, Pressable, Text, View } from "react-native"
import { useQuery } from "@tanstack/react-query"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { Screen } from "@/components/ui/Screen"
import { EmptyState } from "@/components/ui/EmptyState"
import { StudyCard, SectionHeader } from "@/components/study/StudyCard"
import { LiftedButton } from "@/components/study/LiftedButton"
import { CONTENT_MAX, spacing, studyType } from "@/components/study/tokens"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
import { loadReadings } from "@/lib/content-data"
import { headword, motifChar, reading } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useTts } from "@/hooks/useTts"
import { useT } from "@/i18n"
import { tap } from "@/utils/feedback"

/**
 * /reading/[id] — graded reader (web parity: /reading/[readingId]).
 * Ported from Chinese-Easy `StoryReader` minus segmentation: paragraphs
 * render headword + reading + translation, each replayable, plus a
 * play-the-whole-story narration button.
 */
export function ReadingView() {
  const { theme } = useTheme()
  const t = useT()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const language = useOnboardingStore((s) => s.language)
  const tts = useTts()

  const readingsQ = useQuery({
    queryKey: ["library-readings", language],
    queryFn: () => loadReadings(language),
  })
  const story = (readingsQ.data ?? []).find((r) => r.id === id)

  const goBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace("/library")
  }

  const playAll = () => {
    if (!story) return
    tap()
    const text = (story.paragraphs ?? []).map((p) => headword(p)).join("\n")
    tts.play(text)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <Pressable onPress={goBack}>
          <Text style={{ color: theme.textMuted, fontSize: 15 }}>
            ← {t("vocab.back")}
          </Text>
        </Pressable>
      </View>
      <Screen>
        <View
          style={{
            width: "100%",
            maxWidth: CONTENT_MAX,
            alignSelf: "center",
            gap: spacing.lg,
          }}
        >
          {readingsQ.isLoading ? (
            <ActivityIndicator color={theme.accent} />
          ) : !story ? (
            <EmptyState
              title={t("vocab.notFound")}
              message={t("lib.nothingMsg")}
              glyph={motifChar(language)}
            />
          ) : (
            <>
              <SectionHeader
                kicker={`${story.level ?? ""}${story.wordCount ? ` · ${story.wordCount} ${t("read.words")}` : ""}`}
                title={story.title}
              />
              {!!story.summary && (
                <Text style={[type.bodySm, { color: theme.textMuted }]}>
                  {story.summary}
                </Text>
              )}
              <LiftedButton
                title={
                  tts.playing || tts.loading
                    ? t("vocab.playing")
                    : t("read.playAll")
                }
                face={theme.green}
                onPress={playAll}
              />
              {(story.paragraphs ?? []).map((p, i) => (
                <StudyCard key={i} tone="neutral">
                  <Text
                    style={{
                      fontFamily: fonts.serif,
                      fontSize: 20,
                      lineHeight: 32,
                      color: theme.text,
                    }}
                  >
                    {headword(p)}
                  </Text>
                  {!!reading(p) && (
                    <Text style={[type.caption, { color: theme.accent }]}>
                      {reading(p)}
                    </Text>
                  )}
                  {!!p.translation && (
                    <Text style={[type.bodySm, { color: theme.textMuted }]}>
                      {p.translation}
                    </Text>
                  )}
                  <Pressable
                    onPress={() => {
                      tap()
                      tts.play(headword(p))
                    }}
                    style={{ alignSelf: "flex-start", paddingVertical: 4 }}
                  >
                    <Text
                      style={[
                        studyType.link,
                        {
                          color: theme.textMuted,
                          fontFamily: fonts.sans,
                          fontWeight: "700",
                        },
                      ]}
                    >
                      ▸ {t("read.replay")}
                    </Text>
                  </Pressable>
                </StudyCard>
              ))}
            </>
          )}
        </View>
      </Screen>
    </SafeAreaView>
  )
}
