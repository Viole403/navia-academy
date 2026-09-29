import { BackLink } from "@/components/ui/BackLink"
import { ActivityIndicator, ScrollView, Text, View } from "react-native"
import { useQuery } from "@tanstack/react-query"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { EmptyState } from "@/components/ui/EmptyState"
import { LiftedFace, PaperCard } from "@/components/study/PaperCard"
import { ReadingAid } from "@/components/study/ReadingAid"
import { PressableScale } from "@/components/study/press"
import { useContentFaces } from "@/hooks/useContentFaces"
import { useContentLayout } from "@/theme/layout"
import { useTheme } from "@/theme/ThemeProvider"
import { paperType, families } from "@/theme/paperType"
import { loadConversations } from "@/lib/content-data"
import { headword, motifChar, reading } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useTts } from "@/hooks/useTts"
import { useT } from "@/i18n"
import { tap } from "@/utils/feedback"

/**
 * /conversation/[id] — dialogue player (web parity:
 * /conversations/[convId]). Turns carry speaker + text + reading + translation,
 * with per-turn replay and a play-the-whole-dialogue.
 *
 * **Every turn is a door.** Tapping anywhere in a line says it, because the line
 * *is* the audio — putting a small play icon in the corner of each meant the
 * thing you wanted to hear was the smallest target on the screen.
 *
 * The text is in the learner's own script, so it is set in the content face; the
 * translation is English, so it is set in the literary serif. Those are two
 * different jobs and one font cannot do both.
 */
export function ConversationView() {
  const { paper } = useTheme()
  const { column: columnWidth } = useContentLayout()
  const faces = useContentFaces()
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
          <BackLink label={t("vocab.back")} fallback="/library" />
        </View>
        <View style={{ height: 1, backgroundColor: paper.line }} />

        {convQ.isLoading ? (
          <PaperCard tone="review" style={{ alignItems: "center" }}>
            <ActivityIndicator color={paper.green} />
          </PaperCard>
        ) : convQ.isError ? (
          <View style={{ gap: 16 }}>
            <EmptyState
              title={t("lib.failedTitle")}
              message={t("common.loadFailed")}
              glyph={motifChar(language)}
            />
            <LiftedFace
              title={t("common.retry")}
              face={paper.green}
              onPress={() => convQ.refetch()}
            />
          </View>
        ) : !conv ? (
          <EmptyState
            title={t("vocab.notFound")}
            message={t("lib.nothingMsg")}
            glyph={motifChar(language)}
          />
        ) : (
          <>
            <View style={{ gap: 8 }}>
              <Text style={[paperType.label, { color: paper.inkMuted }]}>
                {`${conv.level ?? ""}${
                  conv.formality ? ` · ${conv.formality}` : ""
                }`}
              </Text>
              <Text
                style={[
                  paperType.greeting,
                  { color: paper.ink, fontSize: 28, lineHeight: 32 },
                ]}
              >
                {conv.title}
              </Text>
            </View>

            {!!conv.context && (
              <Text style={[paperType.note, { color: paper.inkMuted }]}>
                {conv.context}
              </Text>
            )}

            <LiftedFace
              title={
                tts.playing || tts.loading
                  ? t("vocab.playing")
                  : t("conv.playAll")
              }
              face={paper.green}
              disabled={tts.playing || tts.loading}
              onPress={playAll}
            />

            <PaperCard padded={false}>
              {(conv.turns ?? []).map((x, i) => (
                <PressableScale
                  key={i}
                  onPress={() => {
                    tap()
                    tts.play(headword(x))
                  }}
                  scale={0.995}
                  accessibilityLabel={headword(x)}
                  style={{
                    gap: 4,
                    padding: 16,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: paper.lineSoft,
                    borderLeftWidth: 3,
                    borderLeftColor: paper.green,
                  }}
                >
                  {!!x.speaker && (
                    <Text style={[paperType.label, { color: paper.greenDark }]}>
                      {x.speaker}
                    </Text>
                  )}
                  <Text
                    style={{
                      fontFamily: faces.display,
                      fontSize: 19,
                      lineHeight: 30,
                      color: paper.ink,
                    }}
                  >
                    {headword(x)}
                  </Text>
                  <ReadingAid
                    pinyin={reading(x)}
                    size="label"
                    color={paper.inkMuted}
                  />
                  {!!x.translation && (
                    <Text
                      style={[
                        paperType.proseSm,
                        { color: paper.inkMuted, fontFamily: families.lora },
                      ]}
                    >
                      {x.translation}
                    </Text>
                  )}
                </PressableScale>
              ))}
            </PaperCard>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
