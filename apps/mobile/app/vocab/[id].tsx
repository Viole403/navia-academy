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
import { Card } from "@/components/ui/Card"
import { Chip } from "@/components/ui/Chip"
import { EmptyState } from "@/components/ui/EmptyState"
import { Motif } from "@/components/ui/Motif"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
import { progress } from "@/api/endpoints"
import { loadVocabulary } from "@/lib/content-data"
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
  const tts = useTts()
  const user = useAuthStore((s) => s.user)

  // Look up the word by scanning the vocabulary bundle from CDN.
  const wordQ = useQuery({
    queryKey: ["vocab-word", id],
    queryFn: async () => {
      const all = await loadVocabulary()
      return (all.find((w) => w.id === id) ?? null) as VocabWord | null
    },
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
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: theme.textMuted, fontSize: 15 }}>← Back</Text>
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
              {isSaved ? "SAVED" : "SAVE"}
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
            title="Not found"
            message="That word isn't in the dictionary."
            glyph="？"
          />
          <Button title="Go back" onPress={() => router.back()} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 24, gap: 28, paddingBottom: 48 }}
        >
          {/* Hanzi masthead */}
          <View style={{ gap: 8, alignItems: "center", paddingTop: 8 }}>
            <Text
              style={{
                fontFamily: fonts.serif,
                fontSize: 128,
                lineHeight: 144,
                color: theme.text,
                fontWeight: "500",
              }}
            >
              {w.hanzi}
            </Text>
            <Text
              style={[type.label, { color: theme.accent, letterSpacing: 2 }]}
            >
              {(w as { pinyin?: string }).pinyin ?? ""}
            </Text>
            {(w as { traditional?: string }).traditional && (
              <Text style={[type.caption, { color: theme.textMuted }]}>
                Traditional · {(w as { traditional?: string }).traditional}
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

          <View style={{ height: 1, backgroundColor: theme.border }} />

          {/* Tags / exam mappings */}
          {w.examMappings && Object.keys(w.examMappings).length > 0 && (
            <View style={{ gap: 12 }}>
              <Text style={[type.labelSm, { color: theme.textMuted }]}>
                Included in
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
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
            </View>
          )}

          {/* Example */}
          {(example.exampleSentence || example.exampleTranslation) && (
            <Card>
              <View style={{ gap: 10 }}>
                <Text style={[type.labelSm, { color: theme.textMuted }]}>
                  In context
                </Text>
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
            </Card>
          )}

          {/* Actions */}
          <View style={{ gap: 10, marginTop: 8 }}>
            <Button
              title={tts.loading || tts.playing ? "Playing…" : "Listen"}
              variant="secondary"
              onPress={() => tts.play(w.hanzi)}
              disabled={tts.loading}
            />
            <Button
              title={addToSrsM.isPending ? "Adding…" : "Add to review"}
              variant="ghost"
              onPress={() => addToSrsM.mutate()}
              disabled={addToSrsM.isPending}
            />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
