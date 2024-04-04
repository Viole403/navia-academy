"use client";

import { useMounted } from "@/lib/use-mounted";
import Link from "next/link";
import { Award, Calendar, Clock, Flame, Settings } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { srsFor, useProgress } from "@/stores/progress";
import { useSettings } from "@/stores/settings";
import { learnedCount, totalMinutes } from "@/lib/derived";
import { useAchievements } from "@/lib/achievements";
import { EXAM_DISPLAY_NAMES, useExamConfig } from "@/lib/exam-definitions";
import { GENERAL_LEVEL_LABELS } from "@/types";
import { Badge, Button, Card, SectionHeader, StatCard } from "@/components/ui";
import { useTranslation } from "@/i18n/locale-context";

export default function ProfilePage() {
  const { user } = useAuth();
  const progress = useProgress();
  const publicProfile = useSettings((s) => s.publicProfile);
  const language = useSettings((s) => s.language);
  const activeExamType = useSettings((s) => s.activeExamType);
  const { t } = useTranslation();
  const mounted = useMounted();
  const ACHIEVEMENTS = useAchievements();
  useExamConfig();
  if (!mounted || !user) return null;

  const total = totalMinutes(progress.sessions);
  const examLabel = EXAM_DISPLAY_NAMES[activeExamType] ?? activeExamType;
  const unlockedAchievements = ACHIEVEMENTS.filter((a) => progress.achievements[a.id]);
  const initials = user.displayName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title={t("nav.profile")}
        subtitle={t("profile.subtitle")}
        action={
          <Link href="/dashboard/settings">
            <Button variant="outline" size="sm"><Settings className="h-4 w-4" /> {t("profile.editSettings")}</Button>
          </Link>
        }
      />

      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-5">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-2xl font-bold text-accent-ink" aria-hidden>
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl font-bold">{user.displayName}</h2>
            <p className="text-sm text-ink-faint">{user.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="accent">{examLabel}</Badge>
              {progress.placement && <Badge>{GENERAL_LEVEL_LABELS[progress.placement.generalLevel]}</Badge>}
              <Badge tone="gold">{t("profile.level", { level: String(progress.levelFromXp()), xp: String(progress.xp) })}</Badge>
              <Badge>{publicProfile ? t("settings.publicProfile") : t("profile.privateProfile")}</Badge>
            </div>
          </div>
        </div>
        {progress.startedAt && (
          <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-faint">
            <Calendar className="h-3.5 w-3.5" />{" "}
            {t("profile.studyingSince", { date: new Date(progress.startedAt).toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric" }) })}
          </p>
        )}
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("profile.studyTime")} value={Math.floor(total / 60)} sub={`${total % 60} min`} icon={<Clock className="h-4 w-4" />} />
        <StatCard label={t("dashboard.streak")} value={t("common.days", { n: String(progress.streak) })} sub={t("profile.bestStreak", { n: String(progress.bestStreak) })} icon={<Flame className="h-4 w-4" />} />
        <StatCard label={t("dashboard.words")} value={learnedCount(srsFor(progress, language), "word")} />
        <StatCard label={t("nav.achievements")} value={`${unlockedAchievements.length}/${ACHIEVEMENTS.length}`} icon={<Award className="h-4 w-4" />} />
      </div>

      {unlockedAchievements.length > 0 && (
        <Card className="mt-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold">{t("profile.sealShowcase")}</h2>
            <Link href="/dashboard/achievements" className="text-xs font-medium text-accent hover:underline">{t("profile.viewAll")}</Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {unlockedAchievements.slice(0, 12).map((a) => (
              <span key={a.id} className="flex h-12 w-12 items-center justify-center rounded-[var(--radius)] border border-line bg-surface text-accent" title={a.title}>
                <Award className="h-6 w-6" />
              </span>
            ))}
          </div>
        </Card>
      )}

      {progress.placement && (
        <Card className="mt-4 p-5">
          <h2 className="font-display font-semibold">{t("profile.latestAssessment")}</h2>
          <p className="mt-2 text-sm text-ink-soft">
            {t("profile.assessmentSummary", {
              date: new Date(progress.placement.takenAt).toLocaleDateString("en"),
              correct: String(progress.placement.correctCount),
              answered: String(progress.placement.answeredCount),
              level: progress.placement.confidence === "high" ? t("profile.confidence.high") : progress.placement.confidence === "medium" ? t("profile.confidence.medium") : t("profile.confidence.low"),
            })}
          </p>
          <Link href="/dashboard/placement-test" className="mt-3 inline-block">
            <Button variant="outline" size="sm">{t("profile.retakePlacement")}</Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
