import { ActivityIndicator, Pressable, Text, View } from "react-native"
import { useQuery } from "@tanstack/react-query"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { Screen } from "@/components/ui/Screen"
import { EmptyState } from "@/components/ui/EmptyState"
import { StudyCard, SectionHeader } from "@/components/study/StudyCard"
import { LiftedButton } from "@/components/study/LiftedButton"
import { spacing } from "@/components/study/tokens"
import { useContentLayout } from "@/theme/layout"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
import { loadConversations } from "@/lib/content-data"
import { headword, motifChar, reading } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useTts } from "@/hooks/useTts"
import { useT } from "@/i18n"
import { tap } from "@/utils/feedback"

/**
 * /conversation/[id] — dialogue player (web parity:
 * /conversations/[convId]). Turns carry speaker + text + reading +
 * translation; per-turn replay plus play-the-whole-dialogue.
 */
export function ConversationView() {
  const { theme } = useTheme()
  const { column: columnWidth } = useContentLayout()
  const t = useT()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const language = useOnboardingStore((s) => s.language)
  const tts = useTts()

  const convQ = useQuery({
    queryKey: ["library-conversations", language],
    queryFn: () => loadConversations(language),
  })
  const conv = (convQ.data ?? []).find((c) => c.id === id)

  const goBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace("/library")
  }

  const playAll = () => {
    if (!conv) return
    tap()
    const text = (conv.turns ?? []).map((x) => headword(x)).join("\n")
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
            maxWidth: columnWidth,
            alignSelf: "center",
            gap: spacing.lg,
          }}
        >
          {convQ.isLoading ? (
            <ActivityIndicator color={theme.accent} />
          ) : !conv ? (
            <EmptyState
              title={t("vocab.notFound")}
              message={t("lib.nothingMsg")}
              glyph={motifChar(language)}
            />
          ) : (
            <>
              <SectionHeader
                kicker={`${conv.level ?? ""}${conv.formality ? ` · ${conv.formality}` : ""}`}
                title={conv.title}
              />
              {!!conv.context && (
                <Text style={[type.bodySm, { color: theme.textMuted }]}>
                  {conv.context}
                </Text>
              )}
              <LiftedButton
                title={
                  tts.playing || tts.loading
                    ? t("vocab.playing")
                    : t("conv.playAll")
                }
                face={theme.green}
                onPress={playAll}
              />
              {(conv.turns ?? []).map((x, i) => (
                <Pressable
                  key={i}
                  onPress={() => {
                    tap()
                    tts.play(headword(x))
                  }}
                  style={{
                    gap: 4,
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    borderWidth: 1,
                    borderRadius: 14,
                    padding: spacing.md,
                    borderLeftWidth: 3,
                    borderLeftColor: theme.accent,
                  }}
                >
                  {!!x.speaker && (
                    <Text style={[type.labelSm, { color: theme.accent }]}>
                      {x.speaker}
                    </Text>
                  )}
                  <Text
                    style={{
                      fontFamily: fonts.serif,
                      fontSize: 19,
                      lineHeight: 30,
                      color: theme.text,
                    }}
                  >
                    {headword(x)}
                  </Text>
                  {!!reading(x) && (
                    <Text style={[type.caption, { color: theme.textMuted }]}>
                      {reading(x)}
                    </Text>
                  )}
                  {!!x.translation && (
                    <Text style={[type.bodySm, { color: theme.textMuted }]}>
                      {x.translation}
                    </Text>
                  )}
                </Pressable>
              ))}
            </>
          )}
        </View>
      </Screen>
    </SafeAreaView>
  )
}
