import { useMemo } from "react"
import { Text, View } from "react-native"
import { useQuery } from "@tanstack/react-query"
import { PaperCard } from "@/components/study/PaperCard"
import { loadOnboardingIntroductions } from "@/lib/content-data"
import { useContentFaces } from "@/hooks/useContentFaces"
import { useLocaleStore } from "@/i18n"
import { useTheme } from "@/theme/ThemeProvider"
import { paperType, families } from "@/theme/paperType"
import type { LanguageCode } from "@/lib/languages"

/**
 * What the learner just signed up for, in the course's own words.
 *
 * The onboarding steps are a settings wizard, so a German or Japanese learner
 * used to reach the end of them with no idea which course they had chosen or
 * what it covered. That is content, not interface, so it is content: it lives in
 * `data/json/<lang>/onboarding/` and is fetched like everything else.
 *
 * **The course's title and its focus words are in the learning language.** Those
 * are the words the learner is about to meet, so rendering "Vocabulary" in
 * Indonesian would throw away the one thing the card is for. The prose that
 * *explains* the course rather than performs it follows the reader's own locale.
 *
 * Content is never on the critical path of onboarding. Until it arrives — and
 * if it never does, on a plane or before the next publish — the caller keeps its
 * own card, so this renders nothing rather than a spinner.
 */
export function CourseIntro({
  language,
  examType,
}: {
  language: LanguageCode
  examType: string | null
}) {
  const { paper } = useTheme()
  const locale = useLocaleStore((s) => s.locale)
  const faces = useContentFaces()

  const query = useQuery({
    queryKey: ["onboarding-intro", language],
    queryFn: () => loadOnboardingIntroductions(language),
    // A course description changes when a release ships, not between visits.
    staleTime: 60 * 60 * 1000,
  })

  const intro = useMemo(
    () => (query.data ?? []).find((i) => i.examType === examType) ?? null,
    [query.data, examType]
  )

  if (!intro) return null

  return (
    <PaperCard tone="plain">
      <View style={{ gap: 4 }}>
        <Text
          style={[
            paperType.label,
            { color: paper.inkSoft, fontFamily: families.interSemiBold },
          ]}
        >
          {locale === "id" ? "Kurs ini" : "This course"}
        </Text>
        <Text
          style={{
            fontFamily: faces.display,
            fontSize: 26,
            lineHeight: 34,
            color: paper.ink,
          }}
        >
          {intro.title}
        </Text>
        <Text
          style={[
            paperType.cardBody,
            {
              color: paper.inkSoft,
              fontFamily: families.nunitoSemiBold,
              marginTop: 4,
            },
          ]}
        >
          {locale === "id" ? intro.intro_id : intro.intro_en}
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 12,
        }}
      >
        {intro.focus.map((f) => (
          <View
            key={f.label}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: paper.radius.pill,
              borderWidth: 1,
              borderColor: paper.line,
              backgroundColor: paper.cardAlt,
              alignItems: "center",
              gap: 1,
            }}
          >
            {/* The word in the course's language, with the reader's own name
                for it underneath — the pair is the point, so neither is
                dropped when the reader's locale is English or Indonesian. */}
            <Text
              style={{
                fontFamily: faces.display,
                fontSize: 15,
                color: paper.ink,
              }}
            >
              {f.label}
            </Text>
            <Text
              style={[
                paperType.statLabel,
                {
                  color: paper.inkMuted,
                  fontFamily: families.nunitoSemiBold,
                  fontSize: 11,
                },
              ]}
            >
              {locale === "id" ? f.label_id : f.label_en}
            </Text>
          </View>
        ))}
      </View>
    </PaperCard>
  )
}
