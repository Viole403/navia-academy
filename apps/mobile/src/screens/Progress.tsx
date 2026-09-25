import { ActivityIndicator, Text, View } from "react-native"
import { useQuery } from "@tanstack/react-query"
import { Screen } from "@/components/ui/Screen"
import { EmptyState } from "@/components/ui/EmptyState"
import { StudyCard, SectionHeader } from "@/components/study/StudyCard"
import { WeekStrip } from "@/components/study/StudyBits"
import { CONTENT_MAX, spacing, studyType } from "@/components/study/tokens"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts } from "@/theme/typography"
import { progress } from "@/api/endpoints"
import { motifChar } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useT } from "@/i18n"

/**
 * Progress — ported from Chinese-Easy `ProgressOverview` + the Dashboard's
 * This-Week card: week strip, lifetime stats, recent sessions.
 * (Web parity: /progress + /calendar.)
 */
export function Progress() {
  const { theme } = useTheme()
  const t = useT()
  const language = useOnboardingStore((s) => s.language)

  const progressQ = useQuery({ queryKey: ["progress"], queryFn: progress.get })
  const sessionsQ = useQuery({
    queryKey: ["study-sessions"],
    queryFn: () => progress.studySessions(50, 0),
  })

  const sessions = sessionsQ.data ?? []
  const loading = progressQ.isLoading || sessionsQ.isLoading

  return (
    <Screen>
      <View
        style={{
          width: "100%",
          maxWidth: CONTENT_MAX,
          alignSelf: "center",
          gap: spacing.lg,
        }}
      >
        <SectionHeader
          kicker={t("journey.kicker")}
          title={t("journey.title")}
        />
        {loading ? (
          <ActivityIndicator color={theme.accent} />
        ) : (
          <>
            <View style={{ flexDirection: "row", gap: spacing.cardGap }}>
              <View style={{ flex: 1 }}>
                <StudyCard tone="week" title={t("journey.totalXp")}>
                  <Text
                    style={[
                      studyType.statValue,
                      {
                        color: theme.green,
                        fontFamily: fonts.sans,
                        fontWeight: "800",
                      },
                    ]}
                  >
                    {progressQ.data?.xp ?? 0}
                  </Text>
                </StudyCard>
              </View>
              <View style={{ flex: 1 }}>
                <StudyCard tone="review" title={t("journey.best")}>
                  <Text
                    style={[
                      studyType.statValue,
                      {
                        color: theme.accent,
                        fontFamily: fonts.sans,
                        fontWeight: "800",
                      },
                    ]}
                  >
                    {progressQ.data?.best_streak ?? progressQ.data?.streak ?? 0}
                  </Text>
                </StudyCard>
              </View>
            </View>

            <StudyCard tone="week" title={t("journey.weekActivity")}>
              <WeekStrip sessions={sessions} />
            </StudyCard>

            <StudyCard tone="neutral" title={t("journey.recent")}>
              {sessions.length === 0 ? (
                <EmptyState
                  title={t("journey.noSessions")}
                  message={t("journey.noSessionsMsg")}
                  glyph={motifChar(language)}
                />
              ) : (
                <View>
                  {sessions.slice(0, 14).map((s) => (
                    <View
                      key={s.id}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        paddingVertical: spacing.sm,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.border,
                        gap: spacing.md,
                      }}
                    >
                      <Text
                        style={[
                          studyType.cardBody,
                          { color: theme.text, fontFamily: fonts.sans },
                        ]}
                      >
                        {(s.date ?? "").slice(0, 10)}
                      </Text>
                      <Text
                        style={[
                          studyType.cardBody,
                          { color: theme.textMuted, fontFamily: fonts.sans },
                        ]}
                      >
                        {s.minutes} {t("journey.minAbbrev")} · {s.xp} XP
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </StudyCard>
          </>
        )}
      </View>
    </Screen>
  )
}
