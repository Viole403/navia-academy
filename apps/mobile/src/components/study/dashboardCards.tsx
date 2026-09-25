import { Text, View } from "react-native"
import { useTheme } from "@/theme/ThemeProvider"
import { paperType, families } from "@/theme/paperType"
import { PaperCard, LiftedFace, QuietPill, PaperStat } from "./PaperCard"
import { CardArt, PressableScale } from "./press"
import { WeekStrip } from "./WeekStrip"
import { art, artRatio, reviewArt } from "./art"
import { useT } from "@/i18n"
import type { StudySession } from "@/types/api"

/**
 * The five dashboard cards. Each is a pure function of numbers the screen has
 * already worked out; the composition lives in the screen, not here.
 *
 * Which cards are one pressable and which are one pressable *and* several is
 * not incidental:
 *
 *  - Review and Challenges are a single target. Their "Start Review" pill and
 *    "View all" label are plain Views following the press, not nested
 *    Pressables — nesting a second Pressable double-fires on web.
 *  - The word card is the combined case: its body opens New Words while
 *    "Add this word" and "Not now" keep their own actions, which is what
 *    `usePressClaim` exists to make safe.
 */

// ─── Review ──────────────────────────────────────────────────────────────────

export function ReviewCard({
  due,
  onStart,
}: {
  due: number
  onStart: () => void
}) {
  const { paper } = useTheme()
  const t = useT()
  return (
    <PaperCard
      tone="review"
      tag={t("home.reviewTitle").toUpperCase()}
      title={due > 0 ? `${due} ${t("home.waiting")}` : t("home.reviewTitle")}
      body={t("home.reviewBody")}
      art={art.fire}
      artRatio={artRatio.fire}
      artWidth={78}
      artStyle={{ right: -6, bottom: 4 }}
    >
      {due > 0 ? (
        <View style={{ alignSelf: "flex-start", marginTop: 4 }}>
          <LiftedFace
            title={t("home.startReview")}
            face={paper.coral}
            small
            onPress={onStart}
          />
        </View>
      ) : null}
    </PaperCard>
  )
}

// ─── New word ───────────────────────────────────────────────────────────────

export function NewWordCard({
  word,
  reading,
  gloss,
  added,
  adding,
  onOpen,
  onAdd,
  onDismiss,
}: {
  word: string
  reading?: string | null
  gloss?: string | null
  added: boolean
  adding: boolean
  onOpen: () => void
  onAdd: () => void
  onDismiss: () => void
}) {
  const { paper } = useTheme()
  const t = useT()
  return (
    <PaperCard tone="word" onPress={onOpen}>
      <View style={{ gap: 2 }}>
        <Text
          style={[
            paperType.label,
            { color: paper.inkSoft, fontFamily: families.interSemiBold },
          ]}
        >
          {t("home.newWordTitle")}
        </Text>
        <Text
          style={{
            fontFamily: families.hanziSc,
            fontSize: 58,
            lineHeight: 70,
            color: paper.ink,
          }}
        >
          {word}
        </Text>
        {!!reading && (
          <Text
            style={[
              paperType.cardBody,
              { color: paper.coral, fontFamily: families.nunitoBold },
            ]}
          >
            {reading}
          </Text>
        )}
        {!!gloss && (
          <Text
            style={[
              paperType.bodySm,
              { color: paper.inkSoft, fontFamily: families.inter },
            ]}
          >
            {gloss}
          </Text>
        )}
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: 8,
          alignItems: "center",
          marginTop: 4,
        }}
      >
        {added ? (
          <Text
            style={[
              paperType.link,
              { color: paper.green, fontFamily: families.nunitoBold },
            ]}
          >
            {t("home.addedWord")}
          </Text>
        ) : (
          <>
            <PressableScale onPress={onAdd} wrapperStyle={{ flex: 1 }}>
              <LiftedFace
                title={adding ? t("common.loading") : t("home.addWord")}
                face={paper.green}
                small
              />
            </PressableScale>
            <PressableScale onPress={onDismiss} wrapperStyle={{ flex: 1 }}>
              <QuietPill title={t("home.dismiss")} tone="week" />
            </PressableScale>
          </>
        )}
      </View>
    </PaperCard>
  )
}

// ─── Challenges ─────────────────────────────────────────────────────────────

export function ChallengesSummaryCard({
  streak,
  due,
  onOpen,
}: {
  streak: number
  due: number
  onOpen: () => void
}) {
  const { paper } = useTheme()
  const t = useT()
  return (
    <PaperCard
      tone="challenge"
      tag={t("home.challengesTitle").toUpperCase()}
      title={`${streak} ${t("home.streak")}`}
      body={t("home.challengesBody")}
      onPress={onOpen}
      art={art.scroll}
      artRatio={artRatio.scroll}
      artWidth={64}
      artStyle={{ right: 4, bottom: -6 }}
    >
      <View style={{ flexDirection: "row", gap: 20, marginTop: 4 }}>
        <PaperStat value={streak} label={t("home.streak")} ink={paper.coral} />
        <PaperStat value={due} label={t("home.due")} ink={paper.lavender} />
        <View style={{ flex: 1 }} />
        <View style={{ justifyContent: "flex-end" }}>
          <Text
            style={[
              paperType.link,
              { color: paper.lavender, fontFamily: families.nunitoBold },
            ]}
          >
            {t("home.viewAll")} →
          </Text>
        </View>
      </View>
    </PaperCard>
  )
}

// ─── This week ──────────────────────────────────────────────────────────────

export function WeeklyActivityCard({
  sessions,
  onOpen,
}: {
  sessions: StudySession[]
  onOpen: () => void
}) {
  const { paper } = useTheme()
  const t = useT()
  const weekMinutes = useWeekMinutes(sessions)
  return (
    <PaperCard
      tone="week"
      tag={t("home.weekTitle").toUpperCase()}
      onPress={onOpen}
      art={art.bonsai}
      artRatio={artRatio.bonsai}
      artWidth={96}
      artStyle={{ right: -6, bottom: -10 }}
    >
      <WeekStrip sessions={sessions} />
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text
          style={[
            paperType.cardBody,
            { color: paper.inkSoft, fontFamily: families.nunitoSemiBold },
          ]}
        >
          {weekMinutes} {t("journey.minAbbrev")}
        </Text>
        <Text
          style={[
            paperType.link,
            { color: paper.greenDark, fontFamily: families.nunitoBold },
          ]}
        >
          {t("home.viewProgress")} →
        </Text>
      </View>
    </PaperCard>
  )
}

function useWeekMinutes(sessions: StudySession[]): number {
  const monday = (() => {
    const now = new Date()
    const dow = (now.getDay() + 6) % 7
    const d = new Date(now)
    d.setDate(now.getDate() - dow)
    return d.toISOString().slice(0, 10)
  })()
  return sessions
    .filter((s) => (s.date ?? "").slice(0, 10) >= monday)
    .reduce((sum, s) => sum + (s.minutes ?? 0), 0)
}

// ─── Drill badge (review hub) ───────────────────────────────────────────────

/**
 * A painted disc, not a tinted circle with a glyph in it.
 *
 * The artwork carries its own circle, and each disc's colour is the one its drill
 * entry already had — which is why they dropped in without the cards being
 * repainted. The badge therefore sets **no** background and **no** radius: a
 * coloured circle behind the image would only show as a rim of
 * not-quite-the-same colour wherever the two disagreed by a pixel.
 */
export function DrillBadge({
  source,
  size = 58,
}: {
  source: keyof typeof reviewArt
  size?: number
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View style={{ position: "absolute" }}>
        <CardArt source={reviewArt[source]} ratio={1} width={size} />
      </View>
    </View>
  )
}
