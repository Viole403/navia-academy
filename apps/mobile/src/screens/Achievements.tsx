import { ActivityIndicator, Text, View } from "react-native"
import { useQuery } from "@tanstack/react-query"
import { Screen } from "@/components/ui/Screen"
import { EmptyState } from "@/components/ui/EmptyState"
import { StudyCard, SectionHeader } from "@/components/study/StudyCard"
import { CONTENT_MAX, spacing, studyType } from "@/components/study/tokens"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts } from "@/theme/typography"
import { progress } from "@/api/endpoints"
import { motifChar } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useT } from "@/i18n"

/**
 * /achievements — badges wall (web parity: /achievements).
 * Read-only over progress.achievements; unlocked badges lead, locked
 * slots stay silent (no padlocks for things never promised).
 */
export function Achievements() {
  const { theme } = useTheme()
  const t = useT()
  const language = useOnboardingStore((s) => s.language)

  const badgesQ = useQuery({
    queryKey: ["achievements"],
    queryFn: progress.achievements,
  })
  const badges = badgesQ.data ?? []

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
        <SectionHeader kicker={t("badges.kicker")} title={t("badges.title")} />
        {badgesQ.isLoading ? (
          <ActivityIndicator color={theme.accent} />
        ) : badges.length === 0 ? (
          <EmptyState
            title={t("badges.empty")}
            message={t("badges.emptyMsg")}
            glyph={motifChar(language)}
          />
        ) : (
          badges.map((b) => (
            <StudyCard
              key={b.id}
              tone="week"
              tag={t("badges.unlocked").toUpperCase()}
              title={b.achievement_id}
            >
              <Text
                style={[
                  studyType.cardBody,
                  { color: theme.textMuted, fontFamily: fonts.sans },
                ]}
              >
                {(b.unlocked_at ?? "").slice(0, 10)}
              </Text>
            </StudyCard>
          ))
        )}
      </View>
    </Screen>
  )
}
