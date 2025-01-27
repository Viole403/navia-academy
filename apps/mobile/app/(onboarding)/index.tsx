import { useCallback, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Motif } from "@/components/ui/Motif";
import { useTheme } from "@/theme/ThemeProvider";
import type { Theme, ThemeDefinition, ThemeMode } from "@/theme/colors";
import { fonts, type } from "@/theme/typography";
import { useOnboardingStore, type ScriptPref } from "@/store/onboarding";
import { useThemePrefs } from "@/store/theme";
import { progress } from "@/api/endpoints";

const STEPS = ["script", "theme", "goal"] as const;
type Step = (typeof STEPS)[number];

const KICKERS: Record<Step, string> = {
  script: "Step 01 — Foundations",
  theme: "Step 02 — Atmosphere",
  goal: "Step 03 — Rhythm",
};

const TITLES: Record<Step, string> = {
  script: "Choose your script",
  theme: "Set the tone",
  goal: "Find your pace",
};

const SUBS: Record<Step, string> = {
  script: "The characters you'll read every day. You can change your mind later.",
  theme: "Six palettes. Three modes. One quiet aesthetic.",
  goal: "How many minutes feels sustainable?",
};

export default function Onboarding() {
  const { theme, catalog, materialYouAvailable } = useTheme();
  const { themeId, mode, setThemeId, setMode } = useThemePrefs();
  const { script, setScript, complete, dailyMinutes, setDailyMinutes } =
    useOnboardingStore();
  const [stepIdx, setStepIdx] = useState(0);
  const step = STEPS[stepIdx];

  const syncOnboarding = useMutation({
    mutationFn: async () =>
      progress.update({
        onboarding: { completed: true, step: 3 },
        data: { script },
      }),
    onError: () => undefined,
  });

  const next = useCallback(() => {
    if (stepIdx < STEPS.length - 1) {
      setStepIdx(stepIdx + 1);
    } else {
      syncOnboarding.mutate();
      complete();
      router.replace("/(auth)");
    }
  }, [stepIdx, complete, syncOnboarding]);

  const stepChars: Record<Step, string> = {
    script: "简",
    theme: "彩",
    goal: "步",
  };

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
                {KICKERS[step]}
              </Text>
              <Text style={[type.h1, { color: theme.text }]}>
                {TITLES[step]}
              </Text>
              <Text style={[type.bodySm, { color: theme.textMuted }]}>
                {SUBS[step]}
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
        {step === "script" && (
          <View style={{ gap: 20 }}>
            {(
              [
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
              ]
            ).map((s) => {
              const selected = script === s.id;
              return (
                <Pressable
                  key={s.id}
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
                      style={[type.bodySm, { color: theme.textMuted, marginTop: 2 }]}
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
                      <Text style={{ color: theme.white, fontSize: 12, fontWeight: "700" }}>
                        ✓
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {step === "theme" && (
          <View style={{ gap: 28 }}>
            {/* Theme swatch grid */}
            <View style={{ gap: 12 }}>
              <Text style={[type.labelSm, { color: theme.textMuted }]}>
                Base theme
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
                    <Text style={{ color: theme.textMuted, fontSize: 10, fontWeight: "700" }}>
                      Material You
                    </Text>
                    <Text style={{ color: theme.textDim, fontSize: 9 }}>
                      Android 12+
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Mode */}
            <View style={{ gap: 10 }}>
              <Text style={[type.labelSm, { color: theme.textMuted }]}>
                Appearance
              </Text>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {(
                  [
                    { id: "system", label: "System" },
                    { id: "light", label: "Light" },
                    { id: "dark", label: "Dark" },
                    { id: "amoled", label: "AMOLED" },
                  ] as { id: ThemeMode; label: string }[]
                ).map((m) => {
                  const sel = mode === m.id;
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => setMode(m.id)}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
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
                          letterSpacing: 0.3,
                        }}
                      >
                        {m.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 6,
                  paddingTop: 14,
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                }}
              >
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <Text style={[type.body, { color: theme.text, fontWeight: "600" }]}>
                    True black
                  </Text>
                  <Text style={[type.caption, { color: theme.textMuted, marginTop: 2 }]}>
                    Pure #000 — saves battery on OLED panels
                  </Text>
                </View>
                <Switch
                  value={mode === "amoled"}
                  onValueChange={(v) => setMode(v ? "amoled" : "dark")}
                  trackColor={{ false: theme.border, true: theme.accent }}
                  thumbColor={theme.white}
                />
              </View>
            </View>
          </View>
        )}

        {step === "goal" && (
          <View style={{ gap: 0 }}>
            {(
              [
                { min: 5, label: "Casual reader" },
                { min: 10, label: "Steady student" },
                { min: 15, label: "Serious learner" },
                { min: 30, label: "Daily devotee" },
              ]
            ).map((g, i, arr) => {
              const selected = dailyMinutes === g.min;
              return (
                <Pressable
                  key={g.min}
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
                  <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
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
                      minutes
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
              );
            })}
          </View>
        )}

        {/* CTA */}
        <View style={{ marginTop: "auto", paddingTop: 16 }}>
          <Button
            title={stepIdx === STEPS.length - 1 ? "Begin" : "Continue"}
            onPress={next}
            disabled={step === "script" && !script}
            size="lg"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── A small editorial theme swatch ────────────────────────────────────────
function ThemeSwatch({
  def,
  mode,
  selected,
  onPress,
}: {
  def: ThemeDefinition;
  mode: ThemeMode;
  selected: boolean;
  onPress: () => void;
}) {
  const showLight = mode === "light";
  const showAmoled = mode === "amoled";
  const base = showLight ? def.light : def.dark;
  const preview: Theme = showAmoled
    ? { ...base, bg: "#000000", surface: "#0A0A0E", surfaceAlt: "#101016" }
    : base;

  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 96,
        height: 96,
        borderRadius: 4,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? preview.accent : preview.border,
        backgroundColor: preview.bg,
        padding: 10,
        justifyContent: "space-between",
      }}
    >
      <View style={{ flexDirection: "row", gap: 4 }}>
        <View
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: preview.accent,
          }}
        />
        <View
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: preview.mint,
          }}
        />
      </View>
      <View>
        <Text
          style={{
            color: preview.text,
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 0.2,
          }}
          numberOfLines={1}
        >
          {def.name}
        </Text>
        <Text
          style={{ color: preview.textDim, fontSize: 9, marginTop: 1 }}
          numberOfLines={1}
        >
          {def.dynamic ? "System palette" : "Editorial"}
        </Text>
      </View>
      {selected && (
        <View
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: preview.accent,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: preview.white, fontSize: 9, fontWeight: "800" }}>✓</Text>
        </View>
      )}
    </Pressable>
  );
}
