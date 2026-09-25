import { useState } from "react"
import { ActivityIndicator, Pressable, Text, View } from "react-native"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Screen } from "@/components/ui/Screen"
import { EmptyState } from "@/components/ui/EmptyState"
import { Input } from "@/components/ui/Input"
import { StudyCard, SectionHeader } from "@/components/study/StudyCard"
import { LiftedButton } from "@/components/study/LiftedButton"
import { spacing, studyType } from "@/components/study/tokens"
import { useContentLayout } from "@/theme/layout"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts } from "@/theme/typography"
import { tasks } from "@/api/endpoints"
import { motifChar } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useT } from "@/i18n"
import { tap } from "@/utils/feedback"

/**
 * /tasks — task planner (web parity: /tasks). Full CRUD on the existing
 * tasks.* endpoints; challenge-style states (open → done, done stays
 * visible at the foot like claimed challenges).
 */
export function Tasks() {
  const { theme } = useTheme()
  const { column: columnWidth } = useContentLayout()
  const t = useT()
  const qc = useQueryClient()
  const language = useOnboardingStore((s) => s.language)
  const [draft, setDraft] = useState("")

  const listQ = useQuery({ queryKey: ["tasks"], queryFn: tasks.list })
  const invalidate = () => qc.invalidateQueries({ queryKey: ["tasks"] })

  const createM = useMutation({
    mutationFn: () => tasks.create(draft.trim()),
    onSuccess: () => {
      setDraft("")
      invalidate()
    },
  })
  const toggleM = useMutation({
    mutationFn: (args: { id: string; completed: boolean }) =>
      tasks.update(args.id, { completed: args.completed }),
    onSuccess: invalidate,
  })
  const removeM = useMutation({
    mutationFn: (id: string) => tasks.remove(id),
    onSuccess: invalidate,
  })

  const items = listQ.data ?? []
  const open = items.filter((x) => !x.completed)
  const done = items.filter((x) => x.completed)

  return (
    <Screen>
      <View
        style={{
          width: "100%",
          maxWidth: columnWidth,
          alignSelf: "center",
          gap: spacing.lg,
        }}
      >
        <SectionHeader kicker={t("tasks.kicker")} title={t("tasks.title")} />
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Input
              placeholder={t("tasks.addPh")}
              value={draft}
              onChangeText={setDraft}
              autoCorrect={false}
            />
          </View>
          <LiftedButton
            small
            title={t("common.add")}
            onPress={() => {
              if (draft.trim()) {
                tap()
                createM.mutate()
              }
            }}
          />
        </View>
        {listQ.isLoading ? (
          <ActivityIndicator color={theme.accent} />
        ) : items.length === 0 ? (
          <EmptyState
            title={t("tasks.empty")}
            message={t("tasks.emptyMsg")}
            glyph={motifChar(language)}
          />
        ) : (
          <>
            {open.map((x) => (
              <StudyCard key={x.id} tone="challenge" title={x.content}>
                <View style={{ flexDirection: "row", gap: spacing.lg }}>
                  <Pressable
                    onPress={() =>
                      toggleM.mutate({ id: x.id, completed: true })
                    }
                  >
                    <Text
                      style={[
                        studyType.link,
                        {
                          color: theme.green,
                          fontFamily: fonts.sans,
                          fontWeight: "700",
                        },
                      ]}
                    >
                      {t("profile.done")} ✓
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => removeM.mutate(x.id)}>
                    <Text
                      style={[
                        studyType.link,
                        {
                          color: theme.red,
                          fontFamily: fonts.sans,
                          fontWeight: "700",
                        },
                      ]}
                    >
                      {t("profile.delete")}
                    </Text>
                  </Pressable>
                </View>
              </StudyCard>
            ))}
            {done.map((x) => (
              <StudyCard
                key={x.id}
                tone="week"
                title={x.content}
                tag={t("profile.done").toUpperCase()}
              >
                <View style={{ flexDirection: "row", gap: spacing.lg }}>
                  <Pressable
                    onPress={() =>
                      toggleM.mutate({ id: x.id, completed: false })
                    }
                  >
                    <Text
                      style={[
                        studyType.link,
                        {
                          color: theme.textMuted,
                          fontFamily: fonts.sans,
                          fontWeight: "700",
                        },
                      ]}
                    >
                      {t("common.retry")}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => removeM.mutate(x.id)}>
                    <Text
                      style={[
                        studyType.link,
                        {
                          color: theme.red,
                          fontFamily: fonts.sans,
                          fontWeight: "700",
                        },
                      ]}
                    >
                      {t("profile.delete")}
                    </Text>
                  </Pressable>
                </View>
              </StudyCard>
            ))}
          </>
        )}
      </View>
    </Screen>
  )
}
