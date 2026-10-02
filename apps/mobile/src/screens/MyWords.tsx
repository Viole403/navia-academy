import { useMemo, useState } from "react"
import { Pressable, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { PaperCard, QuietPill } from "@/components/study/PaperCard"
import { ReadingAid } from "@/components/study/ReadingAid"
import { FlexGap } from "@/components/study/press"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentFaces } from "@/hooks/useContentFaces"
import { useContentLayout } from "@/theme/layout"
import { paperType, families, hanziFont, hanziType } from "@/theme/paperType"
import { progress } from "@/api/endpoints"
import { headword, reading, isCharScript } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useWordsFor } from "@/hooks/useWordsFor"
import { useT } from "@/i18n"
import { BackLink } from "@/components/ui/BackLink"
import { tap } from "@/utils/feedback"
import type { SrsCard } from "@/types/api"
import { useTargetLanguage } from "@/hooks/useTargetLanguage"

type Tier = "new" | "learning" | "proficient"

/**
 * My Words — the deck, tiered.
 *
 * Three tiers, and they fall straight out of a threshold: new (never graded),
 * learning (graded, not yet strong), proficient (mastery high). The server
 * records `mastery` and `total_reviews` per card, so no separate classifier is
 * needed to decide which is which.
 *
 * Saved and flagged words are surfaced here too, because a saved word and a
 * card in the deck are the same decision from the learner's side: "I want to
 * see this again" / "this one keeps beating me".
 */
export function MyWords() {
  const { paper } = useTheme()
  const faces = useContentFaces()
  const t = useT()
  const router = useRouter()
  const language = useTargetLanguage()
  const { column: columnWidth } = useContentLayout()
  const [tier, setTier] = useState<Tier>("learning")

  const cardsQ = useQuery({
    queryKey: ["due-cards", 100],
    queryFn: () => progress.dueCards(100),
  })
  const progressQ = useQuery({ queryKey: ["progress"], queryFn: progress.get })

  const tiers = useMemo(() => {
    const all = cardsQ.data ?? []
    return {
      new: all.filter((c) => c.total_reviews === 0),
      learning: all.filter((c) => c.total_reviews > 0 && c.mastery < 70),
      proficient: all.filter((c) => c.mastery >= 70),
    } satisfies Record<Tier, SrsCard[]>
  }, [cardsQ.data])

  const shown = tiers[tier].slice(0, 40)
  const words = useWordsFor(shown.map((c) => c.item_id))
  const saved = progressQ.data?.saved_word_ids ?? []
  const difficult = progressQ.data?.difficult_item_ids ?? []

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: paper.paper }}
      edges={["top"]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 12,
        }}
      >
        <BackLink label={t("common.back")} fallback="/(tabs)/learn" />
        <Text
          style={[
            paperType.statLabel,
            { color: paper.inkMuted, fontFamily: families.nunitoSemiBold },
          ]}
        >
          {t("myw.kicker")}
        </Text>
      </View>

      <View
        style={{
          width: columnWidth,
          alignSelf: "center",
          paddingHorizontal: 20,
          gap: 14,
        }}
      >
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["new", "learning", "proficient"] as const).map((k) => {
            const selected = tier === k
            return (
              <Pressable
                key={k}
                onPress={() => {
                  tap()
                  setTier(k)
                }}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: selected ? paper.green : paper.line,
                  backgroundColor: selected ? paper.greenSoft : "transparent",
                  borderRadius: paper.radius.pill,
                  paddingVertical: 9,
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Text
                  style={{
                    color: selected ? paper.greenDark : paper.inkMuted,
                    fontFamily: families.nunitoExtraBold,
                    fontSize: 16,
                  }}
                >
                  {tiers[k].length}
                </Text>
                <Text
                  style={{
                    color: selected ? paper.greenDark : paper.inkMuted,
                    fontFamily: families.nunitoSemiBold,
                    fontSize: 10.5,
                  }}
                >
                  {t(`myw.${k}`)}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {shown.length === 0 ? (
          <PaperCard tone="plain">
            <Text
              style={[
                paperType.cardBody,
                { color: paper.inkMuted, fontFamily: families.nunitoSemiBold },
              ]}
            >
              {t("myw.empty")}
            </Text>
            <QuietPill
              title={t("myw.browse")}
              tone="week"
              onPress={() => router.push("/vocab")}
            />
          </PaperCard>
        ) : (
          <PaperCard tone="plain" title={t(`myw.${tier}`)}>
            <View>
              {shown.map((c) => {
                const w = words[c.item_id]
                if (!w) return null
                return (
                  <CardRow
                    key={c.id}
                    card={c}
                    word={w}
                    flagged={difficult.includes(c.item_id)}
                    charScript={
                      isCharScript(language) && (w.hanzi?.length ?? 0) > 0
                    }
                  />
                )
              })}
            </View>
          </PaperCard>
        )}

        <PaperCard tone="week" title={t("myw.saved")} body={t("myw.savedBody")}>
          <Text
            style={[
              paperType.statValue,
              { color: paper.greenDark, fontFamily: families.nunitoExtraBold },
            ]}
          >
            {saved.length}
          </Text>
        </PaperCard>

        <PaperCard
          tone="challenge"
          title={t("myw.flagged")}
          body={t("myw.flaggedBody")}
        >
          <Text
            style={[
              paperType.statValue,
              { color: paper.lavender, fontFamily: families.nunitoExtraBold },
            ]}
          >
            {difficult.length}
          </Text>
          <QuietPill
            title={t("rev.dMistakes")}
            tone="challenge"
            onPress={() =>
              router.push({
                pathname: "/review-session",
                params: { mode: "mistakes" },
              })
            }
          />
        </PaperCard>

        <FlexGap min={0} />
      </View>
    </SafeAreaView>
  )
}

function CardRow({
  card,
  word,
  flagged,
  charScript,
}: {
  card: SrsCard
  word: import("@/types/api").VocabWord
  flagged: boolean
  charScript: boolean
}) {
  const { paper } = useTheme()
  const faces = useContentFaces()
  const router = useRouter()
  return (
    <Pressable
      onPress={() => {
        tap()
        router.push({ pathname: "/vocab/[id]", params: { id: card.item_id } })
      }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 9,
        borderBottomWidth: 1,
        borderBottomColor: paper.lineSoft,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          fontFamily: faces.display,
          fontSize: 24,
          lineHeight: 32,
          color: paper.ink,
          ...(charScript ? { width: 36 } : { minWidth: 36, flexShrink: 1 }),
        }}
      >
        {headword(word)}
      </Text>
      <View style={{ flex: 1, gap: 1 }}>
        <ReadingAid
          pinyin={reading(word)}
          size="label"
          color={paper.inkMuted}
        />
        <Text
          numberOfLines={1}
          style={[
            paperType.statLabel,
            { color: paper.inkMuted, fontFamily: families.nunitoSemiBold },
          ]}
        >
          {card.mastery}% · {card.total_reviews} {useT()("myw.reviews")}
        </Text>
      </View>
      {flagged ? <Ionicons name="flag" size={13} color={paper.coral} /> : null}
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor:
            card.mastery >= 70
              ? paper.green
              : card.mastery >= 40
                ? paper.gold
                : paper.coral,
        }}
      />
    </Pressable>
  )
}
