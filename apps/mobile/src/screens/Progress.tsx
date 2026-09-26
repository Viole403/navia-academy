import { ActivityIndicator, ScrollView, Text, View } from "react-native"
import { useQuery } from "@tanstack/react-query"
import { SafeAreaView } from "react-native-safe-area-context"
import { EmptyState } from "@/components/ui/EmptyState"
import { Motif } from "@/components/ui/Motif"
import { LiftedFace, PaperCard, PaperStat } from "@/components/study/PaperCard"
import { WeekStrip } from "@/components/study/WeekStrip"
import { useContentLayout } from "@/theme/layout"
import { useTheme } from "@/theme/ThemeProvider"
import { paperType } from "@/theme/paperType"
import { progress } from "@/api/endpoints"
import { motifChar } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useT } from "@/i18n"

/**
 * Progress — the week strip, the lifetime numbers, and recent sessions.
 *
 * **The two headline numbers are the same kind of thing and sit together on one
 * sheet.** Total XP only ever grows; the best streak is a high-water mark that
 * is also a past tense. They read as a pair because they answer one question —
 * how far have you come — and splitting them across two cards gave each one the
 * weight of a separate story.
 *
 * A failure to load says so. The old screen only asked "loading?" and, failing
 * that, drew a progress page with zeroes in it, which is the one reading a
 * learner cannot tell from having genuinely done nothing.
 */
export function Progress() {
  const { paper } = useTheme()
  const { column: columnWidth } = useContentLayout()
  const t = useT()
  const language = useOnboardingStore((s) => s.language)

  const progressQ = useQuery({ queryKey: ["progress"], queryFn: progress.get })
  const sessionsQ = useQuery({
    queryKey: ["study-sessions"],
    queryFn: () => progress.studySessions(50, 0),
  })

  const sessions = sessionsQ.data ?? []
  const loading = progressQ.isLoading || sessionsQ.isLoading
  const failed = progressQ.isError || sessionsQ.isError

  const masthead = (
    <>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
        }}
      >
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={[paperType.label, { color: paper.inkMuted }]}>
            {t("journey.kicker")}
          </Text>
          <Text
            style={[
              paperType.greeting,
              { color: paper.ink, fontSize: 30, lineHeight: 34 },
            ]}
          >
            {t("journey.title")}
          </Text>
        </View>
        <Motif char={motifChar(language)} size={56} />
      </View>
      <View style={{ height: 1, backgroundColor: paper.line }} />
    </>
  )

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: paper.paper }}
      edges={["top"]}
    >
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
        {masthead}

        {loading ? (
          <PaperCard tone="review" style={{ alignItems: "center" }}>
            <ActivityIndicator color={paper.green} />
          </PaperCard>
        ) : failed ? (
          <View style={{ gap: 16 }}>
            <EmptyState
              title={t("lib.failedTitle")}
              message={t("common.loadFailed")}
              glyph={motifChar(language)}
            />
            <LiftedFace
              title={t("common.retry")}
              face={paper.green}
              onPress={() => {
                progressQ.refetch()
                sessionsQ.refetch()
              }}
            />
          </View>
        ) : (
          <>
            <PaperCard>
              <View style={{ flexDirection: "row", gap: 16 }}>
                <PaperStat
                  value={progressQ.data?.xp ?? 0}
                  label={t("journey.totalXp")}
                  style={{ flex: 1 }}
                />
                <PaperStat
                  value={
                    progressQ.data?.best_streak ?? progressQ.data?.streak ?? 0
                  }
                  label={t("journey.best")}
                  ink={paper.coral}
                  style={{ flex: 1 }}
                />
              </View>
            </PaperCard>

            <View style={{ gap: 10 }}>
              <Text style={[paperType.label, { color: paper.inkMuted }]}>
                {t("journey.weekActivity")}
              </Text>
              <PaperCard>
                <WeekStrip sessions={sessions} />
              </PaperCard>
            </View>

            <View style={{ gap: 10 }}>
              <Text style={[paperType.label, { color: paper.inkMuted }]}>
                {t("journey.recent")}
              </Text>
              {sessions.length === 0 ? (
                <EmptyState
                  title={t("journey.noSessions")}
                  message={t("journey.noSessionsMsg")}
                  glyph={motifChar(language)}
                />
              ) : (
                <PaperCard padded={false}>
                  {sessions.slice(0, 14).map((s, i) => (
                    <View
                      key={s.id}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        paddingVertical: 13,
                        paddingHorizontal: 16,
                        borderTopWidth: i === 0 ? 0 : 1,
                        borderTopColor: paper.lineSoft,
                        gap: 12,
                      }}
                    >
                      <Text style={[paperType.cardBody, { color: paper.ink }]}>
                        {(s.date ?? "").slice(0, 10)}
                      </Text>
                      <Text
                        style={[
                          paperType.statLabel,
                          { color: paper.inkMuted, fontSize: 12.5 },
                        ]}
                      >
                        {s.minutes} {t("journey.minAbbrev")} · {s.xp} XP
                      </Text>
                    </View>
                  ))}
                </PaperCard>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
