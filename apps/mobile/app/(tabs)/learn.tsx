import { useEffect, useState } from "react"
import {
  Animated,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { Chip } from "@/components/ui/Chip"
import { Motif } from "@/components/ui/Motif"
import { StudyCard } from "@/components/study/StudyCard"
import { useEntranceRun, useReveal } from "@/components/study/Reveal"
import {
  CONTENT_MAX,
  entranceScore,
  spacing,
  studyType,
} from "@/components/study/tokens"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
import { progress, settings } from "@/api/endpoints"
import {
  DEFAULT_LANGUAGE,
  examDisplayName,
  examLevels,
  isCharScript,
  languageInfo,
  motifChar,
  wordLabel,
} from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useT } from "@/i18n"
import { tap } from "@/utils/feedback"

/**
 * Learn hub — ported from Chinese-Easy's Review hub + Learn picker sheet:
 * one screen of drill cards with live counters, each opening the surface
 * where the work actually happens. (The old browse list moves to
 * /vocab in Batch D with the dictionary ranking ladder.)
 */
export default function LearnTab() {
  const { theme } = useTheme()
  const t = useT()
  const router = useRouter()
  const language = useOnboardingStore((s) => s.language) ?? DEFAULT_LANGUAGE
  const storedExamType = useOnboardingStore((s) => s.examType)
  const setStoredExamType = useOnboardingStore((s) => s.setExamType)
  const info = languageInfo(language)
  const examTypes = info.examTypes
  const { width } = useWindowDimensions()
  const columnWidth = Math.min(width, CONTENT_MAX)

  const initType =
    storedExamType && examTypes.includes(storedExamType)
      ? storedExamType
      : examTypes[0]
  const [examType, setExamType] = useState<string>(initType)
  const [examLevel, setExamLevel] = useState<string>(examLevels(initType)[0])
  useEffect(() => {
    const next =
      storedExamType && examTypes.includes(storedExamType)
        ? storedExamType
        : examTypes[0]
    setExamType(next)
    setExamLevel(examLevels(next)[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, storedExamType])
  const pickExamType = (v: string) => {
    setExamType(v)
    setExamLevel(examLevels(v)[0])
    setStoredExamType(v)
    settings.update({ active_exam_type: v })
  }

  const srsQ = useQuery({ queryKey: ["srs-stats"], queryFn: progress.srsStats })
  const due = srsQ.data?.due ?? 0

  const run = useEntranceRun()

  const drills: {
    tag: string
    title: string
    body: string
    route:
      | "/review"
      | "/vocab"
      | "/characters"
      | "/books"
      | "/game-match"
      | "/library"
      | "/program"
      | "/listening-drill"
      | "/speaking"
      | "/writing"
    badge?: string
  }[] = [
    {
      tag: t("learn.review").toUpperCase(),
      title: t("learn.review"),
      body: `${due} ${t("learn.cardsDue")}`,
      route: "/review",
      badge: due > 0 ? String(due) : undefined,
    },
    {
      tag: t("learn.drills").toUpperCase(),
      title: t("learn.vocab"),
      body: t("learn.vocabDesc"),
      route: "/vocab",
    },
    {
      tag: t("learn.drills").toUpperCase(),
      title: t("learn.chars"),
      body: t("learn.charsDesc"),
      route: "/characters",
    },
    {
      tag: t("learn.drills").toUpperCase(),
      title: isCharScript(language)
        ? t("learn.hanziMatch")
        : t("learn.wordMatch"),
      body: `${t("learn.pair")} ${wordLabel(language, false)} ${t("learn.toMeanings")}`,
      route: "/game-match",
    },
    {
      tag: t("learn.drills").toUpperCase(),
      title: t("books.title"),
      body: t("books.tapHint"),
      route: "/books",
    },
    {
      tag: t("learn.drills").toUpperCase(),
      title: t("learn.library"),
      body: t("learn.libraryDesc"),
      route: "/library",
    },
    {
      tag: t("learn.drills").toUpperCase(),
      title: t("learn.program"),
      body: `${t("learn.programPrefix")} ${examDisplayName(examType)} ${t("learn.programSuffix")}`,
      route: "/program",
    },
    {
      tag: t("learn.drills").toUpperCase(),
      title: t("learn.listening"),
      body: t("learn.listeningDesc"),
      route: "/listening-drill",
    },
    {
      tag: t("learn.drills").toUpperCase(),
      title: `${t("learn.speaking")} · ${t("learn.writing")}`,
      body: `${t("learn.speakingDesc")} ${t("learn.writingDesc")}`,
      route: "/speaking",
    },
  ]

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 48,
          flexGrow: 1,
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: columnWidth,
            padding: spacing.screen,
            gap: spacing.cardGap,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text style={[type.labelSm, { color: theme.textMuted }]}>
                {t("learn.kicker")}
              </Text>
              <Text
                style={[
                  studyType.greeting,
                  {
                    color: theme.text,
                    fontFamily: fonts.sans,
                    fontWeight: "800",
                  },
                ]}
              >
                {t("learn.title")}
              </Text>
            </View>
            <Motif char={info.nativeName.charAt(0)} size={56} />
          </View>
          <View style={{ height: 1, backgroundColor: theme.border }} />

          {/* Exam track */}
          <View style={{ gap: spacing.sm }}>
            <Text style={[type.labelSm, { color: theme.textMuted }]}>
              {t("learn.tracks")}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm }}
            >
              {examTypes.map((v) => (
                <Chip
                  key={v}
                  label={examDisplayName(v)}
                  selected={examType === v}
                  onPress={() => pickExamType(v)}
                />
              ))}
            </ScrollView>
            <Text style={[type.caption, { color: theme.textDim }]}>
              {examDisplayName(examType)} · {examLevel} · {motifChar(language)}
            </Text>
          </View>

          {drills.map((d, i) => (
            <DrillCard
              key={d.route + d.title}
              index={i}
              run={run}
              tag={d.tag}
              title={d.title}
              body={d.body}
              badge={d.badge}
              tone={i === 0 ? "review" : "neutral"}
              onPress={() => {
                tap()
                router.push(d.route)
              }}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function DrillCard({
  index,
  run,
  tag,
  title,
  body,
  badge,
  tone,
  onPress,
}: {
  index: number
  run: number
  tag: string
  title: string
  body: string
  badge?: string
  tone: "review" | "neutral"
  onPress: () => void
}) {
  const { theme } = useTheme()
  const r = useReveal({
    at: entranceScore.cards.at + entranceScore.cards.stagger * index,
    duration: entranceScore.cards.for,
    run,
  })
  return (
    <Animated.View
      style={{
        opacity: r.opacity,
        transform: [{ translateY: r.translate }],
      }}
    >
      <StudyCard
        tone={tone}
        tag={tag}
        title={title}
        body={body}
        onPress={onPress}
      >
        {badge && (
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
            {badge}
          </Text>
        )}
      </StudyCard>
    </Animated.View>
  )
}
