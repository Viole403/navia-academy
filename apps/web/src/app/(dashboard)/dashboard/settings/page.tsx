"use client";

import { useMounted } from "@/lib/use-mounted";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, Moon, Sun, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { API_BASE_URL, authHeaders } from "@/lib/api";
import { useProgress } from "@/stores/progress";
import { orderedDisplayModes, THEMES, useSettings } from "@/stores/settings";
import { useTranslation } from "@/i18n/locale-context";
import { useExamConfig } from "@/lib/exam-definitions";
import { LANGUAGES } from "@/lib/languages";
import { setLearningLanguage } from "@/lib/language-context";
import type { ExamType, LanguageCode } from "@/types";
import { cn } from "@/lib/utils";
import { Button, Card, Input, Modal, SectionHeader, Select, Tabs, Toggle } from "@/components/ui";


export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const examConfig = useExamConfig(); // Hydrate exam definitions
  const progress = useProgress();
  const s = useSettings();
  const router = useRouter();
  const [tab, setTab] = useState("account");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const { t, locale, setLocale } = useTranslation();
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const mounted = useMounted();
  if (!mounted) return null;

  const tabs = [
    { id: "account", label: t("settings.account") },
    { id: "learning", label: t("settings.learning") },
    { id: "appearance", label: t("settings.appearance") },
    { id: "sound", label: t("settings.sound") },
    { id: "notifications", label: t("settings.notifications") },
    { id: "privacy", label: t("settings.privacy") },
    { id: "accessibility", label: t("settings.accessibility") },
  ];

  function exportData() {
    const data = {
      exportedAt: new Date().toISOString(),
      user: { name: user?.displayName, email: user?.email },
      settings: { ...s, set: undefined, toggleWidget: undefined },
      progress: {
        xp: progress.xp, streak: progress.streak, bestStreak: progress.bestStreak,
        onboarding: progress.onboarding, placement: progress.placement,
        lessons: progress.lessons, srs: progress.srs, sessions: progress.sessions,
        achievements: progress.achievements, tasks: progress.tasks,
        attempts: progress.attempts,
        savedWordIds: progress.savedWordIds, difficultItemIds: progress.difficultItemIds, notes: progress.notes,
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
      a.download = `navia-academy-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="animate-fade-up">
      <SectionHeader  title={t("settings.title")} subtitle={t("settings.subtitle")} />
      <Tabs tabs={tabs} active={tab} onChange={setTab} id="settings-tabs" className="mb-6" />

      {/* ------------------------------- Account ------------------------------- */}
      {tab === "account" && (
        <div className="space-y-4" role="tabpanel" id="settings-tabs-panel-account" aria-labelledby="settings-tabs-tab-account" tabIndex={0}>
          <Card className="p-5">
            <h2 className="font-display font-semibold">{t("settings.accountDetails")}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input label={t("settings.name")} defaultValue={user?.displayName} disabled hint={t("settings.nameManaged")} />
              <Input label={t("settings.email")} defaultValue={user?.email} disabled />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-display font-semibold">{t("settings.password")}</h2>
            <form
              className="mt-4 flex flex-wrap items-end gap-3"
              onSubmit={async (e) => {
                e.preventDefault();
                setPasswordMsg(null);
                try {
                  const res = await fetch(`${API_BASE_URL}/api/v1/auth/change-password`, {
                    method: "POST",
                    headers: authHeaders(),
                    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
                  });
                  const body = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(body.error?.message || "Could not change password.");
                  setPasswordMsg({ ok: true, text: t("settings.passwordChanged") });
                  setCurrentPassword("");
                  setNewPassword("");
                } catch (err) {
                  setPasswordMsg({ ok: false, text: err instanceof Error ? err.message : t("error.generic") });
                }
              }}
            >
              <div className="min-w-60 flex-1">
                <Input
                  label={t("settings.currentPassword")}
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Current password"
                />
              </div>
              <div className="min-w-60 flex-1">
                <Input
                  label={t("settings.newPassword")}
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                />
              </div>
              <Button type="submit" disabled={!currentPassword || newPassword.length < 8}>{t("settings.update")}</Button>
            </form>
            {passwordMsg && (
              <p role="status" className={cn("mt-3 text-sm", passwordMsg.ok ? "text-success" : "text-danger")}>
                {passwordMsg.text}
              </p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-display font-semibold">{t("settings.yourData")}</h2>
            <p className="mt-1 text-sm text-ink-soft">{t("settings.dataDesc")}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="outline" onClick={exportData}><Download className="h-4 w-4" /> {t("settings.export")}</Button>
              <Button variant="danger" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4" /> {t("settings.delete")}</Button>
            </div>
          </Card>
        </div>
      )}

      {/* ----------------------------- Learning ----------------------------- */}
      {tab === "learning" && (
        <div className="space-y-4" role="tabpanel" id="settings-tabs-panel-learning" aria-labelledby="settings-tabs-tab-learning" tabIndex={0}>
          <Card className="p-5">
            <h2 className="font-display font-semibold">{t("settings.goals")}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Select label={t("settings.dailyGoal")} value={String(s.dailyGoalMin)} onChange={(e) => s.set({ dailyGoalMin: Number(e.target.value) })}>
                {[15, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{t("settings.minutes", { n: String(m) })}</option>)}
              </Select>
              <Select label={t("settings.newWordsPerDay")} value={String(s.newWordsPerDay)} onChange={(e) => s.set({ newWordsPerDay: Number(e.target.value) })}>
                {[4, 8, 12, 20].map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
              <Select label={t("settings.maxReviews")} value={String(s.maxReviewsPerDay)} onChange={(e) => s.set({ maxReviewsPerDay: Number(e.target.value) })}>
                {[20, 40, 60, 100, 200].map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="font-display font-semibold">{t("settings.learningLanguage")}</h2>
            <p className="mt-1 text-sm text-ink-soft">{t("settings.learningLanguageDesc")}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Select label={t("settings.learningLanguage")} value={s.language} onChange={(e) => setLearningLanguage(e.target.value as LanguageCode)}>
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>{lang.nativeName} ({lang.name})</option>
                ))}
              </Select>
            </div>
          </Card>
          {(() => {
              const exams = LANGUAGES.find(l => l.code === s.language)?.examTypes ?? [];
              if (exams.length <= 1) return null;
              return (
                <Card className="p-5">
                  <h2 className="font-display font-semibold">{t("settings.examProgram")}</h2>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Select label={t("settings.targetExam")} value={s.activeExamType} onChange={(e) => {
                      const et = e.target.value as ExamType;
                      s.set({ activeExamType: et });
                      if (s.language === "zh") s.setDisplayMode({ script: et === "tocfl" ? "traditional" : "simplified" });
                    }}>
                      {exams.map((et) => (
                        <option key={et} value={et}>{examConfig.abbreviations[et] || examConfig.displayNames[et] || et}</option>
                      ))}
                    </Select>
                  </div>
                </Card>
              );
            })()}
          {s.language === "zh" && (
            <Card className="p-5">
              <h2 className="font-display font-semibold">{t("settings.chineseDisplay")}</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Select label={t("settings.script")} value={s.displayMode.script} onChange={(e) => s.setDisplayMode({ script: e.target.value as "simplified" })}>
                  <option value="simplified">{t("settings.simplified")}</option>
                  <option value="traditional">{t("settings.traditional")}</option>
                </Select>
                <Select label={t("settings.hanziSize")} value={s.hanziSize} onChange={(e) => s.set({ hanziSize: e.target.value as "lg" })}>
                  <option value="md">{t("settings.normal")}</option>
                  <option value="lg">{t("settings.large")}</option>
                  <option value="xl">{t("settings.veryLarge")}</option>
                </Select>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-ink-soft mb-2">{t("settings.displayMode")}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {orderedDisplayModes((m) => t(`settings.displayMode.${m}`), locale).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => s.setDisplayMode({ mode })}
                      aria-pressed={s.displayMode.mode === mode}
                      className={cn(
                        "rounded-[var(--radius)] border px-3.5 py-2.5 text-left text-sm transition-colors cursor-pointer",
                        s.displayMode.mode === mode ? "border-accent bg-accent-soft" : "border-line bg-raised hover:border-line-strong"
                      )}
                    >
                      <span className="block font-medium">
                        {mode === "hanyu+trans" && t("settings.displayMode.hanyu+trans")}
                        {mode === "zhuyin+trans" && t("settings.displayMode.zhuyin+trans")}
                        {mode === "hanyu" && t("settings.displayMode.hanyu")}
                        {mode === "zhuyin" && t("settings.displayMode.zhuyin")}
                        {mode === "all" && t("settings.displayMode.all")}
                        {mode === "none" && t("settings.displayMode.none")}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-faint">
                        {mode === "hanyu+trans" && "你好 (nǐ hǎo) = hello"}
                        {mode === "zhuyin+trans" && "你好 (ㄋㄧˇ ㄏㄠˇ) = hello"}
                        {mode === "hanyu" && "你好 (nǐ hǎo)"}
                        {mode === "zhuyin" && "你好 (ㄋㄧˇ ㄏㄠˇ)"}
                        {mode === "all" && "你好 (nǐ hǎo | ㄋㄧˇ ㄏㄠˇ) = hello"}
                        {mode === "none" && "你好"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <Toggle
                  label={`${t("settings.adaptiveByLevel")} (${examConfig.abbreviations[s.activeExamType] || examConfig.displayNames[s.activeExamType] || s.activeExamType})`}
                  description={`${t("settings.adaptiveDesc")} (${examConfig.abbreviations[s.activeExamType] || examConfig.displayNames[s.activeExamType] || s.activeExamType})`}
                  checked={s.displayMode.adaptiveByLevel}
                  onChange={(v) => s.setDisplayMode({ adaptiveByLevel: v })}
                />
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ------------------------------ Appearance ------------------------------ */}
      {tab === "appearance" && (
        <div className="space-y-4" role="tabpanel" id="settings-tabs-panel-appearance" aria-labelledby="settings-tabs-tab-appearance" tabIndex={0}>
          <Card className="p-5">
            <h2 className="font-display font-semibold">{t("settings.theme")}</h2>
            <div className="mt-4 flex gap-1 rounded-[var(--radius)] border border-line bg-sunken p-1">
              <button
                onClick={() => s.set({ mode: "light" })}
                aria-pressed={s.mode === "light"}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                  s.mode === "light" ? "bg-raised border border-line text-ink" : "text-ink-faint hover:text-ink"
                )}
              >
                <Sun className="h-4 w-4" />
                {t("settings.modeLight")}
              </button>
              <button
                onClick={() => s.set({ mode: "dark" })}
                aria-pressed={s.mode === "dark"}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                  s.mode === "dark" ? "bg-raised border border-line text-ink" : "text-ink-faint hover:text-ink"
                )}
              >
                <Moon className="h-4 w-4" />
                {t("settings.modeDark")}
              </button>
            </div>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {THEMES.map((tm) => (
                <button
                  key={tm.id}
                  onClick={() => s.set({ theme: tm.id, focusMode: false })}
                  aria-pressed={s.theme === tm.id && !s.focusMode}
                  className={cn(
                    "rounded-[var(--radius)] border px-4 py-3 text-left transition-colors cursor-pointer",
                    s.theme === tm.id && !s.focusMode ? "border-accent bg-accent-soft" : "border-line bg-raised hover:border-line-strong"
                  )}
                >
                  <span className="block text-sm font-medium">{t(`themes.${tm.id}.name`)}</span>
                  <span className="mt-0.5 block text-xs text-ink-faint">{t(`themes.${tm.id}.description`)}</span>
                </button>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="font-display font-semibold">{t("settings.textDensity")}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Select label={t("settings.fontSize")} value={s.fontSize} onChange={(e) => s.set({ fontSize: e.target.value as "md" })}>
                <option value="sm">{t("settings.small")}</option>
                <option value="md">{t("settings.normal")}</option>
                <option value="lg">{t("settings.large")}</option>
                <option value="xl">{t("settings.veryLarge")}</option>
              </Select>
              <Select label={t("settings.density")} value={s.density} onChange={(e) => s.set({ density: e.target.value as "comfortable" })}>
                <option value="comfortable">{t("settings.comfortable")}</option>
                <option value="compact">{t("settings.compact")}</option>
              </Select>
            </div>
            <div className="mt-2 divide-y divide-line">
              <Toggle label={t("settings.focusMode")} description={t("settings.focusDesc")} checked={s.focusMode} onChange={(v) => s.set({ focusMode: v })} />
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="font-display font-semibold">{t("settings.language")}</h2>
            <div className="mt-4">
              <Select label={t("lang.label")} value={locale} onChange={(e) => setLocale(e.target.value as "en" | "id")}>
                <option value="en">{t("lang.en")}</option>
                <option value="id">{t("lang.id")}</option>
              </Select>
            </div>
          </Card>
        </div>
      )}

      {/* -------------------------------- Sound -------------------------------- */}
      {tab === "sound" && (
        <Card className="p-5" role="tabpanel" id="settings-tabs-panel-sound" aria-labelledby="settings-tabs-tab-sound" tabIndex={0}>
            <h2 className="font-display font-semibold">{t("settings.audio")}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Select label={t("settings.voiceSpeed")} value={String(s.audioRate)} onChange={(e) => s.set({ audioRate: Number(e.target.value) })}>
                <option value="0.6">{t("settings.voiceSlow")}</option>
                <option value="0.85">{t("settings.voiceDidactic")}</option>
                <option value="1">{t("settings.voiceNatural")}</option>
              </Select>
              <Select label={t("settings.voiceGender")} value={s.voiceGender} onChange={(e) => s.set({ voiceGender: e.target.value as "female" | "male" })}>
                <option value="female">{t("settings.female")}</option>
                <option value="male">{t("settings.male")}</option>
              </Select>
            </div>
            <div className="mt-2 divide-y divide-line">
              <Toggle label={t("settings.autoplay")} description={t("settings.autoplayDesc")} checked={s.autoplayAudio} onChange={(v) => s.set({ autoplayAudio: v })} />
              <Toggle label={t("settings.soundEffects")} description={t("settings.soundEffectsDesc")} checked={s.soundEffects} onChange={(v) => s.set({ soundEffects: v })} />
            </div>
            <p className="mt-4 text-xs text-ink-faint">
              Voice gender preference applies to all generated audio. Voices follow each lesson&apos;s locale:
              Chinese uses Mandarin (zh-CN) / Taiwanese Mandarin (zh-TW), German (de-DE), English (en-US), Japanese (ja-JP).
              Fallback: your browser&apos;s speech synthesis.
            </p>
        </Card>
      )}

      {/* ---------------------------- Notifications ---------------------------- */}
      {tab === "notifications" && (
        <Card className="p-5" role="tabpanel" id="settings-tabs-panel-notifications" aria-labelledby="settings-tabs-tab-notifications" tabIndex={0}>
            <h2 className="font-display font-semibold">{t("settings.reminders")}</h2>
            <div className="mt-2 divide-y divide-line">
              <Toggle label={t("settings.dailyReminder")} description={t("settings.dailyReminderDesc")} checked={s.dailyReminder} onChange={(v) => s.set({ dailyReminder: v })} />
              <Toggle label={t("settings.streakAlerts")} description={t("settings.streakAlertsDesc")} checked={s.streakAlerts} onChange={(v) => s.set({ streakAlerts: v })} />
              <Toggle label={t("settings.weeklySummary")} description={t("settings.weeklySummaryDesc")} checked={s.weeklySummary} onChange={(v) => s.set({ weeklySummary: v })} />
            </div>
            {s.dailyReminder && (
              <div className="mt-4 max-w-48">
                <Input label={t("settings.reminderTime")} type="time" value={s.reminderTime} onChange={(e) => s.set({ reminderTime: e.target.value })} />
              </div>
            )}
            <p className="mt-4 text-xs text-ink-faint">
              Notifications are shown within the app. System push notifications require installing the
              app as a PWA and granting browser permission.
            </p>
        </Card>
      )}

      {/* ------------------------------ Privacy ------------------------------ */}
      {tab === "privacy" && (
        <Card className="p-5" role="tabpanel" id="settings-tabs-panel-privacy" aria-labelledby="settings-tabs-tab-privacy" tabIndex={0}>
            <h2 className="font-display font-semibold">{t("settings.privacy")}</h2>
            <div className="mt-2 divide-y divide-line">
              <Toggle label={t("settings.publicProfile")} description={t("settings.publicProfileDesc")} checked={s.publicProfile} onChange={(v) => s.set({ publicProfile: v })} />
              <Toggle label={t("settings.visibleStats")} description={t("settings.visibleStatsDesc")} checked={s.showStats} onChange={(v) => s.set({ showStats: v })} />
            </div>
            <p className="mt-4 text-sm text-ink-soft">
              Your learning data is only used to personalize your itinerary. You can export or delete it in
              the Account tab. No analytics are activated without your consent.
            </p>
        </Card>
      )}

      {/* ----------------------------- Accessibility ----------------------------- */}
      {tab === "accessibility" && (
        <Card className="p-5" role="tabpanel" id="settings-tabs-panel-accessibility" aria-labelledby="settings-tabs-tab-accessibility" tabIndex={0}>
            <h2 className="font-display font-semibold">{t("settings.accessibility")}</h2>
            <div className="mt-2 divide-y divide-line">
              <Toggle label={t("settings.reduceMotion")} description={t("settings.reduceMotionDesc")} checked={s.reduceMotion} onChange={(v) => s.set({ reduceMotion: v })} />
              <Toggle label={t("settings.highContrast")} description={t("settings.highContrastDesc")} checked={s.highContrast} onChange={(v) => { s.set({ highContrast: v, ...(v ? { theme: "focus" as const } : {}) }); }} />
            </div>
            <ul className="mt-4 space-y-1 text-sm text-ink-soft">
              <li>· The entire app is keyboard navigable (Tab and arrows in lessons).</li>
              <li>· Audio always has visible text transcription.</li>
              <li>· Font and hanzi sizes can be adjusted in Appearance and Learning.</li>
            </ul>
        </Card>
      )}

      {/* Delete account modal */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title={t("settings.deleteTitle")}>
        <p className="text-sm text-ink-soft">
          {t("settings.deleteDesc")}
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteOpen(false)}>{t("common.cancel")}</Button>
          <Button
            variant="danger"
            onClick={async () => {
              progress.resetAll();
              await signOut();
              router.push("/");
            }}
          >
            {t("settings.deletePermanently")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
