import { useMemo } from "react"
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { Card } from "@/components/ui/Card"
import { ProgressBar } from "@/components/ui/ProgressBar"
import { Motif } from "@/components/ui/Motif"
import { EmptyState } from "@/components/ui/EmptyState"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
import { exam, progress, settings } from "@/api/endpoints"
import { useAuthStore } from "@/store/auth"

const DAILY_WORDS = [
  { hanzi: "晨", pinyin: "chén", meaning: "morning" },
  { hanzi: "浪", pinyin: "làng", meaning: "wave" },
  { hanzi: "纸", pinyin: "zhǐ", meaning: "paper" },
  { hanzi: "野", pinyin: "yě", meaning: "field; wild" },
]

export default function HomeTab() {
  const { theme } = useTheme()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)

  const progressQ = useQuery({ queryKey: ["progress"], queryFn: progress.get })
  const dueCardsQ = useQuery({
    queryKey: ["due-cards"],
    queryFn: () => progress.dueCards(),
  })
  const srsStatsQ = useQuery({
    queryKey: ["srs-stats"],
    queryFn: progress.srsStats,
  })
  const settingsQ = useQuery({ queryKey: ["settings"], queryFn: settings.get })
  const recommendedQ = useQuery({
    queryKey: ["exam-recommended"],
    queryFn: exam.recommended,
  })

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return "Good morning"
    if (h < 18) return "Good afternoon"
    return "Good evening"
  }, [])

  // Pick a deterministic "word of the day"
  const word = useMemo(() => {
    const d = Math.floor(Date.now() / 86_400_000)
    return DAILY_WORDS[d % DAILY_WORDS.length]
  }, [])

  const goal = settingsQ.data?.daily_goal_min ?? 10
  const todayMin = useMemo(() => {
    // In a real impl, would query today's study session
    return 0
  }, [])
  const goalProgress = goal > 0 ? Math.min(1, todayMin / goal) : 0

  const isLoading =
    progressQ.isLoading || dueCardsQ.isLoading || srsStatsQ.isLoading

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={{ padding: 24, gap: 32, paddingBottom: 48 }}
        refreshControl={
          <RefreshControl
            refreshing={
              progressQ.isRefetching ||
              dueCardsQ.isRefetching ||
              srsStatsQ.isRefetching
            }
            onRefresh={() => {
              progressQ.refetch()
              dueCardsQ.refetch()
              srsStatsQ.refetch()
            }}
            tintColor={theme.accent}
          />
        }
      >
        {/* Masthead */}
        <View style={{ gap: 12 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={[type.labelSm, { color: theme.textMuted }]}>
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
              <Text style={[type.display, { color: theme.text, fontSize: 36 }]}>
                {greeting},{"\n"}
                <Text style={{ color: theme.accent, fontStyle: "italic" }}>
                  {user?.name?.split(" ")[0] ?? "reader"}.
                </Text>
              </Text>
            </View>
            <Motif char="今" size={64} />
          </View>
          <View style={{ height: 1, backgroundColor: theme.border }} />
        </View>

        {/* Stats strip — like a newspaper byline */}
        {isLoading ? (
          <ActivityIndicator color={theme.accent} />
        ) : (
          <View
            style={{
              flexDirection: "row",
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: theme.border,
              paddingVertical: 16,
            }}
          >
            <StatStrip
              value={progressQ.data?.xp ?? 0}
              label="Lifetime XP"
              accent={theme.accent}
            />
            <Divider color={theme.border} />
            <StatStrip
              value={progressQ.data?.streak ?? 0}
              label="Day streak"
              accent={theme.gold}
            />
            <Divider color={theme.border} />
            <StatStrip
              value={srsStatsQ.data?.due ?? 0}
              label="Cards due"
              accent={theme.mint}
            />
          </View>
        )}

        {/* Word of the Day — feature article */}
        <Card padded={false}>
          <View style={{ padding: 20, gap: 16 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={[type.labelSm, { color: theme.textMuted }]}>
                Word of the day
              </Text>
              <Text style={[type.labelSm, { color: theme.accent }]}>
                No. 001
              </Text>
            </View>
            <View style={{ height: 1, backgroundColor: theme.border }} />
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 20 }}
            >
              <Text
                style={{
                  fontFamily: fonts.serif,
                  fontSize: 84,
                  lineHeight: 96,
                  color: theme.text,
                  fontWeight: "500",
                }}
              >
                {word.hanzi}
              </Text>
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={[
                    type.label,
                    { color: theme.textMuted, fontFamily: fonts.sans },
                  ]}
                >
                  {word.pinyin}
                </Text>
                <Text
                  style={[
                    {
                      fontFamily: fonts.serif,
                      fontStyle: "italic",
                      fontSize: 20,
                      color: theme.text,
                    },
                  ]}
                >
                  {word.meaning}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Daily goal */}
        <View style={{ gap: 12 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <Text style={[type.labelSm, { color: theme.textMuted }]}>
              Daily goal
            </Text>
            <Text style={[type.caption, { color: theme.textMuted }]}>
              {todayMin} / {goal} min
            </Text>
          </View>
          <ProgressBar value={goalProgress} height={3} tint={theme.accent} />
        </View>

        {/* Quick actions */}
        <View style={{ gap: 12 }}>
          <Text style={[type.labelSm, { color: theme.textMuted }]}>
            Continue
          </Text>

          {(dueCardsQ.data?.length ?? 0) > 0 && (
            <ActionRow
              label="Review due cards"
              detail={`${dueCardsQ.data?.length ?? 0} waiting`}
              onPress={() => router.push("/(tabs)/learn")}
              accent={theme.mint}
            />
          )}
          {recommendedQ.data && (
            <ActionRow
              label={`Start ${recommendedQ.data.exam_type.toUpperCase()} ${recommendedQ.data.exam_level}`}
              detail="Recommended exam"
              onPress={() => router.push("/(tabs)/exam")}
              accent={theme.accent}
            />
          )}
          <ActionRow
            label="Browse vocabulary"
            detail="HSK · TOCFL · YCT · BCT"
            onPress={() => router.push("/(tabs)/learn")}
            accent={theme.gold}
          />
        </View>

        {(dueCardsQ.data?.length ?? 0) === 0 && !recommendedQ.data && (
          <EmptyState
            title="All caught up"
            message="No cards due and no exams recommended. Come back tomorrow."
            glyph="安"
          />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function StatStrip({
  value,
  label,
  accent,
}: {
  value: number
  label: string
  accent: string
}) {
  const { theme } = useTheme()
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: 32,
          color: accent,
          fontWeight: "500",
          lineHeight: 36,
        }}
      >
        {value}
      </Text>
      <Text
        style={[
          type.labelSm,
          { color: theme.textMuted, fontFamily: fonts.sans },
        ]}
      >
        {label}
      </Text>
    </View>
  )
}

function Divider({ color }: { color: string }) {
  return (
    <View
      style={{
        width: 1,
        backgroundColor: color,
        marginHorizontal: 16,
      }}
    />
  )
}

function ActionRow({
  label,
  detail,
  accent,
  onPress,
}: {
  label: string
  detail: string
  accent: string
  onPress: () => void
}) {
  const { theme } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: theme.border,
        gap: 16,
      }}
    >
      <View
        style={{
          width: 4,
          alignSelf: "stretch",
          backgroundColor: accent,
        }}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.body, { color: theme.text, fontWeight: "600" }]}>
          {label}
        </Text>
        <Text style={[type.caption, { color: theme.textMuted }]}>{detail}</Text>
      </View>
      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: 22,
          color: theme.textMuted,
        }}
      >
        →
      </Text>
    </Pressable>
  )
}
