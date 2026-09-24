import { useState } from "react"
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
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Chip } from "@/components/ui/Chip"
import { SegmentedControl } from "@/components/ui/SegmentedControl"
import { EmptyState } from "@/components/ui/EmptyState"
import { Input } from "@/components/ui/Input"
import { KeyboardSafeScroll } from "@/components/ui/KeyboardSafeScroll"
import { Motif } from "@/components/ui/Motif"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
import type { ThemeDefinition, ThemeId, ThemeMode } from "@/theme/colors"
import { auth, community, progress, settings, tasks } from "@/api/endpoints"
import { examBadgeColor, motifChar } from "@/lib/languages"
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

type Section = "profile" | "tasks" | "settings" | "about"

export default function ProfileTab() {
  const { theme, catalog } = useTheme()
  const t = useT()
  const router = useRouter()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)

  const { themeId, mode, setThemeId, setMode } = useThemePrefs()
  const setLocale = useLocaleStore((s) => s.setLocale)

  const language = useOnboardingStore((s) => s.language)
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
    if ("script" in p) setScript(p.script)
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
      style={{ flex: 1, backgroundColor: theme.bg }}
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

        {/* Section switcher */}
        <SegmentedControl<Section>
          options={[
            { id: "profile", label: t("profile.tab") },
            { id: "tasks", label: t("profile.tasks") },
            { id: "settings", label: t("profile.settings") },
            { id: "about", label: t("profile.about") },
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
              <Card>
                <View style={{ gap: 8 }}>
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
                  <Pressable onPress={() => setSection("settings")}>
                    <Text style={[type.bodySm, { color: theme.accent }]}>
                      {t("profile.changeSettings")}
                    </Text>
                  </Pressable>
                </View>
              </Card>
            )}

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
                value={user.email_verified ? t("profile.yes") : t("profile.no")}
              />
            </View>

            <Button
              title={t("profile.signOut")}
              variant="danger"
              onPress={onSignOut}
            />
          </View>
        )}

        {section === "tasks" && (
          <View style={{ gap: 16 }}>
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
                <Button
                  title={t("profile.add")}
                  size="sm"
                  onPress={() => {
                    if (newTask.trim()) addTaskM.mutate(newTask.trim())
                  }}
                  disabled={!newTask.trim() || addTaskM.isPending}
                  fullWidth={false}
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

        {section === "settings" && (
          <View style={{ gap: 28 }}>
            {/* Learning path */}
            <Card>
              <View style={{ gap: 12 }}>
                <Text style={[type.labelSm, { color: theme.textMuted }]}>
                  {t("profile.learningPath")}
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {PATHS.map((p) => {
                    const isActive =
                      language === p.language && storedExamType === p.examType
                    return (
                      <Chip
                        key={`${p.language}-${p.examType}`}
                        label={`${p.title} · ${p.sub}`}
                        selected={isActive}
                        tint={examBadgeColor(p.examType)}
                        badge={isActive ? t("profile.current") : undefined}
                        onPress={() => pickPath(p)}
                      />
                    )
                  })}
                </View>
              </View>
            </Card>

            {/* Voice */}
            <Card>
              <View style={{ gap: 12 }}>
                <Text style={[type.labelSm, { color: theme.textMuted }]}>
                  {t("profile.voice")}
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {[
                    { id: "female", label: t("profile.female") },
                    { id: "male", label: t("profile.male") },
                  ].map((g) => (
                    <Chip
                      key={g.id}
                      label={g.label}
                      selected={
                        (settingsQ.data?.voice_gender ?? "female") === g.id
                      }
                      onPress={() =>
                        updateSettingsM.mutate({ voice_gender: g.id })
                      }
                    />
                  ))}
                </View>
              </View>
            </Card>

            {/* Daily goal */}
            <Card>
              <View style={{ gap: 12 }}>
                <Text style={[type.labelSm, { color: theme.textMuted }]}>
                  {t("profile.dailyGoal")}
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {[5, 10, 15, 30].map((m) => (
                    <Chip
                      key={m}
                      label={`${m} ${t("profile.min")}`}
                      selected={(settingsQ.data?.daily_goal_min ?? 10) === m}
                      onPress={() =>
                        updateSettingsM.mutate({ daily_goal_min: m })
                      }
                    />
                  ))}
                </View>
              </View>
            </Card>

            {/* New words + reviews */}
            <Card>
              <View style={{ gap: 12 }}>
                <Text style={[type.labelSm, { color: theme.textMuted }]}>
                  {t("profile.newWords")}
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {[5, 10, 20].map((n) => (
                    <Chip
                      key={n}
                      label={String(n)}
                      selected={(settingsQ.data?.new_words_per_day ?? 10) === n}
                      onPress={() =>
                        updateSettingsM.mutate({ new_words_per_day: n })
                      }
                    />
                  ))}
                </View>
              </View>

              <View style={{ gap: 12 }}>
                <Text style={[type.labelSm, { color: theme.textMuted }]}>
                  {t("profile.maxReviews")}
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {[20, 50, 100].map((n) => (
                    <Chip
                      key={n}
                      label={String(n)}
                      selected={
                        (settingsQ.data?.max_reviews_per_day ?? 50) === n
                      }
                      onPress={() =>
                        updateSettingsM.mutate({ max_reviews_per_day: n })
                      }
                    />
                  ))}
                </View>
              </View>
            </Card>

            {/* App language */}
            <Card>
              <View style={{ gap: 12 }}>
                <Text style={[type.labelSm, { color: theme.textMuted }]}>
                  {t("profile.appLang")}
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {(
                    [
                      { id: "en", label: "English" },
                      { id: "id", label: "Indonesia" },
                    ] as { id: AppLocale; label: string }[]
                  ).map((l) => (
                    <Chip
                      key={l.id}
                      label={l.label}
                      selected={(settingsQ.data?.locale ?? "en") === l.id}
                      onPress={() => {
                        setLocale(l.id)
                        updateSettingsM.mutate({ locale: l.id })
                      }}
                    />
                  ))}
                </View>
              </View>
            </Card>

            {/* Theme */}
            <Card>
              <View style={{ gap: 12 }}>
                <Text style={[type.labelSm, { color: theme.textMuted }]}>
                  {t("profile.theme")}
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}
                >
                  {catalog.map((t) => (
                    <ThemePill
                      key={t.id}
                      def={t}
                      selected={themeId === t.id}
                      onPress={() => setThemeId(t.id)}
                    />
                  ))}
                </View>
              </View>
            </Card>

            {/* Mode */}
            <Card>
              <View style={{ gap: 10 }}>
                <Text style={[type.labelSm, { color: theme.textMuted }]}>
                  {t("profile.appearance")}
                </Text>
                <SegmentedControl<ThemeMode>
                  options={[
                    { id: "system", label: t("profile.modeSystem") },
                    { id: "light", label: t("profile.modeLight") },
                    { id: "dark", label: t("profile.modeDark") },
                    { id: "amoled", label: "AMOLED" },
                  ]}
                  value={mode}
                  onChange={setMode}
                />
              </View>
            </Card>

            {/* Learning prefs */}
            {settingsQ.data && (
              <Card>
                <View style={{ gap: 12 }}>
                  <Text style={[type.labelSm, { color: theme.textMuted }]}>
                    {t("profile.learning")}
                  </Text>
                  <SettingsSwitch
                    label={t("profile.autoplay")}
                    hint={t("profile.autoplayHint")}
                    value={settingsQ.data.autoplay_audio}
                    onChange={(v) =>
                      updateSettingsM.mutate({ autoplay_audio: v })
                    }
                  />
                  <SettingsSwitch
                    label={t("profile.sounds")}
                    hint={t("profile.soundsHint")}
                    value={settingsQ.data.sound_effects}
                    onChange={(v) =>
                      updateSettingsM.mutate({ sound_effects: v })
                    }
                  />
                  <SettingsSwitch
                    label={t("profile.reminder")}
                    hint={t("profile.reminderHint")}
                    value={settingsQ.data.daily_reminder}
                    onChange={async (v) => {
                      updateSettingsM.mutate({ daily_reminder: v })
                      if (v) {
                        const granted = await requestPermissions()
                        if (granted) {
                          const [h, m] = (
                            settingsQ.data.reminder_time ?? "20:00"
                          )
                            .split(":")
                            .map(Number)
                          await scheduleDailyStreakReminder(h || 20, m || 0)
                        } else {
                          Alert.alert(
                            t("profile.notifOff"),
                            t("profile.notifOffMsg")
                          )
                        }
                      } else {
                        await cancelStreakReminder()
                      }
                    }}
                  />
                  <View style={{ gap: 8 }}>
                    <Text style={[type.labelSm, { color: theme.textMuted }]}>
                      {t("profile.reminderTime")}
                    </Text>
                    <View
                      style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                    >
                      {["07:00", "12:00", "20:00"].map((t) => (
                        <Chip
                          key={t}
                          label={t}
                          selected={
                            (settingsQ.data.reminder_time ?? "20:00") === t
                          }
                          onPress={async () => {
                            updateSettingsM.mutate({ reminder_time: t })
                            if (settingsQ.data.daily_reminder) {
                              await cancelStreakReminder()
                              const [h, m] = t.split(":").map(Number)
                              await scheduleDailyStreakReminder(h || 20, m || 0)
                            }
                          }}
                        />
                      ))}
                    </View>
                  </View>
                  <SettingsSwitch
                    label={t("profile.weekly")}
                    hint={t("profile.weeklyHint")}
                    value={settingsQ.data.weekly_summary}
                    onChange={(v) =>
                      updateSettingsM.mutate({ weekly_summary: v })
                    }
                  />
                  <SettingsSwitch
                    label={t("profile.focus")}
                    hint={t("profile.focusHint")}
                    value={settingsQ.data.focus_mode}
                    onChange={(v) => updateSettingsM.mutate({ focus_mode: v })}
                  />
                  <SettingsSwitch
                    label={t("profile.reduceMotion")}
                    hint={t("profile.reduceMotionHint")}
                    value={settingsQ.data.reduce_motion}
                    onChange={(v) =>
                      updateSettingsM.mutate({ reduce_motion: v })
                    }
                  />
                </View>
              </Card>
            )}

            <ChangePasswordCard />
          </View>
        )}

        {section === "about" && <AboutSection />}
      </KeyboardSafeScroll>
    </SafeAreaView>
  )
}

function contributorColor(
  name: string,
  palette: { accent: string; gold: string; mint: string }
) {
  const colors = [palette.accent, palette.gold, palette.mint]
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 997
  return colors[h % colors.length] ?? palette.accent
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
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={[type.labelSm, { color: theme.textMuted }]}>{label}</Text>
      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: 18,
          color: theme.text,
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
  const { theme } = useTheme()
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

function ThemePill({
  def,
  selected,
  onPress,
}: {
  def: ThemeDefinition
  selected: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1.5,
        borderColor: selected ? def.dark.accent : "#88888855",
        borderRadius: 999,
        gap: 8,
      }}
    >
      <View
        style={{
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: def.dark.accent,
        }}
      />
      <Text style={{ color: "#888", fontSize: 12, fontWeight: "600" }}>
        {def.name}
      </Text>
    </Pressable>
  )
}

function SettingsSwitch({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint?: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  const { theme } = useTheme()
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8,
        gap: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={[type.bodySm, { color: theme.text, fontWeight: "600" }]}>
          {label}
        </Text>
        {hint && (
          <Text
            style={[type.caption, { color: theme.textMuted, marginTop: 2 }]}
          >
            {hint}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.border, true: theme.accent }}
        thumbColor={theme.white}
      />
    </View>
  )
}

function ChangePasswordCard() {
  const { theme } = useTheme()
  const t = useT()
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [msg, setMsg] = useState<string | null>(null)

  const changeM = useMutation({
    mutationFn: () => auth.changePassword(current, next),
    onSuccess: () => {
      setCurrent("")
      setNext("")
      setMsg(t("profile.pwChanged"))
    },
    onError: () => setMsg(t("profile.pwFailed")),
  })

  return (
    <Card>
      <View style={{ gap: 12 }}>
        <Pressable
          onPress={() => setOpen((o) => !o)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={[type.labelSm, { color: theme.textMuted }]}>
            {t("profile.changePw")}
          </Text>
          <Text style={[type.body, { color: theme.textDim }]}>
            {open ? "−" : "+"}
          </Text>
        </Pressable>
        {open && (
          <View style={{ gap: 12 }}>
            <Input
              label={t("profile.currentPw")}
              value={current}
              onChangeText={(v) => {
                setCurrent(v)
                setMsg(null)
              }}
              secureTextEntry
              autoCapitalize="none"
            />
            <Input
              label={t("profile.newPw")}
              hint={t("profile.pwHint")}
              value={next}
              onChangeText={(v) => {
                setNext(v)
                setMsg(null)
              }}
              secureTextEntry
              autoCapitalize="none"
            />
            {!!msg && (
              <Text style={[type.bodySm, { color: theme.textMuted }]}>
                {msg}
              </Text>
            )}
            <Button
              title={
                changeM.isPending ? t("profile.saving") : t("profile.updatePw")
              }
              variant="secondary"
              disabled={!current || next.length < 8 || changeM.isPending}
              onPress={() => changeM.mutate()}
            />
          </View>
        )}
      </View>
    </Card>
  )
}

// ─── About section ─────────────────────────────────────────────────────────
function AboutSection() {
  const { theme } = useTheme()
  const t = useT()
  const router = useRouter()
  const language = useOnboardingStore((s) => s.language)
  const contributorsQ = useQuery({
    queryKey: ["contributors"],
    queryFn: () => community.contributors(50),
  })
  const sponsorsQ = useQuery({
    queryKey: ["sponsors"],
    queryFn: () => community.sponsors(50),
  })

  return (
    <View style={{ gap: 24 }}>
      <View style={{ gap: 8 }}>
        <Text style={[type.display, { color: theme.text, fontSize: 28 }]}>
          Navia Academy
        </Text>
        <Text style={[type.bodySm, { color: theme.textMuted }]}>
          {t("profile.aboutDesc")}
        </Text>
      </View>

      {/* Contributors */}
      <View style={{ gap: 12 }}>
        <Text style={[type.labelSm, { color: theme.textMuted }]}>
          {t("profile.contributors")}
        </Text>
        {contributorsQ.isLoading ? (
          <ActivityIndicator color={theme.accent} />
        ) : (contributorsQ.data ?? []).length === 0 ? (
          <EmptyState title={t("profile.noContrib")} glyph="○" />
        ) : (
          <View style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
            {(contributorsQ.data ?? []).map((c, i, arr) => (
              <View
                key={c.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  paddingVertical: 12,
                  borderBottomWidth: i === arr.length - 1 ? 1 : 0,
                  borderBottomColor: theme.border,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: contributorColor(c.name, theme) + "22",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.serif,
                      fontSize: 18,
                      color: contributorColor(c.name, theme),
                    }}
                  >
                    {c.name.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      type.bodySm,
                      { color: theme.text, fontWeight: "600" },
                    ]}
                  >
                    {c.name}
                  </Text>
                  <Text
                    style={[type.caption, { color: theme.textMuted }]}
                    numberOfLines={1}
                  >
                    {c.contributions.join(" · ")}
                  </Text>
                </View>
                {c.mandarin_level && (
                  <Text style={[type.labelSm, { color: theme.textMuted }]}>
                    {c.mandarin_level.toUpperCase()}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Sponsors */}
      <View style={{ gap: 12 }}>
        <Text style={[type.labelSm, { color: theme.textMuted }]}>
          {t("profile.sponsors")}
        </Text>
        {sponsorsQ.isLoading ? (
          <ActivityIndicator color={theme.accent} />
        ) : (sponsorsQ.data ?? []).length === 0 ? (
          <EmptyState title={t("profile.noSponsors")} glyph="♥" />
        ) : (
          <View style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
            {(sponsorsQ.data ?? []).map((s, i, arr) => (
              <Pressable
                key={s.id}
                onPress={() => s.website && Linking.openURL(s.website)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 12,
                  borderBottomWidth: i === arr.length - 1 ? 1 : 0,
                  borderBottomColor: theme.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      type.bodySm,
                      { color: theme.text, fontWeight: "600" },
                    ]}
                  >
                    {s.name}
                  </Text>
                  {s.description && (
                    <Text
                      style={[type.caption, { color: theme.textMuted }]}
                      numberOfLines={1}
                    >
                      {s.description}
                    </Text>
                  )}
                </View>
                {s.tier && (
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderWidth: 1,
                      borderColor: theme.gold,
                      borderRadius: 2,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.gold,
                        fontSize: 10,
                        fontWeight: "700",
                        letterSpacing: 1,
                      }}
                    >
                      {s.tier.toUpperCase()}
                    </Text>
                  </View>
                )}
                {s.website && (
                  <Text
                    style={{
                      fontFamily: fonts.serif,
                      fontSize: 16,
                      color: theme.textDim,
                    }}
                  >
                    →
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Apply CTAs */}
      <View style={{ gap: 12, paddingTop: 4 }}>
        <Text style={[type.labelSm, { color: theme.textMuted }]}>
          {t("profile.joinUs")}
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button
              title={t("profile.contribute")}
              variant="secondary"
              onPress={() => router.push("/apply")}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title={t("profile.sponsor")}
              variant="ghost"
              onPress={() => router.push("/apply")}
            />
          </View>
        </View>
      </View>
    </View>
  )
}
