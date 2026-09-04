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
import { EmptyState } from "@/components/ui/EmptyState"
import { Input } from "@/components/ui/Input"
import { KeyboardSafeScroll } from "@/components/ui/KeyboardSafeScroll"
import { Motif } from "@/components/ui/Motif"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
import type { ThemeDefinition, ThemeId, ThemeMode } from "@/theme/colors"
import { community, health, progress, settings, tasks } from "@/api/endpoints"
import {
  cancelStreakReminder,
  requestPermissions,
  scheduleDailyStreakReminder,
} from "@/utils/notifications"
import { useAuthStore } from "@/store/auth"
import { useThemePrefs } from "@/store/theme"
import { clearTokens } from "@/utils/secure"
import type { Task } from "@/types/api"

type Section = "profile" | "tasks" | "settings" | "about"

export default function ProfileTab() {
  const { theme, catalog } = useTheme()
  const router = useRouter()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)

  const { themeId, mode, setThemeId, setMode } = useThemePrefs()

  const [section, setSection] = useState<Section>("profile")
  const [newTask, setNewTask] = useState("")

  const settingsQ = useQuery({ queryKey: ["settings"], queryFn: settings.get })
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
    Alert.alert("Sign out?", "Your progress is synced to the cloud.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
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
            </View>
            <Motif char="我" size={56} />
          </View>
          <View style={{ height: 1, backgroundColor: theme.border }} />
        </View>

        {/* Section switcher */}
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {[
            { id: "profile" as Section, label: "Profile" },
            { id: "tasks" as Section, label: "Tasks" },
            { id: "settings" as Section, label: "Settings" },
            { id: "about" as Section, label: "About" },
          ].map((s) => {
            const sel = section === s.id
            return (
              <Pressable
                key={s.id}
                onPress={() => setSection(s.id)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 2,
                  borderBottomWidth: sel ? 2 : 0,
                  borderBottomColor: theme.accent,
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.serif,
                    fontSize: 18,
                    color: sel ? theme.text : theme.textMuted,
                    fontWeight: sel ? "500" : "400",
                  }}
                >
                  {s.label}
                </Text>
              </Pressable>
            )
          })}
        </View>

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
                label="Member since"
                value={new Date(user.created_at).toLocaleDateString()}
              />
              <MetaField label="Role" value={user.role} capitalize />
              <MetaField
                label="Verified"
                value={user.email_verified ? "Yes" : "No"}
              />
            </View>

            <Button title="Sign out" variant="danger" onPress={onSignOut} />
          </View>
        )}

        {section === "tasks" && (
          <View style={{ gap: 16 }}>
            <View style={{ gap: 10 }}>
              <Text style={[type.labelSm, { color: theme.textMuted }]}>
                Add a task
              </Text>
              <View
                style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}
              >
                <View style={{ flex: 1 }}>
                  <Input
                    placeholder="e.g., Memorize 10 radicals"
                    value={newTask}
                    onChangeText={setNewTask}
                  />
                </View>
                <Button
                  title="Add"
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
                Open
              </Text>
              {tasksQ.isLoading ? (
                <ActivityIndicator color={theme.accent} />
              ) : (tasksQ.data ?? []).filter((t) => !t.completed).length ===
                0 ? (
                <EmptyState
                  title="All clear"
                  message="Add a task above to keep momentum."
                  glyph="单"
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
                  Done
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
          <View style={{ gap: 24 }}>
            {/* Theme */}
            <View style={{ gap: 12 }}>
              <Text style={[type.labelSm, { color: theme.textMuted }]}>
                Theme
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
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

            {/* Mode */}
            <View style={{ gap: 10 }}>
              <Text style={[type.labelSm, { color: theme.textMuted }]}>
                Appearance
              </Text>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {[
                  { id: "system" as ThemeMode, label: "System" },
                  { id: "light" as ThemeMode, label: "Light" },
                  { id: "dark" as ThemeMode, label: "Dark" },
                  { id: "amoled" as ThemeMode, label: "AMOLED" },
                ].map((m) => {
                  const sel = mode === m.id
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => setMode(m.id)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 2,
                        borderWidth: 1.5,
                        borderColor: sel ? theme.text : theme.border,
                        backgroundColor: sel ? theme.text : "transparent",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: sel ? theme.bg : theme.text,
                          fontWeight: "600",
                          fontSize: 13,
                        }}
                      >
                        {m.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>

            {/* Learning prefs */}
            {settingsQ.data && (
              <View
                style={{
                  gap: 12,
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                  paddingTop: 20,
                }}
              >
                <Text style={[type.labelSm, { color: theme.textMuted }]}>
                  Learning
                </Text>
                <SettingsSwitch
                  label="Autoplay audio"
                  hint="Play pronunciation when a word appears"
                  value={settingsQ.data.autoplay_audio}
                  onChange={(v) =>
                    updateSettingsM.mutate({ autoplay_audio: v })
                  }
                />
                <SettingsSwitch
                  label="Sound effects"
                  hint="Tiny confirmation chimes"
                  value={settingsQ.data.sound_effects}
                  onChange={(v) => updateSettingsM.mutate({ sound_effects: v })}
                />
                <SettingsSwitch
                  label="Daily reminder"
                  hint="Push notification at your chosen time"
                  value={settingsQ.data.daily_reminder}
                  onChange={async (v) => {
                    updateSettingsM.mutate({ daily_reminder: v })
                    if (v) {
                      const granted = await requestPermissions()
                      if (granted) {
                        const [h, m] = (settingsQ.data.reminder_time ?? "20:00")
                          .split(":")
                          .map(Number)
                        await scheduleDailyStreakReminder(h || 20, m || 0)
                      } else {
                        Alert.alert(
                          "Notifications disabled",
                          "Enable them in system settings to receive reminders."
                        )
                      }
                    } else {
                      await cancelStreakReminder()
                    }
                  }}
                />
                <SettingsSwitch
                  label="Weekly summary"
                  hint="Every Monday morning"
                  value={settingsQ.data.weekly_summary}
                  onChange={(v) =>
                    updateSettingsM.mutate({ weekly_summary: v })
                  }
                />
                <SettingsSwitch
                  label="Focus mode"
                  hint="Hide streaks and comparisons"
                  value={settingsQ.data.focus_mode}
                  onChange={(v) => updateSettingsM.mutate({ focus_mode: v })}
                />
              </View>
            )}
          </View>
        )}

        {section === "about" && <AboutSection />}
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
        <Text style={{ color: theme.red, fontSize: 12 }}>Delete</Text>
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
        // Border color set inline below via selected flag
        // Note: dynamically themed by its own preview palette for taste
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

// ─── About section ─────────────────────────────────────────────────────────
function AboutSection() {
  const { theme } = useTheme()
  const router = useRouter()
  const healthQ = useQuery({
    queryKey: ["health"],
    queryFn: health.check,
    retry: 1,
  })
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
      {/* Server status */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: theme.border,
          paddingVertical: 14,
        }}
      >
        <Text style={[type.labelSm, { color: theme.textMuted }]}>Server</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor:
                healthQ.data?.status === "ok" ? theme.green : theme.red,
            }}
          />
          <Text style={[type.bodySm, { color: theme.textMuted }]}>
            {healthQ.isLoading
              ? "Checking…"
              : healthQ.data
                ? `v${healthQ.data.version} · ${healthQ.data.status}`
                : "unreachable"}
          </Text>
        </View>
      </View>

      {/* Contributors */}
      <View style={{ gap: 12 }}>
        <Text style={[type.labelSm, { color: theme.textMuted }]}>
          Contributors
        </Text>
        {contributorsQ.isLoading ? (
          <ActivityIndicator color={theme.accent} />
        ) : (contributorsQ.data ?? []).length === 0 ? (
          <EmptyState title="No contributors yet" glyph="人" />
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
                    backgroundColor: theme.surface,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.serif,
                      fontSize: 18,
                      color: theme.accent,
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
                  <Text style={[type.labelSm, { color: theme.accent }]}>
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
        <Text style={[type.labelSm, { color: theme.textMuted }]}>Sponsors</Text>
        {sponsorsQ.isLoading ? (
          <ActivityIndicator color={theme.accent} />
        ) : (sponsorsQ.data ?? []).length === 0 ? (
          <EmptyState title="No sponsors yet" glyph="谢" />
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
        <Text style={[type.labelSm, { color: theme.textMuted }]}>Join us</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button
              title="Contribute"
              variant="secondary"
              onPress={() => router.push("/apply")}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Sponsor"
              variant="ghost"
              onPress={() => router.push("/apply")}
            />
          </View>
        </View>
      </View>
    </View>
  )
}
