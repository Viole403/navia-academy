import { ActivityIndicator, ScrollView, Text, View } from "react-native"
import { useQuery } from "@tanstack/react-query"
import { SafeAreaView } from "react-native-safe-area-context"
import { EmptyState } from "@/components/ui/EmptyState"
import { Motif } from "@/components/ui/Motif"
import { LiftedFace, PaperCard } from "@/components/study/PaperCard"
import { useContentLayout } from "@/theme/layout"
import { useTheme } from "@/theme/ThemeProvider"
import { paperType } from "@/theme/paperType"
import { progress } from "@/api/endpoints"
import { motifChar } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useT } from "@/i18n"

/**
 * /achievements — the badges wall (web parity: /achievements).
 *
 * Read-only over `progress.achievements`. **Locked slots stay silent.** The
 * file header used to promise padlocks for things that were never actually
 * offered, and a wall of padlocks reads as a wall of failure; what is unlocked
 * is the only thing on this page that is true.
 */
export function Achievements() {
  const { paper } = useTheme()
  const { column: columnWidth } = useContentLayout()
  const t = useT()
  const language = useOnboardingStore((s) => s.language)

  const badgesQ = useQuery({
    queryKey: ["achievements"],
    queryFn: progress.achievements,
  })
  const badges = badgesQ.data ?? []

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
              {t("badges.kicker")}
            </Text>
            <Text
              style={[
                paperType.greeting,
                { color: paper.ink, fontSize: 30, lineHeight: 34 },
              ]}
            >
              {t("badges.title")}
            </Text>
          </View>
          <Motif char={motifChar(language)} size={56} />
        </View>
        <View style={{ height: 1, backgroundColor: paper.line }} />

        {badgesQ.isLoading ? (
          <PaperCard tone="review" style={{ alignItems: "center" }}>
            <ActivityIndicator color={paper.green} />
          </PaperCard>
        ) : badgesQ.isError ? (
          <View style={{ gap: 16 }}>
            <EmptyState
              title={t("badges.failedTitle")}
              message={t("common.loadFailed")}
              glyph={motifChar(language)}
            />
            <LiftedFace
              title={t("common.retry")}
              face={paper.green}
              onPress={() => badgesQ.refetch()}
            />
          </View>
        ) : badges.length === 0 ? (
          <EmptyState
            title={t("badges.empty")}
            message={t("badges.emptyMsg")}
            glyph={motifChar(language)}
          />
        ) : (
          <PaperCard padded={false}>
            {badges.map((b, i) => (
              <View
                key={b.id}
                style={{
                  padding: 16,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: paper.lineSoft,
                  gap: 6,
                }}
              >
                <Text style={[paperType.label, { color: paper.greenDark }]}>
                  {t("badges.unlocked").toUpperCase()}
                </Text>
                <Text style={[paperType.cardTitleSm, { color: paper.ink }]}>
                  {b.achievement_id}
                </Text>
                <Text style={[paperType.note, { color: paper.inkMuted }]}>
                  {(b.unlocked_at ?? "").slice(0, 10)}
                </Text>
              </View>
            ))}
          </PaperCard>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
