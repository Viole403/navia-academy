import { useMemo, useState } from "react"
import { ActivityIndicator, ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useQuery } from "@tanstack/react-query"
import { EmptyState } from "@/components/ui/EmptyState"
import { Motif } from "@/components/ui/Motif"
import { LiftedFace, PaperCard } from "@/components/study/PaperCard"
import { PressableScale } from "@/components/study/press"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentLayout } from "@/theme/layout"
import { families, paperType } from "@/theme/paperType"
import { loadCurriculum } from "@/lib/content-data"
import { examDisplayName, motifChar } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useT } from "@/i18n"
import { useRouter } from "expo-router"

interface Level {
  id: string
  examType?: string
  title: string
  subtitle?: string
  description?: string
}

interface Unit {
  id: string
  levelId?: string
  order?: number
  title: string
  subtitle?: string
  lessonIds?: string[]
}

interface LessonStep {
  id: string
  type?: string
  title?: string
  body?: string[]
}

interface Lesson {
  id: string
  unitId?: string
  order?: number
  title: string
  subtitle?: string
  durationMin?: number
  xp?: number
  steps?: LessonStep[]
}

/** One row in an accordion: the chevron turns, the label stays. */
function AccordionRow({
  title,
  meta,
  open,
  onPress,
  indent = 0,
  children,
}: {
  title: string
  meta?: string
  open: boolean
  onPress: () => void
  indent?: number
  children?: React.ReactNode
}) {
  const { paper } = useTheme()
  return (
    <View>
      <PressableScale
        onPress={onPress}
        scale={0.995}
        accessibilityLabel={title}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 13,
          paddingLeft: 14 + indent * 16,
          paddingRight: 14,
          borderTopWidth: 1,
          borderTopColor: paper.lineSoft,
        }}
      >
        <View style={{ flex: 1, gap: 3 }}>
          <Text
            style={[paperType.cardTitleSm, { color: paper.ink }]}
            numberOfLines={2}
          >
            {title}
          </Text>
          {!!meta && (
            <Text style={[paperType.note, { color: paper.inkMuted }]}>
              {meta}
            </Text>
          )}
        </View>
        <Text
          style={{
            fontFamily: families.lora,
            fontSize: 17,
            color: open ? paper.green : paper.inkMuted,
          }}
        >
          {open ? "▾" : "›"}
        </Text>
      </PressableScale>
      {open && !!children && (
        <View
          style={{
            paddingLeft: 14 + (indent + 1) * 16,
            paddingRight: 16,
            paddingBottom: 14,
            gap: 12,
          }}
        >
          {children}
        </View>
      )}
    </View>
  )
}

export default function ProgramScreen() {
  const { paper } = useTheme()
  const { column } = useContentLayout()
  const t = useT()
  const language = useOnboardingStore((s) => s.language)
  const storedExamType = useOnboardingStore((s) => s.examType)
  const router = useRouter()

  const [openLevel, setOpenLevel] = useState<string | null>(null)
  const [openUnit, setOpenUnit] = useState<string | null>(null)
  const [openLesson, setOpenLesson] = useState<string | null>(null)

  const curriculumQ = useQuery({
    queryKey: ["curriculum", language],
    queryFn: () => loadCurriculum(language),
  })

  const levels = useMemo(() => {
    const all = ((curriculumQ.data?.levels ?? []) as Level[]).filter(
      (l) => !storedExamType || !l.examType || l.examType === storedExamType
    )
    return all
  }, [curriculumQ.data, storedExamType])

  const unitsOf = (levelId: string) =>
    ((curriculumQ.data?.units ?? []) as Unit[])
      .filter((u) => u.levelId === levelId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const lessonsOf = (unit: Unit) => {
    const all = (curriculumQ.data?.lessons ?? []) as Lesson[]
    if (unit.lessonIds?.length)
      return unit.lessonIds
        .map((id) => all.find((l) => l.id === id))
        .filter((l): l is Lesson => !!l)
    return all
      .filter((l) => l.unitId === unit.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }

  // A failed fetch and an empty track are different facts, and the learner acts
  // on the difference: one is worth retrying, the other means wait. Collapsing
  // both into "no program yet" told someone whose CDN was down that their
  // language had no curriculum.
  if (curriculumQ.isError) {
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
          <Masthead title={t("prog.failedTitle")} />
          <EmptyState
            glyph="∅"
            title={t("prog.failedTitle")}
            message={t("prog.failedMsg")}
          />
          <LiftedFace
            title={t("common.retry")}
            face={paper.green}
            onPress={() => curriculumQ.refetch()}
            disabled={curriculumQ.isFetching}
          />
        </ScrollView>
      </SafeAreaView>
    )
  }

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
        <Masthead
          title={
            storedExamType
              ? examDisplayName(storedExamType)
              : t("prog.studyPath")
          }
        />

        {curriculumQ.isLoading ? (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <ActivityIndicator color={paper.green} />
          </View>
        ) : levels.length === 0 ? (
          <EmptyState
            title={t("prog.noProgram")}
            message={t("prog.noProgramMsg")}
            glyph={motifChar(language)}
          />
        ) : (
          levels.map((lv) => {
            const open = openLevel === lv.id
            const units = open ? unitsOf(lv.id) : []
            return (
              <PaperCard key={lv.id} padded={false}>
                <AccordionRow
                  title={lv.title}
                  meta={
                    open
                      ? undefined
                      : (lv.subtitle ?? lv.description ?? undefined)
                  }
                  open={open}
                  onPress={() => {
                    setOpenLevel(open ? null : lv.id)
                    setOpenUnit(null)
                    setOpenLesson(null)
                  }}
                />
                {open &&
                  units.map((u) => {
                    const uOpen = openUnit === u.id
                    const lessons = uOpen ? lessonsOf(u) : []
                    return (
                      <AccordionRow
                        key={u.id}
                        title={`${u.order ? `${u.order}. ` : ""}${u.title}`}
                        meta={
                          [
                            u.subtitle,
                            `${u.lessonIds?.length ?? lessons.length} ${t(
                              "prog.lessons"
                            )}`,
                          ]
                            .filter(Boolean)
                            .join(" · ") || undefined
                        }
                        open={uOpen}
                        indent={1}
                        onPress={() => {
                          setOpenUnit(uOpen ? null : u.id)
                          setOpenLesson(null)
                        }}
                      >
                        {lessons.map((l) => {
                          const lOpen = openLesson === l.id
                          return (
                            <AccordionRow
                              key={l.id}
                              title={l.title}
                              meta={`${l.durationMin ?? 10} ${t(
                                "journey.minAbbrev"
                              )} · ${l.xp ?? 20} XP`}
                              open={lOpen}
                              indent={2}
                              onPress={() => setOpenLesson(lOpen ? null : l.id)}
                            >
                              {(l.steps ?? []).map((s, si) => (
                                <View key={si} style={{ gap: 4 }}>
                                  {!!s && (
                                    <Text
                                      style={[
                                        paperType.label,
                                        { color: paper.greenDark },
                                      ]}
                                    >
                                      {s.title}
                                    </Text>
                                  )}
                                  {
                                    !!s?.body?.map((p, i) => (
                                      <Text
                                        key={i}
                                        style={[
                                          paperType.bodySm,
                                          { color: paper.inkSoft },
                                        ]}
                                      >
                                        {p}
                                      </Text>
                                    ))
                                  }
                                </View>
                              ))}
                              <LiftedFace
                                title={t("lesson.open")}
                                face={paper.green}
                                small
                                onPress={() =>
                                  router.push({
                                    pathname: "/lesson/[id]",
                                    params: { id: l.id },
                                  })
                                }
                              />
                            </AccordionRow>
                          )
                        })}
                      </AccordionRow>
                    )
                  })}
              </PaperCard>
            )
          })
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function Masthead({ title }: { title: string }) {
  const { paper } = useTheme()
  const language = useOnboardingStore((s) => s.language)
  const t = useT()
  return (
    <>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={[paperType.label, { color: paper.inkMuted }]}>
            {t("prog.kicker")}
          </Text>
          <Text
            style={[
              paperType.greeting,
              { color: paper.ink, fontSize: 30, lineHeight: 34 },
            ]}
          >
            {title}
          </Text>
        </View>
        <Motif char={motifChar(language)} size={56} />
      </View>
      <View style={{ height: 1, backgroundColor: paper.line }} />
    </>
  )
}
