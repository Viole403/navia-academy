import { useState } from "react"
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { EmptyState } from "@/components/ui/EmptyState"
import { Input } from "@/components/ui/Input"
import { Motif } from "@/components/ui/Motif"
import { LiftedFace, PaperCard } from "@/components/study/PaperCard"
import { PressableScale } from "@/components/study/press"
import { useContentLayout } from "@/theme/layout"
import { useTheme } from "@/theme/ThemeProvider"
import { paperType, families } from "@/theme/paperType"
import { tasks } from "@/api/endpoints"
import type { StudyTask } from "@/types/api"
import { motifChar } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useGeneratedTasks } from "@/hooks/useGeneratedTasks"
import { useT } from "@/i18n"
import { tap } from "@/utils/feedback"

/**
 * /tasks — a plain list of things you meant to do (web parity: /tasks).
 *
 * Full CRUD on the existing `tasks.*` endpoints. **The tick is a circle, not the
 * word "Done".** A task is something you decide is finished in a glance, and the
 * old row made that decision by reading two words rather than seeing a mark;
 * the circle fills and takes a tick, which is the same information a checkbox
 * has always carried and costs no reading at all.
 *
 * Deleting is a word, not a gesture, and it confirms. A swipe-to-delete is a
 * nice interaction right up until someone swipes away the wrong row.
 *
 * Completed tasks stay at the foot, dimmed. Hiding them would make the list feel
 * like it was clearing itself, and a task you did yesterday is still evidence.
 */
export function Tasks() {
  const { paper } = useTheme()
  const { column: columnWidth } = useContentLayout()
  const t = useT()
  const qc = useQueryClient()
  const router = useRouter()
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

  // Suggested work, derived from due cards, exam history and today's minutes.
  // Hand-entered rows are not passed in as existing: they carry no route, and a
  // task typed by hand has no business suppressing a due review.
  const suggested = useGeneratedTasks([])

  const confirmRemove = (id: string, content: string) =>
    Alert.alert(t("profile.delete"), content, [
      { text: t("profile.cancel"), style: "cancel" },
      {
        text: t("profile.delete"),
        style: "destructive",
        onPress: () => removeM.mutate(id),
      },
    ])

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: paper.paper }}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={{
          width: "100%",
          maxWidth: columnWidth,
          alignSelf: "center",
          padding: 20,
          paddingBottom: 48,
          gap: 22,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={[paperType.label, { color: paper.inkMuted }]}>
              {t("tasks.kicker")}
            </Text>
            <Text
              style={[
                paperType.greeting,
                { color: paper.ink, fontSize: 30, lineHeight: 34 },
              ]}
            >
              {t("tasks.title")}
            </Text>
          </View>
          <Motif char={motifChar(language)} size={56} />
        </View>
        <View style={{ height: 1, backgroundColor: paper.line }} />

        {suggested.length > 0 && (
          <View style={{ gap: 10 }}>
            <Text style={[paperType.label, { color: paper.inkMuted }]}>
              {t("tasks.suggested")}
            </Text>
            <PaperCard padded={false}>
              {suggested.map((task, i) => (
                <SuggestedRow
                  key={task.id}
                  task={task}
                  first={i === 0}
                  onPress={() => {
                    tap()
                    if (task.linkedRoute) router.push(task.linkedRoute as never)
                  }}
                />
              ))}
            </PaperCard>
          </View>
        )}

        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Input
              placeholder={t("tasks.addPh")}
              value={draft}
              onChangeText={setDraft}
              autoCorrect={false}
            />
          </View>
          <LiftedFace
            small
            title={t("common.add")}
            face={paper.green}
            disabled={!draft.trim() || createM.isPending}
            onPress={() => {
              if (draft.trim()) {
                tap()
                createM.mutate()
              }
            }}
          />
        </View>

        {listQ.isLoading ? (
          <PaperCard tone="review" style={{ alignItems: "center" }}>
            <ActivityIndicator color={paper.green} />
          </PaperCard>
        ) : listQ.isError ? (
          <View style={{ gap: 16 }}>
            <EmptyState
              title={t("lib.failedTitle")}
              message={t("common.loadFailed")}
              glyph={motifChar(language)}
            />
            <LiftedFace
              title={t("common.retry")}
              face={paper.green}
              onPress={() => listQ.refetch()}
            />
          </View>
        ) : items.length === 0 ? (
          <EmptyState
            title={t("tasks.empty")}
            message={t("tasks.emptyMsg")}
            glyph={motifChar(language)}
          />
        ) : (
          <>
            {open.length > 0 && (
              <PaperCard padded={false}>
                {open.map((x, i) => (
                  <TaskRow
                    key={x.id}
                    content={x.content}
                    first={i === 0}
                    completed={false}
                    onToggle={() =>
                      toggleM.mutate({ id: x.id, completed: true })
                    }
                    onDelete={() => confirmRemove(x.id, x.content)}
                  />
                ))}
              </PaperCard>
            )}
            {done.length > 0 && (
              <View style={{ gap: 10 }}>
                <Text style={[paperType.label, { color: paper.inkMuted }]}>
                  {t("profile.done")}
                </Text>
                <PaperCard padded={false}>
                  {done.map((x, i) => (
                    <TaskRow
                      key={x.id}
                      content={x.content}
                      first={i === 0}
                      completed
                      onToggle={() =>
                        toggleM.mutate({ id: x.id, completed: false })
                      }
                      onDelete={() => confirmRemove(x.id, x.content)}
                    />
                  ))}
                </PaperCard>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function TaskRow({
  content,
  first,
  completed,
  onToggle,
  onDelete,
}: {
  content: string
  first: boolean
  completed: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  const { paper } = useTheme()
  const t = useT()
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 13,
        paddingHorizontal: 16,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: paper.lineSoft,
      }}
    >
      <PressableScale
        onPress={onToggle}
        accessibilityLabel={`${content} — ${t("profile.done")}`}
      >
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            borderWidth: 1.5,
            borderColor: completed ? paper.green : paper.track,
            backgroundColor: completed ? paper.green : "transparent",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {completed && (
            <Text
              style={{
                color: paper.card,
                fontFamily: families.nunitoBold,
                fontSize: 13,
              }}
            >
              ✓
            </Text>
          )}
        </View>
      </PressableScale>

      <Text
        style={[
          paperType.body,
          {
            flex: 1,
            color: completed ? paper.inkMuted : paper.ink,
            textDecorationLine: completed ? "line-through" : "none",
          },
        ]}
      >
        {content}
      </Text>

      <PressableScale
        onPress={onDelete}
        accessibilityLabel={t("profile.delete")}
      >
        <Text style={[paperType.link, { color: paper.coral }]}>
          {t("profile.delete")}
        </Text>
      </PressableScale>
    </View>
  )
}

/**
 * A suggestion, not a to-do. It is derived state rather than a row the learner
 * owns, so it has no checkbox and no delete — clearing the underlying work (a
 * review, an exam) is what makes it go away. Tapping it opens the screen where
 * that work happens.
 */
function SuggestedRow({
  task,
  first,
  onPress,
}: {
  task: StudyTask
  first: boolean
  onPress: () => void
}) {
  const { paper } = useTheme()
  const t = useT()
  const accent =
    task.priority === "high"
      ? paper.coral
      : task.priority === "medium"
        ? paper.greenDark
        : paper.inkMuted

  return (
    <View
      style={{
        borderTopWidth: first ? 0 : 1,
        borderTopColor: paper.lineSoft,
      }}
    >
      <PressableScale
        onPress={onPress}
        scale={0.995}
        accessibilityLabel={task.title}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 13,
          paddingHorizontal: 14,
        }}
      >
        <View
          style={{ width: 3, alignSelf: "stretch", backgroundColor: accent }}
        />
        <View style={{ flex: 1, gap: 3 }}>
          <Text
            style={[paperType.cardTitleSm, { color: paper.ink }]}
            numberOfLines={2}
          >
            {task.title}
          </Text>
          <Text
            style={[paperType.note, { color: paper.inkMuted }]}
            numberOfLines={2}
          >
            {task.description}
          </Text>
          <Text style={[paperType.statLabel, { color: accent }]}>
            {t("tasks.minutes", { n: task.estimatedMin })}
          </Text>
        </View>
        <Text
          style={{
            fontFamily: families.lora,
            fontSize: 17,
            color: paper.inkMuted,
          }}
        >
          ›
        </Text>
      </PressableScale>
    </View>
  )
}
