import { Text, View } from "react-native"
import { DetailShell } from "@/components/study/DetailShell"
import {
  SettingsGroup,
  SettingsToggle,
  SettingsChoice,
  SettingsState,
} from "@/components/settings/SettingsGroup"
import { PressableScale } from "@/components/study/press"
import { useDisplayMode } from "@/hooks/useDisplayMode"
import { useUserSettings } from "@/hooks/useUserSettings"
import { isCharDisplayMode, DISPLAY_MODE_ORDER } from "@/lib/displayMode"
import { useOnboardingStore } from "@/store/onboarding"
import { useTheme } from "@/theme/ThemeProvider"
import { useThemePrefs } from "@/store/theme"
import { useLocaleStore, useT, type I18nKey } from "@/i18n"
import { setSoundPrefs } from "@/utils/sound"
import type { DisplayModeMode } from "@/types/api"
import type { ThemeId, ThemeMode } from "@/theme/colors"

/**
 * General — appearance, language, and the accessibility switches.
 *
 * Theme and mode are read from the **local** preference store rather than the
 * server settings row. They are the two values that have to apply the instant they
 * are tapped; waiting for a round trip to repaint the entire app makes the picker
 * feel broken. The server copy is still written so the choice follows the account
 * to another device — local for immediacy, remote for continuity, and the local
 * one wins on a cold start because that is the one the user last touched.
 *
 * The theme row shows each palette's four ink colours rather than a name alone.
 * Six themes whose names are all equally evocative ("ink", "vermilion") tell a
 * learner nothing about which one they are currently looking at.
 */
const MODES: {
  id: ThemeMode
  label: "set.system" | "profile.modeLight" | "profile.modeDark" | "set.amoled"
}[] = [
  { id: "system", label: "set.system" },
  { id: "light", label: "profile.modeLight" },
  { id: "dark", label: "profile.modeDark" },
  { id: "amoled", label: "set.amoled" },
]

export default function SettingsGeneral() {
  const t = useT()
  const { catalog } = useTheme()
  const s = useUserSettings()
  const { displayMode, setMode, setAdaptiveByLevel } = useDisplayMode()
  const { themeId, mode, setThemeId, setMode: setModePref } = useThemePrefs()
  const language = useOnboardingStore((st) => st.language)
  const locale = useLocaleStore((st) => st.locale)
  const setLocale = useLocaleStore((st) => st.setLocale)
  const d = s.data

  return (
    <DetailShell title={t("set.general")} fallback="/settings">
      <View style={{ gap: 22 }}>
        <SettingsGroup title={t("profile.theme")}>
          <View style={{ padding: 14, gap: 8 }}>
            {catalog.map((def) => {
              const selected = themeId === def.id
              return (
                <ThemeSwatch
                  key={def.id}
                  name={def.name}
                  colors={[
                    def.light.bg,
                    def.light.accent,
                    def.light.accent2,
                    def.light.green,
                  ]}
                  selected={selected}
                  onPress={() => {
                    setThemeId(def.id as ThemeId)
                    s.set({ theme: def.id })
                  }}
                />
              )
            })}
          </View>
        </SettingsGroup>

        <SettingsGroup title={t("profile.modeDark")}>
          <SettingsChoice
            options={MODES.map((m) => ({ id: m.id, label: t(m.label) }))}
            value={mode}
            onChange={(id) => {
              setModePref(id as ThemeMode)
              s.set({ mode: id })
            }}
          />
        </SettingsGroup>

        <SettingsGroup title={t("profile.appLang")}>
          <SettingsChoice
            options={[
              { id: "en", label: "English" },
              { id: "id", label: "Bahasa Indonesia" },
            ]}
            value={locale}
            onChange={(id) => {
              setLocale(id as "en" | "id")
              s.set({ locale: id })
            }}
          />
        </SettingsGroup>

        {isCharDisplayMode(language) && (
          <SettingsGroup
            title={t("set.chineseDisplay")}
            hint={t("set.chineseDisplayHint")}
          >
            <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10 }}>
              <SettingsChoice
                options={DISPLAY_MODE_ORDER.map((m) => ({
                  id: m,
                  label: t(`set.displayMode.${m}` as I18nKey),
                }))}
                value={displayMode.mode}
                onChange={(id) => setMode(id as DisplayModeMode)}
              />
              <SettingsToggle
                first
                icon="cellular"
                title={t("set.adaptiveByLevel")}
                sub={t("set.adaptiveByLevelHint")}
                value={displayMode.adaptiveByLevel}
                onChange={setAdaptiveByLevel}
              />
            </View>
          </SettingsGroup>
        )}

        <SettingsGroup title={t("set.accessibility")} last>
          {s.isLoading ? (
            <SettingsState kind="loading" />
          ) : (
            <>
              <SettingsToggle
                first
                icon="leaf"
                title={t("profile.reduceMotion")}
                sub={t("profile.reduceMotionHint")}
                value={d?.reduce_motion ?? false}
                onChange={(v) => s.set({ reduce_motion: v })}
              />
              <SettingsToggle
                icon="speedometer-outline"
                title={t("profile.focus")}
                sub={t("profile.focusHint")}
                value={d?.focus_mode ?? false}
                onChange={(v) => s.set({ focus_mode: v })}
              />
              <SettingsToggle
                icon="musical-notes"
                title={t("profile.sounds")}
                sub={t("profile.soundsHint")}
                value={d?.sound_effects ?? true}
                onChange={(v) => {
                  s.set({ sound_effects: v })
                  setSoundPrefs({ enabled: v })
                }}
              />
            </>
          )}
        </SettingsGroup>
      </View>
    </DetailShell>
  )
}

function ThemeSwatch({
  name,
  colors,
  selected,
  onPress,
}: {
  name: string
  colors: string[]
  selected: boolean
  onPress: () => void
}) {
  const { theme } = useTheme()
  return (
    <PressableScale onPress={onPress}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: selected ? theme.accent : theme.border,
          backgroundColor: selected ? theme.accent + "12" : "transparent",
        }}
      >
        <View style={{ flexDirection: "row", gap: 3 }}>
          {colors.map((c, i) => (
            <View
              key={i}
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: c,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            />
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <Text2 color={selected ? theme.accent : theme.text}>{name}</Text2>
        </View>
        {selected ? <Text2 color={theme.accent}>✓</Text2> : null}
      </View>
    </PressableScale>
  )
}

function Text2({
  children,
  color,
}: {
  children: React.ReactNode
  color: string
}) {
  return (
    <Text style={{ color, fontSize: 14, fontWeight: "600" }}>{children}</Text>
  )
}
