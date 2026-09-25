import { ActivityIndicator, Pressable, Text, View } from "react-native"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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
import { progress } from "@/api/endpoints"
import { loadGrammar } from "@/lib/content-data"
import { headword, motifChar, reading } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useT } from "@/i18n"
import { tap } from "@/utils/feedback"

/**
 * /grammar/[id] — grammar detail (web parity: /grammar/[pointId]).
 * DetailShell pattern: pattern header, plain explanation, examples,
 * add-to-review for the SRS deck.
 */
export function GrammarView() {
  const { theme, paper } = useTheme()
  const { column: columnWidth } = useContentLayout()
  const t = useT()
  const router = useRouter()
  const qc = useQueryClient()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const language = useOnboardingStore((s) => s.language)

  const grammarQ = useQuery({
    queryKey: ["library-grammar", language],
    queryFn: () => loadGrammar(language),
  })
  const point = (grammarQ.data ?? []).find((g) => g.id === id)

  const addM = useMutation({
    mutationFn: () => progress.ensureCard(id as string, "grammar"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["due-cards"] })
      qc.invalidateQueries({ queryKey: ["srs-stats"] })
    },
  })

  const goBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace("/library")
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: paper.paper }}>
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
          {grammarQ.isLoading ? (
            <ActivityIndicator color={theme.accent} />
          ) : !point ? (
            <EmptyState
              title={t("vocab.notFound")}
              message={t("lib.nothingMsg")}
              glyph={motifChar(language)}
            />
          ) : (
            <>
              <SectionHeader
                kicker={point.level ?? point.pattern ?? ""}
                title={point.title}
              />
              {!!point.simpleExplanation && (
                <StudyCard tone="word">
                  <Text style={[type.body, { color: theme.text }]}>
                    {point.simpleExplanation}
                  </Text>
                </StudyCard>
              )}
              {(point.examples ?? []).length > 0 && (
                <StudyCard tone="neutral" title={t("gram.examples")}>
                  <View style={{ gap: spacing.md }}>
                    {(point.examples ?? []).map((e, i) => (
                      <View key={i} style={{ gap: 2 }}>
                        <Text
                          style={{
                            fontFamily: fonts.serif,
                            fontSize: 18,
                            lineHeight: 28,
                            color: theme.text,
                          }}
                        >
                          {headword(e)}
                        </Text>
                        {!!reading(e) && (
                          <Text style={[type.caption, { color: theme.accent }]}>
                            {reading(e)}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                </StudyCard>
              )}
              <LiftedButton
                title={t("vocab.addReview")}
                face={theme.green}
                onPress={() => {
                  tap()
                  addM.mutate()
                }}
              />
            </>
          )}
        </View>
      </Screen>
    </SafeAreaView>
  )
}
