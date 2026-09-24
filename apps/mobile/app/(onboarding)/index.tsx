import { useCallback, useState } from "react"
import { Pressable, ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/Button"
import { Enter } from "@/components/ui/Enter"
import { Motif } from "@/components/ui/Motif"
import { SegmentedControl } from "@/components/ui/SegmentedControl"
import { ThemeSwatch } from "@/components/ui/ThemeSwatch"
import { useTheme } from "@/theme/ThemeProvider"
import type { Theme, ThemeDefinition, ThemeMode } from "@/theme/colors"
import { fonts, type } from "@/theme/typography"
import { useOnboardingStore, type ScriptPref } from "@/store/onboarding"
import {
  LANGUAGES,
  examDisplayName,
  isCharScript,
  languageInfo,
  motifChar,
} from "@/lib/languages"
import { useThemePrefs } from "@/store/theme"
import { progress } from "@/api/endpoints"
import { useT, type I18nKey } from "@/i18n"

const STEPS = ["language", "script", "theme", "goal"] as const
type Step = (typeof STEPS)[number]

const KICKERS: Record<Step, I18nKey> = {
  language: "ob.kLanguage",
  script: "ob.kScript",
  theme: "ob.kTheme",
  goal: "ob.kGoal",
}

const TITLES: Record<Step, I18nKey> = {
  language: "ob.tLanguage",
  script: "ob.tScript",
  theme: "ob.tTheme",
  goal: "ob.tGoal",
}

const SUBS: Record<Step, I18nKey> = {
  language: "ob.sLanguage",
  script: "ob.sScript",
  theme: "ob.sTheme",
  goal: "ob.sGoal",
}

export default function Onboarding() {
  const { theme, catalog, materialYouAvailable } = useTheme()
  const t = useT()
  const { themeId, mode, setThemeId, setMode } = useThemePrefs()
  const {
    script,
    setScript,
    complete,
    dailyMinutes,
    setDailyMinutes,
    language,
    setLanguage,
    examType,
    setExamType,
  } = useOnboardingStore()
  const [stepIdx, setStepIdx] = useState(0)
  const step = STEPS[stepIdx]

  const syncOnboarding = useMutation({
    mutationFn: async () =>
      progress.update({
        onboarding: { completed: true, step: 4 },
        data: { script, language, examType },
      }),
    onError: () => undefined,
  })

  const next = useCallback(() => {
    let nextIdx = stepIdx + 1
    if (STEPS[stepIdx] === "language" && language !== "zh") nextIdx += 1
    if (nextIdx < STEPS.length) {
      setStepIdx(nextIdx)
    } else {
      syncOnboarding.mutate()
      complete()
      router.replace("/(auth)")
    }
  }, [stepIdx, complete, syncOnboarding, language])

  const back = useCallback(() => {
    // Mirror the forward skip: theme -> language directly for non-zh.
    let prevIdx = stepIdx - 1
    if (STEPS[stepIdx] === "theme" && language !== "zh") prevIdx -= 1
    if (prevIdx >= 0) setStepIdx(prevIdx)
  }, [stepIdx, language])

  const ctaDisabled =
    (step === "language" && !examType) ||
    (step === "script" && language === "zh" && !script)

  const stepChars: Record<Step, string> = {
    language: motifChar(language),
    script: "文",
    theme: "◐",
    goal: "→",
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 28, gap: 28, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Editorial header */}
        <View style={{ gap: 20 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1, gap: 10 }}>
              <Text style={[type.labelSm, { color: theme.textMuted }]}>
                {t(KICKERS[step])}
              </Text>
              <Text style={[type.h1, { color: theme.text }]}>
                {t(TITLES[step])}
              </Text>
              <Text style={[type.bodySm, { color: theme.textMuted }]}>
                {t(SUBS[step])}
              </Text>
            </View>
            <Motif char={stepChars[step]} size={64} />
          </View>

          {/* Step indicator — hairline */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            {STEPS.map((s, i) => (
              <View
                key={s}
                style={{
                  flex: 1,
                  height: 2,
                  backgroundColor: i <= stepIdx ? theme.text : theme.border,
                }}
              />
            ))}
          </View>
        </View>

        {/* Step content */}
        {step === "language" && (
          <View style={{ gap: 20 }}>
            {LANGUAGES.map((l, i) => {
              const selected = language === l.code
              return (
                <Enter key={l.code} index={i}>
                  <Pressable
                    onPress={() => {
                      setLanguage(l.code)
                      setExamType(languageInfo(l.code).examTypes[0] ?? "")
                    }}
                    style={{
                      paddingVertical: 20,
                      borderTopWidth: 1,
                      borderBottomWidth: 1,
                      borderColor: selected ? theme.text : theme.border,
                      backgroundColor: selected ? theme.surface : "transparent",
                      paddingHorizontal: 16,
                      marginHorizontal: -16,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 20,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.serif,
                        fontSize: 32,
                        color: selected ? theme.accent : theme.text,
                        ...(isCharScript(l.code)
                          ? { width: 96 }
                          : { minWidth: 96, flexShrink: 1 }),
                      }}
                    >
                      {l.nativeName}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[type.h3, { color: theme.text }]}>
                        {l.name}
                      </Text>
                      <Text
                        style={[
                          type.bodySm,
                          { color: theme.textMuted, marginTop: 2 },
                        ]}
                      >
                        {languageInfo(l.code)
                          .examTypes.map(examDisplayName)
                          .join(" · ")}
                      </Text>
                    </View>
                    {selected && (
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: theme.accent,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: theme.white,
                            fontSize: 12,
                            fontWeight: "700",
                          }}
                        >
                          ✓
                        </Text>
                      </View>
                    )}
                  </Pressable>
                </Enter>
              )
            })}

            {/* Exam picker for chosen language */}
            <View style={{ gap: 10, marginTop: 8 }}>
              <Text style={[type.labelSm, { color: theme.textMuted }]}>
                {t("ob.examTrack")}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {languageInfo(language).examTypes.map((t) => {
                  const sel = examType === t
                  return (
                    <Pressable
                      key={t}
                      onPress={() => setExamType(t)}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 2,
                        borderWidth: 1.5,
                        borderColor: sel ? theme.text : theme.border,
                        backgroundColor: sel ? theme.text : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          color: sel ? theme.bg : theme.text,
                          fontWeight: "600",
                          fontSize: 13,
                        }}
                      >
                        {examDisplayName(t)}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>
          </View>
        )}

        {step === "script" && (
          <View style={{ gap: 20 }}>
            {[
              {
                id: "simplified" as ScriptPref,
                display: "简体",
                name: "Simplified",
                hint: "Mainland China · Singapore · Malaysia",
              },
              {
                id: "traditional" as ScriptPref,
                display: "繁體",
                name: "Traditional",
                hint: "Taiwan · Hong Kong · Macau",
              },
            ].map((s, i) => {
              const selected = script === s.id
              return (
                <Enter key={s.id} index={i}>
                  <Pressable
                    onPress={() => setScript(s.id)}
                    style={{
                      paddingVertical: 24,
                      borderTopWidth: 1,
                      borderBottomWidth: 1,
                      borderColor: selected ? theme.text : theme.border,
                      backgroundColor: selected ? theme.surface : "transparent",
                      paddingHorizontal: 16,
                      marginHorizontal: -16,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 20,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.serif,
                        fontSize: 44,
                        color: selected ? theme.accent : theme.text,
                        width: 64,
                      }}
                    >
                      {s.display}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[type.h3, { color: theme.text }]}>
                        {s.name}
                      </Text>
                      <Text
                        style={[
                          type.bodySm,
                          { color: theme.textMuted, marginTop: 2 },
                        ]}
                      >
                        {s.hint}
                      </Text>
                    </View>
                    {selected && (
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: theme.accent,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: theme.white,
                            fontSize: 12,
                            fontWeight: "700",
                          }}
                        >
                          ✓
                        </Text>
                      </View>
                    )}
                  </Pressable>
                </Enter>
              )
            })}
          </View>
        )}

        {step === "theme" && (
          <View style={{ gap: 28 }}>
            {/* Theme swatch grid */}
            <View style={{ gap: 12 }}>
              <Text style={[type.labelSm, { color: theme.textMuted }]}>
                {t("ob.baseTheme")}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {catalog.map((t) => (
                  <ThemeSwatch
                    key={t.id}
                    def={t}
                    mode={mode}
                    selected={themeId === t.id}
                    onPress={() => setThemeId(t.id)}
                  />
                ))}
                {!materialYouAvailable && (
                  <View
                    style={{
                      width: 96,
                      height: 96,
                      borderStyle: "dashed",
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 4,
                      padding: 8,
                      justifyContent: "flex-end",
                      opacity: 0.4,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.textMuted,
                        fontSize: 10,
                        fontWeight: "700",
                      }}
                    >
                      {t("ob.materialYou")}
                    </Text>
                    <Text style={{ color: theme.textDim, fontSize: 9 }}>
                      {t("ob.android12")}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Mode */}
            <View style={{ gap: 10 }}>
              <Text style={[type.labelSm, { color: theme.textMuted }]}>
                {t("ob.appearance")}
              </Text>
              <SegmentedControl<ThemeMode>
                options={[
                  { id: "system", label: t("ob.modeSystem") },
                  { id: "light", label: t("ob.modeLight") },
                  { id: "dark", label: t("ob.modeDark") },
                  { id: "amoled", label: "AMOLED" },
                ]}
                value={mode}
                onChange={setMode}
              />
            </View>
          </View>
        )}

        {step === "goal" && (
          <View style={{ gap: 0 }}>
            {[
              { min: 5, label: t("ob.gCasual") },
              { min: 10, label: t("ob.gSteady") },
              { min: 15, label: t("ob.gSerious") },
              { min: 30, label: t("ob.gDevotee") },
            ].map((g, i, arr) => {
              const selected = dailyMinutes === g.min
              return (
                <Enter key={g.min} index={i}>
                  <Pressable
                    onPress={() => setDailyMinutes(g.min)}
                    style={{
                      paddingVertical: 20,
                      paddingHorizontal: 16,
                      borderTopWidth: 1,
                      borderTopColor: theme.border,
                      borderBottomWidth: i === arr.length - 1 ? 1 : 0,
                      borderBottomColor: theme.border,
                      backgroundColor: selected ? theme.surface : "transparent",
                      marginHorizontal: -12,
                      flexDirection: "row",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "baseline",
                        gap: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.serif,
                          fontSize: 32,
                          color: selected ? theme.accent : theme.text,
                          fontWeight: "400",
                        }}
                      >
                        {g.min}
                      </Text>
                      <Text style={[type.body, { color: theme.textMuted }]}>
                        {t("ob.minutes")}
                      </Text>
                    </View>
                    <Text
                      style={[
                        type.labelSm,
                        { color: selected ? theme.accent : theme.textMuted },
                      ]}
                    >
                      {g.label}
                    </Text>
                  </Pressable>
                </Enter>
              )
            })}
          </View>
        )}

        {/* CTA — Back mirrors the forward skip, primary takes 2/3 */}
        <View
          style={{
            marginTop: "auto",
            paddingTop: 16,
            flexDirection: "row",
            gap: 12,
          }}
        >
          {stepIdx > 0 && (
            <View style={{ flex: 1 }}>
              <Button
                title={t("common.back")}
                variant="secondary"
                onPress={back}
                size="lg"
              />
            </View>
          )}
          <View style={{ flex: 2 }}>
            <Button
              title={
                stepIdx === STEPS.length - 1
                  ? t("common.begin")
                  : t("common.continue")
              }
              onPress={next}
              disabled={ctaDisabled}
              size="lg"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
