import { useState } from "react"
import { Ionicons } from "@expo/vector-icons"
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  Switch,
  Text,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { SegmentedControl } from "@/components/ui/SegmentedControl"
import { ThemeSwatch } from "@/components/ui/ThemeSwatch"
import { EmptyState } from "@/components/ui/EmptyState"
import { Input } from "@/components/ui/Input"
import { KeyboardSafeScroll } from "@/components/ui/KeyboardSafeScroll"
import { Motif } from "@/components/ui/Motif"
import { LiftedFace, PaperCard } from "@/components/study/PaperCard"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
import type { ThemeId, ThemeMode } from "@/theme/colors"
import { auth, community, progress, settings, tasks } from "@/api/endpoints"
import { examBadgeColor, motifChar, scriptForExam } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import {
  cancelStreakReminder,
  requestPermissions,
  scheduleDailyStreakReminder,
} from "@/utils/notifications"
import { useAuthStore } from "@/store/auth"
import { useLocaleStore, type AppLocale, useT } from "@/i18n"
import { useThemePrefs } from "@/store/theme"
import { clearTokens } from "@/utils/secure"
import type { Task } from "@/types/api"
import { useTargetLanguage } from "@/hooks/useTargetLanguage"

type Section = "profile" | "tasks"

export default function ProfileTab() {
  const { theme, paper, catalog } = useTheme()
  const t = useT()
  const router = useRouter()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)

  const { themeId, mode, setThemeId, setMode } = useThemePrefs()
  const setLocale = useLocaleStore((s) => s.setLocale)

  const language = useTargetLanguage()
  const setLanguage = useOnboardingStore((s) => s.setLanguage)
  const storedExamType = useOnboardingStore((s) => s.examType)
  const setStoredExamType = useOnboardingStore((s) => s.setExamType)
  const setScript = useOnboardingStore((s) => s.setScript)

  const PATHS = [
    {
      language: "zh",
      examType: "hsk",
      script: "simplified",
      title: "中文 · Simplified",
      sub: "HSK",
    },
    {
      language: "zh",
      examType: "tocfl",
      script: "traditional",
      title: "中文 · Traditional",
      sub: "TOCFL",
    },
    {
      language: "de",
      examType: "goethe",
      title: "Deutsch",
      sub: "Goethe-Zertifikat",
    },
    { language: "en", examType: "toefl", title: "English", sub: "TOEFL iBT" },
    { language: "ja", examType: "jlpt", title: "日本語", sub: "JLPT" },
  ] as const

  const pickPath = (p: (typeof PATHS)[number]) => {
    setLanguage(p.language)
    setStoredExamType(p.examType)
    const sc = scriptForExam(p.examType)
    if (sc) setScript(sc)
    updateSettingsM.mutate({ active_exam_type: p.examType })
  }

  const activePath = PATHS.find(
    (p) => p.language === language && p.examType === storedExamType
  )

  const [section, setSection] = useState<Section>("profile")
  const [newTask, setNewTask] = useState("")

  const settingsQ = useQuery({ queryKey: ["settings"], queryFn: settings.get })
  const progressQ = useQuery({
    queryKey: ["progress"],
    queryFn: progress.get,
    enabled: section === "profile",
  })
  const tasksQ = useQuery({
    queryKey: ["tasks"],
    queryFn: tasks.list,
    enabled: section === "tasks",
  })

  const updateSettingsM = useMutation({
    mutationFn: settings.update,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  })

  const addTaskM = useMutation({
    mutationFn: (content: string) => tasks.create(content),
    onSuccess: () => {
      setNewTask("")
      qc.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
  const toggleTaskM = useMutation({
    mutationFn: (t: Task) => tasks.update(t.id, { completed: !t.completed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  })
  const deleteTaskM = useMutation({
    mutationFn: (id: string) => tasks.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  })

  if (!user) return null

  const onSignOut = () => {
    Alert.alert(t("profile.signOutTitle"), t("profile.signOutMsg"), [
      { text: t("profile.cancel"), style: "cancel" },
      {
        text: t("profile.signOut"),
        style: "destructive",
        onPress: async () => {
          try {
            await auth.logout()
          } catch {
            // Server logout is best-effort; local tokens are cleared anyway.
          }
          await clearTokens()
          signOut()
          router.replace("/(auth)")
        },
      },
    ])
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: paper.paper }}
      edges={["top"]}
    >
      <KeyboardSafeScroll
        contentContainerStyle={{ padding: 24, gap: 28, paddingBottom: 48 }}
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
                {user.email}
              </Text>
              <Text style={[type.display, { color: theme.text, fontSize: 36 }]}>
                {user.name}
              </Text>
              {activePath && (
                <Text style={[type.bodySm, { color: theme.accent + "AA" }]}>
                  {activePath.title} · {activePath.sub}
                </Text>
              )}
            </View>
            <Motif char={motifChar(language)} size={56} />
          </View>
          <View style={{ height: 1, backgroundColor: theme.border }} />
        </View>

        {/* Settings now has its own screens; without this row the only way in
            was a link buried inside the exam-path card. */}
        <Pressable onPress={() => router.push("/settings")}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Ionicons name="settings" size={17} color={theme.textMuted} />
            <Text
              style={[
                type.body,
                { color: theme.text, flex: 1, fontWeight: "600" },
              ]}
            >
              {t("profile.settings")}
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: 18 }}>›</Text>
          </View>
        </Pressable>

        {/* Section switcher */}
        <SegmentedControl<Section>
          options={[
            { id: "profile", label: t("profile.tab") },
            { id: "tasks", label: t("profile.tasks") },
          ]}
          value={section}
          onChange={setSection}
        />

        {/* Sections */}
        {section === "profile" && (
          <View style={{ gap: 20 }}>
            <View
              style={{
                flexDirection: "row",
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: theme.border,
                paddingVertical: 20,
              }}
            >
              <MetaField
                label={t("profile.xp")}
                value={progressQ.data ? String(progressQ.data.xp) : "—"}
              />
              <MetaField
                label={t("profile.dayStreak")}
                value={progressQ.data ? String(progressQ.data.streak) : "—"}
              />
              <MetaField
                label={t("profile.bestStreak")}
                value={
                  progressQ.data ? String(progressQ.data.best_streak) : "—"
                }
              />
            </View>

            {activePath && (
              <PaperCard tone="plain">
                <View style={{ gap: 6 }}>
                  <Text style={[type.labelSm, { color: theme.textMuted }]}>
                    {t("profile.learningPath")}
                  </Text>
                  <Text
                    style={[
                      type.body,
                      { color: theme.text, fontWeight: "600" },
                    ]}
                  >
                    {activePath.title} · {activePath.sub}
                  </Text>
                  <Pressable onPress={() => router.push("/settings/learning")}>
                    <Text style={[type.bodySm, { color: theme.accent }]}>
                      {t("profile.changeSettings")}
                    </Text>
                  </Pressable>
                </View>
              </PaperCard>
            )}

            {/* Hub — deep links into the study screens */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <PaperCard
                  tone="week"
                  title={t("journey.title")}
                  onPress={() => router.push("/progress")}
                />
              </View>
              <View style={{ flex: 1 }}>
                <PaperCard
                  tone="challenge"
                  title={t("chal.title")}
                  onPress={() => router.push("/challenges")}
                />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <PaperCard
                  tone="review"
                  title={t("badges.title")}
                  onPress={() => router.push("/achievements")}
                />
              </View>
              <View style={{ flex: 1 }}>
                <PaperCard
                  tone="plain"
                  title={t("notif.title")}
                  onPress={() => router.push("/notifications")}
                />
              </View>
            </View>

            {user.role && user.role !== "student" ? (
              <View
                style={{
                  flexDirection: "row",
                  borderTopWidth: 1,
                  borderBottomWidth: 1,
                  borderColor: theme.border,
                  paddingVertical: 20,
                }}
              >
                <MetaField
                  label={t("profile.memberSince")}
                  value={new Date(user.created_at).toLocaleDateString()}
                />
                <MetaField
                  label={t("profile.role")}
                  value={user.role}
                  capitalize
                />
                <MetaField
                  label={t("profile.verified")}
                  value={
                    user.email_verified ? t("profile.yes") : t("profile.no")
                  }
                />
              </View>
            ) : null}

            <LiftedFace
              title={t("profile.signOut")}
              face={paper.coral}
              onPress={onSignOut}
            />
          </View>
        )}

        {section === "tasks" && (
          <View style={{ gap: 16 }}>
            <Pressable onPress={() => router.push("/tasks")}>
              <Text
                style={[
                  type.bodySm,
                  { color: theme.accent, fontWeight: "700" },
                ]}
              >
                {t("tasks.title")} →
              </Text>
            </Pressable>
            <View style={{ gap: 10 }}>
              <Text style={[type.labelSm, { color: theme.textMuted }]}>
                {t("profile.addTask")}
              </Text>
              <View
                style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}
              >
                <View style={{ flex: 1 }}>
                  <Input
                    placeholder={t("profile.taskHint")}
                    value={newTask}
                    onChangeText={setNewTask}
                  />
                </View>
                <LiftedFace
                  small
                  title={t("profile.add")}
                  face={theme.accent}
                  onPress={() => {
                    if (newTask.trim()) addTaskM.mutate(newTask.trim())
                  }}
                  disabled={!newTask.trim() || addTaskM.isPending}
                />
              </View>
            </View>

            <View style={{ gap: 10 }}>
              <Text style={[type.labelSm, { color: theme.textMuted }]}>
                {t("profile.open")}
              </Text>
              {tasksQ.isLoading ? (
                <ActivityIndicator color={theme.accent} />
              ) : (tasksQ.data ?? []).filter((t) => !t.completed).length ===
                0 ? (
                <EmptyState
                  title={t("profile.allClear")}
                  message={t("profile.allClearMsg")}
                  glyph="✓"
                />
              ) : (
                (tasksQ.data ?? [])
                  .filter((t) => !t.completed)
                  .map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      onToggle={() => toggleTaskM.mutate(t)}
                      onDelete={() => deleteTaskM.mutate(t.id)}
                    />
                  ))
              )}
            </View>

            {(tasksQ.data ?? []).some((t) => t.completed) && (
              <View style={{ gap: 10, marginTop: 8 }}>
                <Text style={[type.labelSm, { color: theme.textMuted }]}>
                  {t("profile.done")}
                </Text>
                {(tasksQ.data ?? [])
                  .filter((t) => t.completed)
                  .map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      onToggle={() => toggleTaskM.mutate(t)}
                      onDelete={() => deleteTaskM.mutate(t.id)}
                    />
                  ))}
              </View>
            )}
          </View>
        )}
      </KeyboardSafeScroll>
    </SafeAreaView>
  )
}

function MetaField({
  label,
  value,
  capitalize,
}: {
  label: string
  value: string
  capitalize?: boolean
}) {
  const { theme } = useTheme()
  return (
    // Left-aligned cells in an equal-thirds row strand a gutter on the right.
    // These are peers, so centre each cell rather than spreading the row.
    <View style={{ flex: 1, gap: 4, alignItems: "center" }}>
      <Text
        style={[type.labelSm, { color: theme.textMuted, textAlign: "center" }]}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: 18,
          color: theme.text,
          textAlign: "center",
          textTransform: capitalize ? "capitalize" : "none",
        }}
      >
        {value}
      </Text>
    </View>
  )
}

function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: Task
  onToggle: () => void
  onDelete: () => void
}) {
  const { theme, paper } = useTheme()
  const t = useT()
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        gap: 12,
      }}
    >
      <Pressable
        onPress={onToggle}
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 1.5,
          borderColor: task.completed ? theme.accent : theme.border,
          backgroundColor: task.completed ? theme.accent : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {task.completed && (
          <Text style={{ color: theme.white, fontSize: 11, fontWeight: "800" }}>
            ✓
          </Text>
        )}
      </Pressable>
      <Text
        style={{
          flex: 1,
          color: task.completed ? theme.textMuted : theme.text,
          textDecorationLine: task.completed ? "line-through" : "none",
          fontSize: 15,
        }}
      >
        {task.content}
      </Text>
      <Pressable onPress={onDelete}>
        <Text style={{ color: theme.red, fontSize: 12 }}>
          {t("profile.delete")}
        </Text>
      </Pressable>
    </View>
  )
}

// ─── About section ─────────────────────────────────────────────────────────
