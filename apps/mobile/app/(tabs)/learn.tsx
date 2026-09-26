import { useEffect, useState } from "react"
import { ActivityIndicator, ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { PaperCard, QuietPill, PaperStat } from "@/components/study/PaperCard"
import { PressableScale } from "@/components/study/press"
import { Motif } from "@/components/ui/Motif"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentLayout } from "@/theme/layout"
import { paperType, families } from "@/theme/paperType"
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
import type { I18nKey } from "@/i18n"

/**
 * The learn hub, as a page of paper.
 *
 * **This page is one number and then a list.** Everything a learner comes here
 * for reduces to "what do I do today", and that has exactly one answer worth
 * putting in front of them: how many cards are due. So the due count is not a
 * badge on one card among twelve — it is the top of the page, on its own tinted
 * paper, at the size a number has to be to be read across a room. The other
 * eleven surfaces are navigation, and navigation gets rows on a single sheet
 * instead of a wall of cards that would make the one thing that matters look
 * like the other ten.
 *
 * The old list gave every entry its own card, which meant twelve shadows and
 * twelve things competing. Rows separated by hairlines on one sheet read as
 * *one list you can scan*, which is the actual job of this page.
 *
 * Speaking and writing stay on one row. They are the same activity approached
 * from two directions — the same word, produced instead of recognised — and a
 * page that offered them as two destinations would imply you had to choose a
 * discipline rather than decide what to do with a word.
 *
 * The exam track sits above the drills because it is a **preference**, not a
 * task: it changes what `/program` plans and what the exam tab starts, and it
 * should be changed rarely and deliberately. Putting it mid-page among drills
 * invited accidental taps that silently rewrote the learner's whole course.
 */
export default function LearnTab() {
  const { paper } = useTheme()
  const t = useT()
  const router = useRouter()
  const { column } = useContentLayout()
  const language = useOnboardingStore((s) => s.language) ?? DEFAULT_LANGUAGE
  const storedExamType = useOnboardingStore((s) => s.examType)
  const setStoredExamType = useOnboardingStore((s) => s.setExamType)
  const info = languageInfo(language)
  const examTypes = info.examTypes

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
    tap()
    setExamType(v)
    setExamLevel(examLevels(v)[0])
    setStoredExamType(v)
    settings.update({ active_exam_type: v })
  }

  const srsQ = useQuery({ queryKey: ["srs-stats"], queryFn: progress.srsStats })
  const due = srsQ.data?.due ?? 0

  const drills: { title: string; body: string; route: string }[] = [
    { title: t("learn.vocab"), body: t("learn.vocabDesc"), route: "/vocab" },
    {
      title: t("learn.chars"),
      body: t("learn.charsDesc"),
      route: "/characters",
    },
    {
      title: isCharScript(language)
        ? t("learn.hanziMatch")
        : t("learn.wordMatch"),
      body: `${t("learn.pair")} ${wordLabel(language, false)} ${t("learn.toMeanings")}`,
      route: "/game-match",
    },
    { title: t("myw.kicker"), body: t("myw.savedBody"), route: "/my-words" },
    { title: t("nw.kicker"), body: t("nw.emptyBody"), route: "/new-words" },
    { title: t("learn.program"), body: t("town.note"), route: "/lessons" },
    { title: t("books.title"), body: t("books.tapHint"), route: "/books" },
    {
      title: t("learn.library"),
      body: t("learn.libraryDesc"),
      route: "/library",
    },
    {
      title: t("learn.program"),
      body: `${t("learn.programPrefix")} ${examDisplayName(examType)} ${t("learn.programSuffix")}`,
      route: "/program",
    },
    {
      title: t("learn.listening"),
      body: t("learn.listeningDesc"),
      route: "/listening-drill",
    },
    {
      title: `${t("learn.speaking")} · ${t("learn.writing")}`,
      body: `${t("learn.speakingDesc")} ${t("learn.writingDesc")}`,
      route: "/speaking",
    },
  ]

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: paper.paper }}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 48,
          gap: 22,
          maxWidth: column,
          width: "100%",
          alignSelf: "center",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={[paperType.label, { color: paper.inkMuted }]}>
              {t("learn.kicker")}
            </Text>
            <Text
              style={[
                paperType.greeting,
                { color: paper.ink, fontSize: 30, lineHeight: 34 },
              ]}
            >
              {t("learn.title")}
            </Text>
          </View>
          <Motif char={info.nativeName.charAt(0)} size={56} />
        </View>

        {/* Due count — the page's one headline. */}
        <PressableScale
          onPress={() => {
            tap()
            router.push("/review")
          }}
          accessibilityLabel={t("learn.review")}
        >
          <PaperCard tone="review" padded>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 16,
              }}
            >
              {srsQ.isLoading ? (
                <ActivityIndicator color={paper.inkSoft} />
              ) : (
                <PaperStat value={String(due)} label={t("learn.cardsDue")} />
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={[
                    paperType.cardTitle,
                    { color: paper.ink, fontSize: 19 },
                  ]}
                >
                  {t("learn.review")}
                </Text>
                <Text style={[paperType.cardBody, { color: paper.inkMuted }]}>
                  {due > 0 ? t("learn.startReview") : t("learn.allReviewed")}
                </Text>
              </View>
            </View>
          </PaperCard>
        </PressableScale>

        {/* Exam track: a preference, deliberately placed above the tasks. */}
        <View style={{ gap: 10 }}>
          <Text style={[paperType.label, { color: paper.inkMuted }]}>
            {t("learn.tracks")}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {examTypes.map((v) => (
              <QuietPill
                key={v}
                title={examDisplayName(v)}
                tone={v === examType ? "challenge" : "plain"}
                onPress={() => pickExamType(v)}
              />
            ))}
          </View>
          <Text style={[paperType.note, { color: paper.inkMuted }]}>
            {examDisplayName(examType)} · {examLevel} · {motifChar(language)}
          </Text>
        </View>

        {/* Everything else: one sheet, hairlines between, scan it. */}
        <PaperCard padded={false}>
          {drills.map((d, i) => (
            <DrillRow
              key={d.route}
              title={d.title}
              body={d.body}
              last={i === drills.length - 1}
              onPress={() => {
                tap()
                router.push(d.route as never)
              }}
            />
          ))}
        </PaperCard>
      </ScrollView>
    </SafeAreaView>
  )
}

/**
 * One destination. A hairline above rather than a card of its own, so twelve of
 * them read as a single list instead of twelve invitations.
 */
function DrillRow({
  title,
  body,
  last,
  onPress,
}: {
  title: string
  body: string
  last: boolean
  onPress: () => void
}) {
  const { paper } = useTheme()
  return (
    <PressableScale onPress={onPress} scale={0.995} accessibilityLabel={title}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          paddingVertical: 15,
          paddingHorizontal: 18,
          borderTopWidth: last ? 0 : 1,
          borderTopColor: paper.line,
        }}
      >
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[paperType.cardTitleSm, { color: paper.ink }]}>
            {title}
          </Text>
          <Text
            numberOfLines={1}
            style={[paperType.note, { color: paper.inkMuted }]}
          >
            {body}
          </Text>
        </View>
        <Text
          style={{
            color: paper.inkMuted,
            fontFamily: families.lora,
            fontSize: 20,
            lineHeight: 22,
          }}
        >
          ›
        </Text>
      </View>
    </PressableScale>
  )
}
