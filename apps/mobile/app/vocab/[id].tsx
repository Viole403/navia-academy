import { useMemo } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/Button"
import { EmptyState } from "@/components/ui/EmptyState"
import { StudyCard } from "@/components/study/StudyCard"
import { LiftedButton } from "@/components/study/LiftedButton"
import { CONTENT_MAX, spacing } from "@/components/study/tokens"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
import { progress } from "@/api/endpoints"
import { findWord } from "@/lib/content-data"
import { headword, reading } from "@/lib/languages"
import { useT } from "@/i18n"
import { useAuthStore } from "@/store/auth"
import { useTts } from "@/hooks/useTts"
import type { VocabWord } from "@/types/api"

/**
 * /vocab/[id] — vocab detail.
 * The backend doesn't expose a single-word endpoint, so we pull the word
 * from a query across all visible vocabulary. Cached client-side.
 */
export default function VocabDetail() {
  const { theme } = useTheme()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const qc = useQueryClient()
  const t = useT()
  const tts = useTts()
  const user = useAuthStore((s) => s.user)

  // Look up the word by scanning the vocabulary bundles from CDN (cross-language).
  const wordQ = useQuery({
    queryKey: ["vocab-word", id],
    queryFn: async () => (await findWord(id as string)).word,
    enabled: !!id,
    staleTime: 60_000,
  })

  const progressQ = useQuery({
    queryKey: ["progress"],
    queryFn: progress.get,
    enabled: !!user,
  })

  const isSaved = useMemo(
    () => (progressQ.data?.saved_word_ids ?? []).includes(id ?? ""),
    [progressQ.data, id]
  )

  const toggleSaveM = useMutation({
    mutationFn: async () => {
      const current = progressQ.data?.saved_word_ids ?? []
      const next = isSaved
        ? current.filter((w) => w !== id)
        : [...current, id as string]
      return progress.update({ saved_word_ids: next })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["progress"] }),
  })

  const addToSrsM = useMutation({
    mutationFn: () => progress.ensureCard(id as string, "word"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["due-cards"] })
      qc.invalidateQueries({ queryKey: ["srs-stats"] })
    },
  })

  const w = wordQ.data
  const example =
    (w as { exampleSentence?: string; exampleTranslation?: string }) ?? {}

  const goBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace("/vocab")
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Top bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
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
        {w && (
          <Pressable
            onPress={() => toggleSaveM.mutate()}
            disabled={toggleSaveM.isPending}
          >
            <Text
              style={{
                color: isSaved ? theme.accent : theme.textMuted,
                letterSpacing: 1.5,
                fontWeight: "700",
                fontSize: 11,
              }}
            >
              {isSaved ? t("vocab.saved") : t("vocab.save")}
            </Text>
          </Pressable>
        )}
      </View>

      {wordQ.isLoading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator color={theme.accent} size="large" />
        </View>
      ) : !w ? (
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
            title={t("vocab.notFound")}
            message={t("vocab.notInDict")}
            glyph="？"
          />
          <Button title={t("vocab.goBack")} onPress={goBack} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: spacing.screen,
            paddingBottom: 48,
            alignItems: "center",
          }}
        >
          <View
            style={{ width: "100%", maxWidth: CONTENT_MAX, gap: spacing.lg }}
          >
            {/* Headword masthead */}
            <StudyCard tone="word">
              <View style={{ gap: 8, alignItems: "center", paddingTop: 8 }}>
                <Text
                  style={{
                    fontFamily: fonts.serif,
                    fontSize: 110,
                    lineHeight: 126,
                    color: theme.text,
                    fontWeight: "500",
                    textAlign: "center",
                  }}
                >
                  {headword(w)}
                </Text>
                <Text
                  style={[
                    type.label,
                    { color: theme.accent, letterSpacing: 2 },
                  ]}
                >
                  {reading(w) ?? ""}
                </Text>
                {w.traditional && (
                  <Text style={[type.caption, { color: theme.textMuted }]}>
                    {t("vocab.traditional")} · {w.traditional}
                  </Text>
                )}
                <Text
                  style={{
                    fontFamily: fonts.serif,
                    fontStyle: "italic",
                    fontSize: 22,
                    color: theme.text,
                    textAlign: "center",
                    marginTop: 8,
                  }}
                >
                  {(w as { translation?: string }).translation ?? ""}
                </Text>
              </View>
            </StudyCard>

            <View style={{ height: 1, backgroundColor: theme.border }} />

            {/* Tags / exam mappings */}
            {w.examMappings && Object.keys(w.examMappings).length > 0 && (
              <StudyCard tone="neutral" title={t("vocab.includedIn")}>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {Object.entries(w.examMappings)
                    .filter(([k]) => k !== "metadata")
                    .map(([exam, level]) => (
                      <View
                        key={`${exam}-${String(level)}`}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderWidth: 1,
                          borderColor: theme.border,
                          borderRadius: 999,
                        }}
                      >
                        <Text
                          style={{
                            color: theme.textMuted,
                            fontSize: 11,
                            letterSpacing: 0.5,
                            fontWeight: "600",
                          }}
                        >
                          {exam.toUpperCase()} {String(level).toUpperCase()}
                        </Text>
                      </View>
                    ))}
                </View>
              </StudyCard>
            )}

            {/* Example */}
            {(example.exampleSentence || example.exampleTranslation) && (
              <StudyCard tone="neutral" title={t("vocab.inContext")}>
                <View style={{ gap: 10 }}>
                  {example.exampleSentence && (
                    <Text
                      style={{
                        fontFamily: fonts.serif,
                        fontSize: 22,
                        lineHeight: 32,
                        color: theme.text,
                      }}
                    >
                      {example.exampleSentence}
                    </Text>
                  )}
                  {example.exampleTranslation && (
                    <Text style={[type.bodySm, { color: theme.textMuted }]}>
                      {example.exampleTranslation}
                    </Text>
                  )}
                </View>
              </StudyCard>
            )}

            {/* Actions */}
            <View style={{ gap: spacing.sm, marginTop: 8 }}>
              <LiftedButton
                title={
                  tts.loading || tts.playing
                    ? t("vocab.playing")
                    : t("vocab.listen")
                }
                face={theme.accent2}
                onPress={() => tts.play(headword(w))}
              />
              <LiftedButton
                title={
                  addToSrsM.isPending ? t("vocab.adding") : t("vocab.addReview")
                }
                face={theme.green}
                onPress={() => addToSrsM.mutate()}
              />
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
