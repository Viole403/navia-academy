import { StyleSheet, Text, View } from "react-native"
import { DetailShell } from "@/components/study/DetailShell"
import {
  SettingsGroup,
  SettingsToggle,
  SettingsChoice,
  ExamChoice,
  SettingsState,
} from "@/components/settings/SettingsGroup"
import { useUserSettings } from "@/hooks/useUserSettings"
import { useTheme } from "@/theme/ThemeProvider"
import { useT } from "@/i18n"
import { LANGUAGES, examDisplayName, languageInfo } from "@/lib/languages"
import { setSoundPrefs } from "@/utils/sound"

/**
 * Learning — everything that changes *what* gets learned.
 *
 * The exam track is grouped by language rather than flattened into one long list
 * of chips, because the flat list mixed HSK, Goethe and JLPT into an undifferentiated
 * row of pills where the only way to tell two apart was a colour. Grouped, each
 * language states its own exams and the selected one is unmistakable.
 *
 * The write is not optimistic (see `useUserSettings`), so a toggle visibly settles
 * a beat after the tap instead of snapping and then reverting — which is the
 * behaviour that makes a settings screen feel untrustworthy.
 */
export default function SettingsLearning() {
  const { theme } = useTheme()
  const t = useT()
  const s = useUserSettings()

  if (s.isLoading) {
    return (
      <DetailShell title={t("profile.learning")} fallback="/settings">
        <SettingsState kind="loading" />
      </DetailShell>
    )
  }
  if (s.isError) {
    return (
      <DetailShell title={t("profile.learning")} fallback="/settings">
        <SettingsState
          kind="error"
          message={(s.error as Error | null)?.message}
          onRetry={() => s.refetch()}
        />
      </DetailShell>
    )
  }

  const d = s.data
  const active = d?.active_exam_type
  const activeLang = LANGUAGES.find((l) =>
    languageInfo(l.code).examTypes.includes(active ?? "")
  )

  return (
    <DetailShell
      title={t("profile.learning")}
      kicker={active ? examDisplayName(active) : t("set.noTrack")}
      fallback="/settings"
    >
      <View style={{ gap: 22 }}>
        <SettingsGroup
          title={t("profile.learningPath")}
          hint={t("set.trackHint")}
        >
          {LANGUAGES.filter((l) => l.examTypes.length > 0).map((l, i) => (
            <View key={l.code}>
              {i > 0 ? (
                <View
                  style={{
                    height: StyleSheet.hairlineWidth,
                    backgroundColor: theme.border,
                    marginHorizontal: 14,
                  }}
                />
              ) : null}
              <View
                style={{
                  paddingHorizontal: 14,
                  paddingTop: 14,
                  paddingBottom: 2,
                }}
              >
                <Text
                  style={{
                    color: theme.textDim,
                    fontSize: 12,
                    letterSpacing: 0.4,
                  }}
                >
                  {l.nativeName}
                </Text>
              </View>
              <ExamChoice
                options={l.examTypes.map((e) => ({
                  id: e,
                  label: examDisplayName(e),
                }))}
                value={l.examTypes.includes(active ?? "") ? active : undefined}
                onChange={(id) => s.set({ active_exam_type: id })}
              />
            </View>
          ))}
        </SettingsGroup>

        <SettingsGroup title={t("profile.newWords")}>
          <SettingsChoice
            options={[5, 10, 15, 20, 30].map((n) => ({
              id: String(n),
              label: String(n),
            }))}
            value={String(d?.new_words_per_day ?? 10)}
            onChange={(id) => s.set({ new_words_per_day: Number(id) })}
          />
        </SettingsGroup>

        <SettingsGroup
          title={t("profile.maxReviews")}
          hint={t("set.reviewCapHint")}
        >
          <SettingsChoice
            options={[20, 40, 80, 150, 300].map((n) => ({
              id: String(n),
              label: String(n),
            }))}
            value={String(d?.max_reviews_per_day ?? 80)}
            onChange={(id) => s.set({ max_reviews_per_day: Number(id) })}
          />
        </SettingsGroup>

        <SettingsGroup title={t("profile.voice")}>
          <SettingsChoice
            options={[
              { id: "female", label: t("profile.female") },
              { id: "male", label: t("profile.male") },
            ]}
            value={d?.voice_gender ?? "female"}
            onChange={(id) => s.set({ voice_gender: id })}
          />
        </SettingsGroup>

        <SettingsGroup title={t("set.audio")} last>
          <SettingsToggle
            first
            icon="volume-high"
            title={t("profile.autoplay")}
            sub={t("profile.autoplayHint")}
            value={d?.autoplay_audio ?? true}
            onChange={(v) => s.set({ autoplay_audio: v })}
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
          <View
            style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 2 }}
          >
            <Text
              style={{ color: theme.textDim, fontSize: 12, letterSpacing: 0.4 }}
            >
              {t("set.audioRate")}
            </Text>
          </View>
          <SettingsChoice
            options={[
              { id: "0.7", label: "0.7×" },
              { id: "0.85", label: "0.85×" },
              { id: "1", label: "1×" },
              { id: "1.15", label: "1.15×" },
            ]}
            value={String(d?.audio_rate ?? 1)}
            onChange={(id) => s.set({ audio_rate: Number(id) })}
          />
        </SettingsGroup>
        {activeLang ? null : (
          <Text
            style={{ color: theme.textDim, fontSize: 12, textAlign: "center" }}
          >
            {t("set.noTrack")}
          </Text>
        )}
      </View>
    </DetailShell>
  )
}
