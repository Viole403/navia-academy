import { ActivityIndicator, ScrollView, Text, View } from "react-native"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { EmptyState } from "@/components/ui/EmptyState"
import { LiftedFace, PaperCard } from "@/components/study/PaperCard"
import { PressableScale } from "@/components/study/press"
import { useContentFaces } from "@/hooks/useContentFaces"
import { useContentLayout } from "@/theme/layout"
import { useTheme } from "@/theme/ThemeProvider"
import { paperType } from "@/theme/paperType"
import { progress } from "@/api/endpoints"
import { loadGrammar } from "@/lib/content-data"
import { headword, motifChar, reading } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useT } from "@/i18n"
import { tap } from "@/utils/feedback"

/**
 * /grammar/[id] — one grammar point (web parity: /grammar/[pointId]).
 *
 * The explanation, the examples, and a way to put the point in front of
 * yourself again later. **The examples are the point of the page** — a grammar
 * point taught without them is a rule, and a rule does not survive contact with
 * a sentence — so they are set in the learner's own script and the reading sits
 * under each in the accent, the way a dictionary would.
 */
export function GrammarView() {
  const { paper } = useTheme()
  const { column: columnWidth } = useContentLayout()
  const faces = useContentFaces()
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
    <SafeAreaView
      style={{ flex: 1, backgroundColor: paper.paper }}
      edges={["top"]}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={{
          width: "100%",
          maxWidth: columnWidth,
          alignSelf: "center",
          padding: 20,
          paddingBottom: 48,
          gap: 22,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <PressableScale onPress={goBack} accessibilityLabel={t("vocab.back")}>
            <Text style={[paperType.link, { color: paper.inkMuted }]}>
              ← {t("vocab.back")}
            </Text>
          </PressableScale>
        </View>
        <View style={{ height: 1, backgroundColor: paper.line }} />

        {grammarQ.isLoading ? (
          <PaperCard tone="review" style={{ alignItems: "center" }}>
            <ActivityIndicator color={paper.green} />
          </PaperCard>
        ) : grammarQ.isError ? (
          <View style={{ gap: 16 }}>
            <EmptyState
              title={t("lib.failedTitle")}
              message={t("common.loadFailed")}
              glyph={motifChar(language)}
            />
            <LiftedFace
              title={t("common.retry")}
              face={paper.green}
              onPress={() => grammarQ.refetch()}
            />
          </View>
        ) : !point ? (
          <EmptyState
            title={t("vocab.notFound")}
            message={t("lib.nothingMsg")}
            glyph={motifChar(language)}
          />
        ) : (
          <>
            <View style={{ gap: 8 }}>
              <Text style={[paperType.label, { color: paper.inkMuted }]}>
                {point.level ?? point.pattern ?? ""}
              </Text>
              <Text
                style={[
                  paperType.greeting,
                  { color: paper.ink, fontSize: 28, lineHeight: 32 },
                ]}
              >
                {point.title}
              </Text>
            </View>

            {!!point.simpleExplanation && (
              <PaperCard tone="word">
                <Text style={[paperType.prose, { color: paper.inkSoft }]}>
                  {point.simpleExplanation}
                </Text>
              </PaperCard>
            )}

            {(point.examples ?? []).length > 0 && (
              <View style={{ gap: 10 }}>
                <Text style={[paperType.label, { color: paper.inkMuted }]}>
                  {t("gram.examples")}
                </Text>
                <PaperCard padded={false}>
                  {(point.examples ?? []).map((e, i) => (
                    <View
                      key={i}
                      style={{
                        gap: 3,
                        padding: 16,
                        borderTopWidth: i === 0 ? 0 : 1,
                        borderTopColor: paper.lineSoft,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: faces.display,
                          fontSize: 20,
                          lineHeight: 30,
                          color: paper.ink,
                        }}
                      >
                        {headword(e)}
                      </Text>
                      {!!reading(e) && (
                        <Text
                          style={[paperType.note, { color: paper.greenDark }]}
                        >
                          {reading(e)}
                        </Text>
                      )}
                    </View>
                  ))}
                </PaperCard>
              </View>
            )}

            <LiftedFace
              title={t("vocab.addReview")}
              face={paper.green}
              onPress={() => {
                tap()
                addM.mutate()
              }}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
