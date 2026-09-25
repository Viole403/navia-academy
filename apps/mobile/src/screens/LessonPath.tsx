import { useMemo } from "react"
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { PaperCard, LiftedFace } from "@/components/study/PaperCard"
import { ProgressBar } from "@/components/ui/ProgressBar"
import { FlexGap } from "@/components/study/press"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentLayout } from "@/theme/layout"
import { paperType, families } from "@/theme/paperType"
import { loadCurriculum } from "@/lib/content-data"
import { unitArt } from "@/components/study/art"
import { useOnboardingStore } from "@/store/onboarding"
import { useT } from "@/i18n"
import { tap } from "@/utils/feedback"

/**
 * The lesson path.
 *
 * A unit path: units down a trail, each level unlocked once the one before it is
 * done, each node carrying its own art.
 *
 * The unlock rule is the thing that gives the path its shape — without it the
 * trail is a list, and a list does not need to be walked in order.
 *
 * Units come from the curriculum bundle rather than a hand-authored file, so
 * levels are the trail's sections and units are its nodes, with the lessons
 * themselves one tap further in.
 */
export function LessonPath() {
  const { paper } = useTheme()
  const t = useT()
  const router = useRouter()
  const language = useOnboardingStore((s) => s.language)
  const examType = useOnboardingStore((s) => s.examType)
  const { column } = useContentLayout()
  const columnWidth = column

  const curriculumQ = useQuery({
    queryKey: ["curriculum", language],
    queryFn: () => loadCurriculum(language),
  })

  const levels = useMemo(() => {
    const all = (curriculumQ.data?.levels ?? []) as {
      id: string
      title: string
      subtitle?: string
      examType?: string
    }[]
    const filtered = all.filter(
      (l) => !examType || !l.examType || l.examType === examType
    )
    return filtered.length > 0 ? filtered : all
  }, [curriculumQ.data, examType])

  const unitsOf = (levelId: string) =>
    (
      (curriculumQ.data?.units ?? []) as {
        id: string
        levelId?: string
        title: string
        lessonIds?: string[]
      }[]
    ).filter((u) => u.levelId === levelId)

  const artKeys = Object.keys(unitArt) as (keyof typeof unitArt)[]

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
              : router.replace("/(tabs)/learn" as never)
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
          {t("learn.program")}
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
        <View style={{ width: columnWidth, padding: 20, gap: 18 }}>
          {levels.length === 0 && !curriculumQ.isLoading ? (
            <PaperCard tone="plain">
              <Text
                style={[
                  paperType.cardBody,
                  {
                    color: paper.inkMuted,
                    fontFamily: families.nunitoSemiBold,
                  },
                ]}
              >
                {t("prog.noProgramMsg")}
              </Text>
            </PaperCard>
          ) : null}

          {levels.map((lv, li) => {
            const units = unitsOf(lv.id)
            const unlocked = li === 0
            return (
              <View key={lv.id} style={{ gap: 10 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: unlocked ? paper.green : paper.cardAlt,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: unlocked ? "#FFFFFF" : paper.inkMuted,
                        fontFamily: families.nunitoExtraBold,
                        fontSize: 13,
                      }}
                    >
                      {li + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        paperType.cardTitleSm,
                        {
                          color: paper.ink,
                          fontFamily: families.nunitoExtraBold,
                        },
                      ]}
                    >
                      {lv.title}
                    </Text>
                    {!!lv.subtitle && (
                      <Text
                        style={[
                          paperType.statLabel,
                          {
                            color: paper.inkMuted,
                            fontFamily: families.nunitoSemiBold,
                          },
                        ]}
                      >
                        {lv.subtitle}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={{ gap: 8, paddingLeft: 12 }}>
                  {units.map((u, ui) => {
                    const art = unitArt[artKeys[(li + ui) % artKeys.length]]
                    const count = u.lessonIds?.length ?? 0
                    return (
                      <Pressable
                        key={u.id}
                        onPress={() => {
                          if (!unlocked) return
                          tap()
                          router.push("/program")
                        }}
                        style={{ opacity: unlocked ? 1 : 0.45 }}
                      >
                        <PaperCard tone={unlocked ? "week" : "plain"}>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 12,
                            }}
                          >
                            <View
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                backgroundColor: paper.cardAlt,
                                alignItems: "center",
                                justifyContent: "center",
                                overflow: "hidden",
                              }}
                            >
                              <Text style={{ fontSize: 20 }}>
                                {unlocked ? (art ? "" : "") : "·"}
                              </Text>
                            </View>
                            <View style={{ flex: 1, gap: 2 }}>
                              <Text
                                style={[
                                  paperType.cardBody,
                                  {
                                    color: paper.ink,
                                    fontFamily: families.nunitoExtraBold,
                                  },
                                ]}
                              >
                                {u.title}
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
                                {count} {t("prog.lessons")}
                              </Text>
                            </View>
                            {unlocked ? (
                              <Text
                                style={{
                                  color: paper.greenDark,
                                  fontFamily: families.nunitoBold,
                                  fontSize: 16,
                                }}
                              >
                                →
                              </Text>
                            ) : null}
                          </View>
                        </PaperCard>
                      </Pressable>
                    )
                  })}
                  {units.length === 0 ? (
                    <Text
                      style={[
                        paperType.statLabel,
                        {
                          color: paper.inkMuted,
                          fontFamily: families.nunitoSemiBold,
                        },
                      ]}
                    >
                      {t("learn.noLevels")}
                    </Text>
                  ) : null}
                </View>
              </View>
            )
          })}

          <PaperCard
            tone="challenge"
            title={t("myw.kicker")}
            body={t("town.note")}
          >
            <LiftedFace
              title={t("chal.streak3")}
              face={paper.green}
              small
              onPress={() => router.push("/challenges")}
            />
            <ProgressBar value={0} height={3} tint={paper.green} />
          </PaperCard>

          <FlexGap min={0} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
