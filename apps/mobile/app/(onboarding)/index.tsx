import { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { useMutation } from "@tanstack/react-query"
import {
  OnbShell,
  OnbRise,
  OnbChoiceCard,
} from "@/components/onboarding/OnbShell"
import { LiftedFace, PaperCard } from "@/components/study/PaperCard"
import { Shifu } from "@/components/study/Shifu"
import { Slide } from "@/components/onboarding/Slide"
import { CourseIntro } from "@/components/onboarding/CourseIntro"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
import { paperType, families } from "@/theme/paperType"
import type { ThemeId, ThemeMode } from "@/theme/colors"
import { useOnboardingStore, type ScriptPref } from "@/store/onboarding"
import { useThemePrefs } from "@/store/theme"
import {
  LANGUAGES,
  examDisplayName,
  isCharScript,
  languageInfo,
  motifChar,
} from "@/lib/languages"
import { useUserSettings } from "@/hooks/useUserSettings"
import { progress } from "@/api/endpoints"
import { useT, type I18nKey } from "@/i18n"
import { tap } from "@/utils/feedback"

const STEPS = [
  "welcome",
  "language",
  "script",
  "theme",
  "goal",
  "reminders",
  "ready",
] as const
type Step = (typeof STEPS)[number]

const KICKERS: Record<Step, I18nKey> = {
  welcome: "ob.kWelcome",
  language: "ob.kLanguage",
  script: "ob.kScript",
  theme: "ob.kTheme",
  goal: "ob.kGoal",
  reminders: "ob.kReminders",
  ready: "ob.kReady",
}

const TITLES: Record<Step, I18nKey> = {
  welcome: "ob.tWelcome",
  language: "ob.tLanguage",
  script: "ob.tScript",
  theme: "ob.tTheme",
  goal: "ob.tGoal",
  reminders: "ob.tReminders",
  ready: "ob.tReady",
}

const SUBS: Record<Step, I18nKey> = {
  welcome: "ob.sWelcome",
  language: "ob.sLanguage",
  script: "ob.sScript",
  theme: "ob.sTheme",
  goal: "ob.sGoal",
  reminders: "ob.sReminders",
  ready: "ob.sReady",
}

const GOALS: { min: number; key: I18nKey }[] = [
  { min: 5, key: "ob.gCasual" },
  { min: 10, key: "ob.gSteady" },
  { min: 15, key: "ob.gSerious" },
  { min: 30, key: "ob.gDevotee" },
]

/**
 * Onboarding — seven steps.
 *
 * Page order lives in one array and both the dots and the forward/back
 * navigation derive from it, so inserting a step moves every dot without a
 * number being edited anywhere. The dots are the **only** progress indicator;
 * numbered step pills used to sit above the script and placement pages and were
 * deleted, because two indicators saying the same thing in different units and
 * disagreeing about how many steps there are is worse than one.
 *
 * The **script** step is second, before anything else asks a question, and it is
 * skipped for non-character languages — the placement test below reads the
 * script preference, so it has to exist before that test can run.
 *
 * Nothing here requests a native permission. The reminder step sets a
 * preference; the permission prompt belongs to the person who turns reminders on
 * for good, in settings, and asking at onboarding would be asking for something
 * they have not yet decided they want.
 */
export default function Onboarding() {
  const { theme, paper, catalog, materialYouAvailable } = useTheme()
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
  const [reminders, setReminders] = useState(false)
  const step = STEPS[stepIdx]

  const settings = useUserSettings()

  // Two records, because two exist. `progress` carries the finished step count
  // the entry gate reads; `settings.active_exam_type` is what every
  // language-scoped screen derives its language and script from. Writing only
  // the first left a Goethe learner on Mandarin reading aids until they
  // re-picked their path from the profile screen.
  const syncOnboarding = useMutation({
    mutationFn: async () => {
      await progress.update({
        onboarding: { completed: true, step: STEPS.length },
        data: { script, language, examType, daily_minutes: dailyMinutes },
      })
      if (examType) settings.set({ active_exam_type: examType })
    },
    onError: () => undefined,
  })

  /** The steps a non-character language actually walks. */
  const visible = useMemo(
    () => STEPS.filter((s) => !(s === "script" && !isCharScript(language))),
    [language]
  )

  const go = useCallback(
    (delta: number) => {
      // If the current step is not in `visible` — a character-less language has no
      // "script" step, so the default stepIdx 0 points at a step that is filtered
      // out — indexOf returned -1 and next became 0, pinning the learner on the
      // first screen with no way forward. Land on the first real step instead.
      const at = visible.indexOf(step)
      const next = at === -1 ? 0 : at + delta
      if (next < 0) return
      if (next >= visible.length) {
        syncOnboarding.mutate()
        complete()
        router.replace("/(auth)")
        return
      }
      tap()
      setStepIdx(STEPS.indexOf(visible[next]))
    },
    [visible, step, syncOnboarding, complete]
  )

  const info = languageInfo(language)
  const stepNo = String(visible.indexOf(step) + 1).padStart(2, "0")

  // A fresh install shows a language as already selected — the store has a
  // default — but nothing had tapped a card, so no exam had been chosen either.
  // The continue button is gated on the exam being set, which left a learner
  // staring at a selected language and a dead button with no way forward.
  //
  // Derived rather than required, so what the page displays and what it allows
  // are the same thing.
  useEffect(() => {
    if (!language) return
    const types = languageInfo(language).examTypes
    if (examType && types.includes(examType)) return
    if (types.length > 0) setExamType(types[0])
  }, [language, examType, setExamType])

  return (
    <OnbShell
      dots={visible.length}
      stepIndex={visible.indexOf(step)}
      onBack={visible.indexOf(step) > 0 ? () => go(-1) : undefined}
      scroll
      art={
        step === "welcome"
          ? "panorama"
          : step === "script"
            ? "branch"
            : step === "ready"
              ? "peaks"
              : "none"
      }
      footer={
        step === "welcome" ? (
          <LiftedFace
            title={t("common.begin")}
            face={theme.accent}
            onPress={() => go(1)}
          />
        ) : step === "ready" ? (
          <LiftedFace
            title={t("place.start")}
            face={theme.green}
            onPress={() => {
              syncOnboarding.mutate()
              complete()
              router.replace("/(auth)")
            }}
          />
        ) : (
          <LiftedFace
            title={t("common.continue")}
            face={theme.accent}
            disabled={
              (step === "language" && !examType) ||
              (step === "script" && !script)
            }
            onPress={() => go(1)}
          />
        )
      }
    >
      <Slide stepKey={step}>
        <View style={{ gap: 4 }}>
          <Text style={[type.labelSm, { color: theme.textMuted }]}>
            {/* Number derived from the visible steps: `script` is skipped for
                Latin-script languages, so a hardcoded number in the string
                would label the later steps wrong. */}
            {t(KICKERS[step], { n: stepNo })}
          </Text>
          <Text style={[type.display, { color: theme.text, fontSize: 32 }]}>
            {t(TITLES[step])}
          </Text>
        </View>

        <Text style={[type.bodySm, { color: theme.textMuted }]}>
          {t(SUBS[step])}
        </Text>

        {step === "welcome" ? (
          <View
            style={{
              flex: 1,
              minHeight: 0,
              gap: 18,
              justifyContent: "flex-end",
            }}
          >
            {/* The welcome step was 55% empty: a line of copy, then nothing
                until the mascot at the hem. It answers the two questions a
                first-time learner actually has — what happens here each day,
                and what they are about to choose between — and both are
                things the app already knows, so neither is decoration. */}
            <View style={{ gap: 10 }}>
              <Text
                style={[
                  type.labelSm,
                  { color: theme.textMuted, fontFamily: fonts.sans },
                ]}
              >
                {t("ob.wLoopTitle")}
              </Text>
              {(["ob.wLoop1", "ob.wLoop2", "ob.wLoop3"] as const).map(
                (key, i) => (
                  <View key={key} style={{ flexDirection: "row", gap: 10 }}>
                    <Text
                      style={{
                        color: theme.accent,
                        fontFamily: fonts.sans,
                        fontWeight: "800",
                        fontSize: 13,
                        width: 18,
                      }}
                    >
                      {i + 1}
                    </Text>
                    <Text
                      style={[
                        type.bodySm,
                        {
                          color: theme.textMuted,
                          fontFamily: fonts.sans,
                          flex: 1,
                        },
                      ]}
                    >
                      {t(key)}
                    </Text>
                  </View>
                )
              )}
            </View>

            <View style={{ gap: 8 }}>
              <Text
                style={[
                  type.labelSm,
                  { color: theme.textMuted, fontFamily: fonts.sans },
                ]}
              >
                {t("ob.wPathsTitle")}
              </Text>
              {/* Two per row, not a wrapping row: four pills flowed by width
                  and left three above one, which reads as an accident. Half the
                  row each keeps the grid even and gives "Goethe-Zertifikat"
                  room — a single row of four cannot hold it at 411dp. */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {LANGUAGES.map((l) => (
                  <View
                    key={l.code}
                    style={{
                      flexBasis: "48%",
                      flexGrow: 1,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: paper.radius.pill,
                      borderWidth: 1,
                      borderColor: paper.line,
                      backgroundColor: paper.cardAlt,
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Text
                      style={{
                        color: paper.ink,
                        fontFamily: families.nunitoExtraBold,
                        fontSize: 14,
                      }}
                    >
                      {l.nativeName}
                    </Text>
                    <Text
                      style={[
                        type.caption,
                        {
                          color: paper.inkMuted,
                          fontFamily: families.nunitoSemiBold,
                          fontSize: 10.5,
                        },
                      ]}
                    >
                      {l.examTypes.map(examDisplayName).join(" · ")}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* A fixed-height row, and no `fill` on the mascot. With `fill`
                the wrapper flexes, the page's own content squeezes it below the
                image's height, and the image then paints over whatever sits
                above it — which is how the "Deutsch" and "English" pills ended
                up behind a panda. An explicit height cannot be shrunk, so
                nothing here can overlap the copy above it. */}
            <View style={{ height: 118, alignItems: "center" }}>
              <Shifu pose="bow" size={110} />
            </View>
          </View>
        ) : null}

        {step === "language" ? (
          <View style={{ gap: 10 }}>
            {LANGUAGES.map((l) => {
              const selected = l.code === language
              return (
                <OnbChoiceCard
                  key={l.code}
                  title={l.nativeName}
                  sub={
                    l.code === "zh"
                      ? "HSK · TOCFL"
                      : l.examTypes.map(examDisplayName).join(" · ")
                  }
                  glyph={motifChar(l.code)}
                  selected={selected}
                  onPress={() => {
                    tap()
                    setLanguage(l.code)
                    const types = languageInfo(l.code).examTypes
                    if (!examType || !types.includes(examType))
                      setExamType(types[0])
                  }}
                />
              )
            })}
          </View>
        ) : null}

        {step === "script" ? (
          <View style={{ flexDirection: "row", gap: 12 }}>
            {(["simplified", "traditional"] as ScriptPref[]).map((s) => (
              <View key={s} style={{ flex: 1 }}>
                <OnbChoiceCard
                  tall
                  glyph={s === "simplified" ? "学" : "學"}
                  title={s === "simplified" ? "简体" : "繁體"}
                  sub={
                    s === "simplified"
                      ? t("ob.scriptSimplified")
                      : t("ob.scriptTraditional")
                  }
                  selected={script === s}
                  onPress={() => {
                    tap()
                    setScript(s)
                  }}
                />
              </View>
            ))}
          </View>
        ) : null}

        {step === "theme" ? (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {catalog.map((def) => {
                const selected = themeId === def.id
                return (
                  <Pressable
                    key={def.id}
                    onPress={() => {
                      tap()
                      setThemeId(def.id as ThemeId)
                    }}
                    style={{
                      width: 104,
                      padding: 12,
                      borderRadius: 14,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? theme.accent : paper.line,
                      backgroundColor: selected ? paper.cardAlt : paper.card,
                      gap: 8,
                    }}
                  >
                    <View style={{ flexDirection: "row", gap: 4 }}>
                      {[
                        def.light.bg,
                        def.light.accent,
                        def.light.accent2,
                        def.light.green,
                      ].map((c, i) => (
                        <View
                          key={i}
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: 8,
                            backgroundColor: c,
                          }}
                        />
                      ))}
                    </View>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: theme.text,
                        fontFamily: fonts.sans,
                        fontWeight: "700",
                        fontSize: 12.5,
                      }}
                    >
                      {def.name}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
            {materialYouAvailable ? (
              <Text style={[type.caption, { color: theme.textDim }]}>
                {t("ob.materialYou")} · {t("ob.android12")}
              </Text>
            ) : null}
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(
                [
                  ["system", t("ob.modeSystem")],
                  ["light", t("ob.modeLight")],
                  ["dark", t("ob.modeDark")],
                  ["amoled", "AMOLED"],
                ] as [ThemeMode, string][]
              ).map(([m, label]) => {
                const selected = mode === m
                return (
                  <Pressable
                    key={m}
                    onPress={() => {
                      tap()
                      setMode(m)
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: paper.radius.pill,
                      borderWidth: 1,
                      borderColor: selected ? theme.accent : paper.line,
                      backgroundColor: selected ? paper.cardAlt : "transparent",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: selected ? theme.accent : theme.textMuted,
                        fontFamily: fonts.sans,
                        fontWeight: "700",
                        fontSize: 12,
                      }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        ) : null}

        {step === "goal" ? (
          <View style={{ gap: 8 }}>
            {GOALS.map((g) => {
              const selected = dailyMinutes === g.min
              return (
                <Pressable
                  key={g.min}
                  onPress={() => {
                    tap()
                    setDailyMinutes(g.min)
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      paddingVertical: 16,
                      paddingHorizontal: 14,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: selected ? theme.accent : paper.line,
                      backgroundColor: selected ? paper.cardAlt : "transparent",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "baseline",
                        gap: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.serif,
                          fontSize: 30,
                          color: selected ? theme.accent : theme.text,
                        }}
                      >
                        {g.min}
                      </Text>
                      <Text style={[type.bodySm, { color: theme.textMuted }]}>
                        {t("ob.minutes")}
                      </Text>
                    </View>
                    <Text
                      style={[
                        type.labelSm,
                        { color: selected ? theme.accent : theme.textMuted },
                      ]}
                    >
                      {t(g.key)}
                    </Text>
                  </View>
                </Pressable>
              )
            })}
          </View>
        ) : null}

        {step === "reminders" ? (
          <View style={{ gap: 12 }}>
            <OnbChoiceCard
              title={t("ob.reminder")}
              sub={t("profile.reminderHint")}
              icon="notifications"
              selected={reminders}
              onPress={() => {
                tap()
                setReminders((r) => !r)
              }}
            />
            {/* What declining actually costs. The step asked for a preference
                and then said nothing about the streak it feeds, so "not now"
                read as a shrug rather than a decision. */}
            <Text style={[type.caption, { color: theme.textDim }]}>
              {t("ob.wNoReminderCost")}
            </Text>
            <Text style={[type.caption, { color: theme.textDim }]}>
              {t("ob.reminderLater")}
            </Text>
          </View>
        ) : null}

        {step === "ready" ? (
          <CourseIntro language={language} examType={examType} />
        ) : null}

        {step === "ready" ? (
          <PaperCard>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Ionicons name="book" size={28} color={theme.textDim} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={[
                    type.body,
                    {
                      color: theme.text,
                      fontWeight: "700",
                      fontFamily: fonts.sans,
                    },
                  ]}
                >
                  {t("place.findLevel")}
                </Text>
                <Text style={[type.caption, { color: theme.textMuted }]}>
                  {t("place.introA")}
                </Text>
              </View>
            </View>
          </PaperCard>
        ) : null}
      </Slide>
    </OnbShell>
  )
}
