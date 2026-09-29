import { ActivityIndicator, ScrollView, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { SafeAreaView } from "react-native-safe-area-context"
import { EmptyState } from "@/components/ui/EmptyState"
import { Motif } from "@/components/ui/Motif"
import { PaperCard } from "@/components/study/PaperCard"
import { PressableScale } from "@/components/study/press"
import { useContentLayout } from "@/theme/layout"
import { useTheme } from "@/theme/ThemeProvider"
import { paperType } from "@/theme/paperType"
import { progress } from "@/api/endpoints"
import { motifChar } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useT } from "@/i18n"
import { tap } from "@/utils/feedback"

/**
 * /notifications — what is waiting, computed from live data.
 *
 * There is no push inbox on the backend, so nothing here is a message that
 * arrived; every row is a fact about right now. That shapes the design: each
 * one is a *door*, not an announcement, so the row itself is the tap target and
 * carries its own "open". A list of cards that each had to be aimed at a small
 * link inside was three taps of precision to act on one piece of good news.
 *
 * Nothing here is urgent-looking. A streak at risk is worth a mention and not
 * worth an alarm — the page exists so a learner can check, not so the app can
 * chase them.
 */
export function Notifications() {
  const { paper } = useTheme()
  const { column: columnWidth } = useContentLayout()
  const t = useT()
  const router = useRouter()
  const language = useOnboardingStore((s) => s.language)

  const progressQ = useQuery({ queryKey: ["progress"], queryFn: progress.get })
  const dueQ = useQuery({
    queryKey: ["due-cards", 50],
    queryFn: () => progress.dueCards(50),
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
              {t("notif.kicker")}
            </Text>
            <Text
              style={[
                paperType.greeting,
                { color: paper.ink, fontSize: 30, lineHeight: 34 },
              ]}
            >
              {t("notif.title")}
            </Text>
          </View>
          <Motif char={motifChar(language)} size={56} />
        </View>
        <View style={{ height: 1, backgroundColor: paper.line }} />

        {loading ? (
          <PaperCard tone="review" style={{ alignItems: "center" }}>
            <ActivityIndicator color={paper.green} />
          </PaperCard>
        ) : quiet ? (
          <EmptyState
            title={t("notif.empty")}
            message={t("notif.emptyMsg")}
            glyph={motifChar(language)}
          />
        ) : (
          <>
            {due > 0 && (
              <Signal
                title={t("notif.dueTitle")}
                body={`${due} ${t("notif.dueBody")}`}
                link={t("notif.open")}
                tint={paper.green}
                onPress={() => {
                  tap()
                  router.push("/review")
                }}
              />
            )}
            {atRisk && (
              <Signal
                title={t("notif.riskTitle")}
                body={t("notif.riskBody")}
                link={t("notif.open")}
                tint={paper.coral}
                onPress={() => {
                  tap()
                  router.push("/review")
                }}
              />
            )}
            {recentBadges.map((b) => (
              <Signal
                key={b.id}
                title={t("notif.badgeTitle")}
                body={`${b.achievement_id} ${t("notif.badgeBody")}`}
                link={t("notif.open")}
                tint={paper.gold}
                onPress={() => {
                  tap()
                  router.push("/achievements")
                }}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

/**
 * One waiting thing, and the whole thing is the door. A card is a *card* — it is
 * something to look at — so putting the only action on a word inside it meant
 * asking for precision on a small target for the one moment the row mattered.
 */
function Signal({
  title,
  body,
  link,
  tint,
  onPress,
}: {
  title: string
  body: string
  link: string
  tint: string
  onPress: () => void
}) {
  const { paper } = useTheme()
  return (
    <PressableScale onPress={onPress} scale={0.995} accessibilityLabel={title}>
      <PaperCard
        padded={false}
        style={{ borderColor: tint, borderLeftWidth: 3 }}
      >
        <View style={{ padding: 16, gap: 4 }}>
          <Text style={[paperType.label, { color: tint }]}>{title}</Text>
          <Text style={[paperType.cardBody, { color: paper.inkSoft }]}>
            {body}
          </Text>
          <Text style={[paperType.link, { color: tint, marginTop: 4 }]}>
            {link} →
          </Text>
        </View>
      </PaperCard>
    </PressableScale>
  )
}
