import { useMemo } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { ReviewHero } from "@/components/study/ReviewHero"
import { PaperCard } from "@/components/study/PaperCard"
import { DrillBadge } from "@/components/study/dashboardCards"
import { FlexGap } from "@/components/study/press"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentLayout } from "@/theme/layout"
import { paperType, families } from "@/theme/paperType"
import { progress } from "@/api/endpoints"
import { useT } from "@/i18n"
import { BackLink } from "@/components/ui/BackLink"
import { playSound } from "@/utils/sound"
import { tap } from "@/utils/feedback"
import type { SrsCard } from "@/types/api"

/**
 * The Review hub.
 *
 * The hub and the session are separate screens on purpose: the hub is counters
 * and cards, and each drill is pushed on top of it, so reopening a drill does
 * not stack duplicate hubs behind the back arrow.
 *
 * The three drills map onto what this backend actually knows:
 *  - **Flashcards** — every due card, graded 0–3 (SM-2).
 *  - **Listening** — the same cards, heard rather than seen, graded on answer.
 *  - **Mistakes** — cards the learner has been getting wrong. There is no lapse
 *    counter on the server, so it is `difficult_item_ids` plus low mastery: the
 *    same population, measured by what the backend actually keeps.
 */
export function ReviewHub() {
  const { paper } = useTheme()
  const t = useT()
  const router = useRouter()
  const { column: columnWidth } = useContentLayout()

  const dueQ = useQuery({
    queryKey: ["due-cards", 50],
    queryFn: () => progress.dueCards(50),
  })
  const statsQ = useQuery({
    queryKey: ["srs-stats"],
    queryFn: progress.srsStats,
  })
  const progressQ = useQuery({ queryKey: ["progress"], queryFn: progress.get })

  const due = dueQ.data ?? []
  const difficult = useMemo(
    () => new Set(progressQ.data?.difficult_item_ids ?? []),
    [progressQ.data]
  )
  const mistakes = due.filter(
    (c) => difficult.has(c.item_id) || c.mastery < 40
  ).length
}

export type ReviewDrill = SrsCard
