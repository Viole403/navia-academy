import { ActivityIndicator, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { Screen } from "@/components/ui/Screen"
import { EmptyState } from "@/components/ui/EmptyState"
import { StudyCard, SectionHeader } from "@/components/study/StudyCard"
import { spacing, studyType } from "@/components/study/tokens"
import { useContentLayout } from "@/theme/layout"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts } from "@/theme/typography"
import { progress } from "@/api/endpoints"
import { motifChar } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useT } from "@/i18n"
import { tap } from "@/utils/feedback"

/**
 * /notifications — local signals (web parity: /notifications).
 * No push inbox on the backend; signals are computed from live data:
 * due reviews, streak at risk, recently unlocked badges.
 */
export function Notifications() {
  const { theme } = useTheme()
  const { column: columnWidth } = useContentLayout()
  const t = useT()
  const router = useRouter()
  const language = useOnboardingStore((s) => s.language)

  const progressQ = useQuery({ queryKey: ["progress"], queryFn: progress.get })
  const dueQ = useQuery({
    queryKey: ["due-cards"],
    queryFn: () => progress.dueCards(),
  })
  const sessionsQ = useQuery({
    queryKey: ["study-sessions"],
    queryFn: () => progress.studySessions(50, 0),
  })
  const badgesQ = useQuery({
    queryKey: ["achievements"],
    queryFn: progress.achievements,
  })

  const due = dueQ.data?.length ?? 0
  const streak = progressQ.data?.streak ?? 0
  const todayKey = new Date().toISOString().slice(0, 10)
  const studiedToday = (sessionsQ.data ?? []).some(
    (s) => (s.date ?? "").slice(0, 10) === todayKey
  )
  const atRisk = streak > 0 && !studiedToday
  const recentBadges = (badgesQ.data ?? [])
    .filter((b) => (b.unlocked_at ?? "").slice(0, 10) >= todayKey)
    .slice(0, 3)

  const loading = progressQ.isLoading || dueQ.isLoading
  const quiet = due === 0 && !atRisk && recentBadges.length === 0

  return (
    <Screen>
      <View
        style={{
          width: "100%",
          maxWidth: columnWidth,
          alignSelf: "center",
          gap: spacing.lg,
        }}
      >
        <SectionHeader kicker={t("notif.kicker")} title={t("notif.title")} />
        {loading ? (
          <ActivityIndicator color={theme.accent} />
        ) : quiet ? (
          <EmptyState
            title={t("notif.empty")}
            message={t("notif.emptyMsg")}
            glyph={motifChar(language)}
          />
        ) : (
          <>
            {due > 0 && (
              <StudyCard
                tone="review"
                title={t("notif.dueTitle")}
                body={`${due} ${t("notif.dueBody")}`}
                onPress={() => {
                  tap()
                  router.push("/review")
                }}
              >
                <Text
                  style={[
                    studyType.link,
                    {
                      color: theme.accent,
                      fontFamily: fonts.sans,
                      fontWeight: "700",
                    },
                  ]}
                >
                  {t("notif.open")} →
                </Text>
              </StudyCard>
            )}
            {atRisk && (
              <StudyCard
                tone="challenge"
                title={t("notif.riskTitle")}
                body={t("notif.riskBody")}
                onPress={() => {
                  tap()
                  router.push("/review")
                }}
              >
                <Text
                  style={[
                    studyType.link,
                    {
                      color: theme.accent2,
                      fontFamily: fonts.sans,
                      fontWeight: "700",
                    },
                  ]}
                >
                  {t("notif.open")} →
                </Text>
              </StudyCard>
            )}
            {recentBadges.map((b) => (
              <StudyCard
                key={b.id}
                tone="week"
                title={t("notif.badgeTitle")}
                body={`${b.achievement_id} ${t("notif.badgeBody")}`}
                onPress={() => {
                  tap()
                  router.push("/achievements")
                }}
              />
            ))}
          </>
        )}
      </View>
    </Screen>
  )
}
