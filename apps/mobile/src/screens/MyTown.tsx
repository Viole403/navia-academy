import { useEffect, useMemo, useState } from "react"
import { Pressable, ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { PaperCard, LiftedFace } from "@/components/study/PaperCard"
import { ProgressBar } from "@/components/ui/ProgressBar"
import { FlexGap } from "@/components/study/press"
import { Shifu } from "@/components/study/Shifu"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentLayout } from "@/theme/layout"
import { paperType, families } from "@/theme/paperType"
import { progress } from "@/api/endpoints"
import { storage } from "@/utils/storage"
import { useT, type I18nKey } from "@/i18n"
import { playSound } from "@/utils/sound"
import { careful, tap, thud } from "@/utils/feedback"

/**
 * My Town.
 *
 * XP is a **stat** here: written by study logging, read by the dashboard, with
 * no spend endpoint and no inventory behind it. So a town where unlocking a
 * building mutates server state would be inventing a contract that does not
 * exist.
 *
 * What is kept, and is the part that earns its screen: the buildings are
 * **unlocked by your own history**, which is a real progression the learner can
 * read. Buildings unlock on XP thresholds, the next one is always visible with
 * what it still costs, and an explicit unlock is recorded locally — so the town
 * grows with the learner instead of being a decoration with buttons that do
 * nothing.
 */
interface Building {
  id: string
  nameKey: I18nKey
  xpCost: number
}

const BUILDINGS: Building[] = [
  { id: "temple", nameKey: "town.temple", xpCost: 0 },
  { id: "teaHouse", nameKey: "town.teaHouse", xpCost: 300 },
  { id: "noodleShop", nameKey: "town.noodleShop", xpCost: 700 },
  { id: "gardenPavilion", nameKey: "town.gardenPavilion", xpCost: 1200 },
  { id: "lanternStreet", nameKey: "town.lanternStreet", xpCost: 1800 },
  { id: "riversideWalk", nameKey: "town.riversideWalk", xpCost: 2500 },
  { id: "buddhistStatue", nameKey: "town.buddhistStatue", xpCost: 3300 },
  { id: "mountainPagoda", nameKey: "town.mountainPagoda", xpCost: 4200 },
  { id: "marketSquare", nameKey: "town.marketSquare", xpCost: 5200 },
  { id: "grandPalace", nameKey: "town.grandPalace", xpCost: 6500 },
]

const TOWN_KEY = "navia.town.v1"

export function MyTown() {
  const { paper } = useTheme()
  const t = useT()
  const router = useRouter()
  const { column } = useContentLayout()
  const columnWidth = column

  const progressQ = useQuery({ queryKey: ["progress"], queryFn: progress.get })
  const xp = progressQ.data?.xp ?? 0
  const unlocked = useTownState(xp)

  const next = BUILDINGS.find((b) => !unlocked.includes(b.id))
  const level = useMemo(
    () => BUILDINGS.filter((b) => unlocked.includes(b.id)).length,
    [unlocked]
  )
  const progressToNext =
    next && next.xpCost > 0 ? Math.min(1, xp / next.xpCost) : 1

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
        <Pressable
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(tabs)" as never)
          }
        >
          <Text
            style={[
              paperType.link,
              { color: paper.inkSoft, fontFamily: families.nunitoBold },
            ]}
          >
            ← {t("common.back")}
          </Text>
        </Pressable>
        <Text
          style={[
            paperType.statLabel,
            { color: paper.inkMuted, fontFamily: families.nunitoSemiBold },
          ]}
        >
          {t("town.level", { n: level })}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: 40,
          flexGrow: 1,
          alignItems: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: columnWidth, padding: 20, gap: 16 }}>
          <PaperCard tone="word">
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Shifu pose="rest" size={72} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={[
                    paperType.statValue,
                    {
                      color: paper.greenDark,
                      fontFamily: families.nunitoExtraBold,
                    },
                  ]}
                >
                  {xp} {t("home.xp")}
                </Text>
                {!!next ? (
                  <Text
                    style={[
                      paperType.statLabel,
                      {
                        color: paper.inkMuted,
                        fontFamily: families.nunitoSemiBold,
                      },
                    ]}
                  >
                    {t("town.next", { n: next.xpCost - xp })}
                  </Text>
                ) : (
                  <Text
                    style={[
                      paperType.statLabel,
                      {
                        color: paper.inkMuted,
                        fontFamily: families.nunitoSemiBold,
                      },
                    ]}
                  >
                    {t("town.complete")}
                  </Text>
                )}
              </View>
            </View>
            {!!next ? (
              <ProgressBar
                value={progressToNext}
                height={3}
                tint={paper.green}
              />
            ) : null}
          </PaperCard>

          {BUILDINGS.map((b) => {
            const isUnlocked = unlocked.includes(b.id)
            const isNext = next?.id === b.id
            return (
              <Pressable
                key={b.id}
                onPress={() => {
                  if (isUnlocked || !isNext) return
                  tap()
                  thud()
                  playSound("fanfare")
                  unlockBuilding(b.id)
                }}
              >
                <PaperCard
                  tone={isUnlocked ? "week" : isNext ? "challenge" : "plain"}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 12,
                        backgroundColor: isUnlocked
                          ? paper.surface.week.fill
                          : paper.cardAlt,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: isUnlocked ? 1 : isNext ? 0.75 : 0.35,
                      }}
                    >
                      <Text style={{ fontSize: 28 }}>
                        {isUnlocked ? "🏮" : isNext ? "🔓" : "·"}
                      </Text>
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text
                        style={[
                          paperType.cardBody,
                          {
                            color: isUnlocked ? paper.ink : paper.inkMuted,
                            fontFamily: families.nunitoExtraBold,
                          },
                        ]}
                      >
                        {t(b.nameKey)}
                      </Text>
                      <Text
                        style={[
                          paperType.statLabel,
                          {
                            color: paper.inkMuted,
                            fontFamily: families.nunitoSemiBold,
                          },
                        ]}
                      >
                        {isUnlocked
                          ? t("town.built")
                          : isNext
                            ? t("town.unlock")
                            : t("town.locked")}
                      </Text>
                    </View>
                  </View>
                </PaperCard>
              </Pressable>
            )
          })}

          {next ? (
            <LiftedFace
              title={
                next.xpCost > xp
                  ? t("town.need", { n: next.xpCost - xp })
                  : t("town.unlock")
              }
              face={paper.green}
              disabled={next.xpCost > xp}
              onPress={() => {
                careful()
              }}
            />
          ) : null}

          <FlexGap min={0} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

/**
 * Which buildings are standing.
 *
 * Derived from XP on every load, then unioned with anything explicitly unlocked
 * in this install — so a learner who reaches a threshold keeps the building even
 * if a future XP recalculation (a data correction, a different track) would not
 * reproduce it.
 */
function useTownState(xp: number): string[] {
  const [manual, setManual] = useState<string[]>([])
  const derived = useMemo(
    () => BUILDINGS.filter((b) => b.xpCost <= xp).map((b) => b.id),
    [xp]
  )
  useEffect(() => {
    let cancelled = false
    storage
      .getItem(TOWN_KEY)
      .then((raw: string | null) => {
        if (cancelled || !raw) return
        setManual(JSON.parse(raw) as string[])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  return useMemo(() => [...new Set([...derived, ...manual])], [derived, manual])
}

function unlockBuilding(id: string) {
  storage
    .getItem(TOWN_KEY)
    .then((raw: string | null) => {
      const list = raw ? (JSON.parse(raw) as string[]) : []
      const next = [...new Set([...list, id])]
      return storage.setItem(TOWN_KEY, JSON.stringify(next))
    })
    .catch(() => {})
}
