import { useMemo, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/Button"
import { EmptyState } from "@/components/ui/EmptyState"
import { Enter } from "@/components/ui/Enter"
import { useTheme } from "@/theme/ThemeProvider"
import { type } from "@/theme/typography"
import { loadCurriculum } from "@/lib/content-data"
import { examDisplayName, motifChar } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { logStudyWithQueue } from "@/utils/offlineQueue"

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

export default function ProgramScreen() {
  const { theme } = useTheme()
  const language = useOnboardingStore((s) => s.language)
  const storedExamType = useOnboardingStore((s) => s.examType)
  const qc = useQueryClient()

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

  const doneM = useMutation({
    mutationFn: (lesson: Lesson) =>
      logStudyWithQueue(lesson.durationMin ?? 10, lesson.xp ?? 20),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["progress"] }),
  })

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={["top"]}
    >
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
        <Enter index={0}>
          <View style={{ gap: 4 }}>
            <Text style={[type.labelSm, { color: theme.textMuted }]}>
              Program
            </Text>
            <Text style={[type.display, { color: theme.text, fontSize: 32 }]}>
              {storedExamType ? examDisplayName(storedExamType) : "Study path"}
            </Text>
          </View>
        </Enter>

        {curriculumQ.isLoading ? (
          <ActivityIndicator color={theme.accent} />
        ) : levels.length === 0 ? (
          <EmptyState
            title="No program for this track yet"
            message="Curriculum content is still being published."
            glyph={motifChar(language)}
          />
        ) : (
          levels.map((lv, li) => {
            const open = openLevel === lv.id
            const units = open ? unitsOf(lv.id) : []
            return (
              <Enter key={lv.id} index={Math.min(li + 1, 8)}>
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 4,
                    backgroundColor: theme.surface,
                    overflow: "hidden",
                  }}
                >
                  <Pressable
                    onPress={() => {
                      setOpenLevel(open ? null : lv.id)
                      setOpenUnit(null)
                      setOpenLesson(null)
                    }}
                    style={{ padding: 16, gap: 4 }}
                  >
                    <Text
                      style={[
                        type.body,
                        { color: theme.text, fontWeight: "700" },
                      ]}
                    >
                      {lv.title}
                    </Text>
                    {!!lv.subtitle && (
                      <Text style={[type.bodySm, { color: theme.accent }]}>
                        {lv.subtitle}
                      </Text>
                    )}
                    {!!lv.description && !open && (
                      <Text
                        style={[type.caption, { color: theme.textMuted }]}
                        numberOfLines={2}
                      >
                        {lv.description}
                      </Text>
                    )}
                  </Pressable>
                  {open &&
                    units.map((u) => {
                      const uOpen = openUnit === u.id
                      const lessons = uOpen ? lessonsOf(u) : []
                      return (
                        <View
                          key={u.id}
                          style={{
                            borderTopWidth: 1,
                            borderTopColor: theme.border,
                            paddingLeft: 16,
                          }}
                        >
                          <Pressable
                            onPress={() => {
                              setOpenUnit(uOpen ? null : u.id)
                              setOpenLesson(null)
                            }}
                            style={{ paddingVertical: 12, paddingRight: 16 }}
                          >
                            <Text
                              style={[
                                type.bodySm,
                                { color: theme.text, fontWeight: "600" },
                              ]}
                            >
                              {u.order ? `${u.order}. ` : ""}
                              {u.title}
                            </Text>
                            {!!u.subtitle && (
                              <Text
                                style={[
                                  type.caption,
                                  { color: theme.textMuted },
                                ]}
                              >
                                {u.subtitle} · {u.lessonIds?.length ?? 0}{" "}
                                lessons
                              </Text>
                            )}
                          </Pressable>
                          {uOpen &&
                            lessons.map((l) => {
                              const lOpen = openLesson === l.id
                              return (
                                <View
                                  key={l.id}
                                  style={{
                                    borderTopWidth: 1,
                                    borderTopColor: theme.borderSoft,
                                    paddingVertical: 10,
                                    paddingRight: 16,
                                    gap: 6,
                                  }}
                                >
                                  <Pressable
                                    onPress={() =>
                                      setOpenLesson(lOpen ? null : l.id)
                                    }
                                  >
                                    <Text
                                      style={[
                                        type.bodySm,
                                        { color: theme.text },
                                      ]}
                                    >
                                      {l.title}
                                    </Text>
                                    <Text
                                      style={[
                                        type.caption,
                                        { color: theme.textMuted },
                                      ]}
                                    >
                                      {l.durationMin ?? 10} min · {l.xp ?? 20}{" "}
                                      XP
                                    </Text>
                                  </Pressable>
                                  {lOpen && (
                                    <View style={{ gap: 10, paddingTop: 4 }}>
                                      {(l.steps ?? []).map((s) => (
                                        <View key={s.id} style={{ gap: 4 }}>
                                          {!!s.title && (
                                            <Text
                                              style={[
                                                type.labelSm,
                                                { color: theme.accent },
                                              ]}
                                            >
                                              {s.title}
                                            </Text>
                                          )}
                                          {(s.body ?? []).map((p, i) => (
                                            <Text
                                              key={i}
                                              style={[
                                                type.bodySm,
                                                { color: theme.textMuted },
                                              ]}
                                            >
                                              {p}
                                            </Text>
                                          ))}
                                        </View>
                                      ))}
                                      <Button
                                        title={
                                          doneM.isPending
                                            ? "Saving…"
                                            : "Mark complete"
                                        }
                                        size="sm"
                                        disabled={doneM.isPending}
                                        onPress={() => doneM.mutate(l)}
                                      />
                                    </View>
                                  )}
                                </View>
                              )
                            })}
                        </View>
                      )
                    })}
                </View>
              </Enter>
            )
          })
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
