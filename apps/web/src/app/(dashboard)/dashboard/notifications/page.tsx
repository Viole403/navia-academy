"use client";

import { useMounted } from "@/lib/use-mounted";
import { useMemo } from "react";
import { Award, Bell, ClipboardList, Flame } from "lucide-react";
import { useProgress, srsFor } from "@/stores/progress";
import { useSettings } from "@/stores/settings";
import { useAchievements } from "@/lib/achievements";
import { dueCards } from "@/lib/derived";
import { todayISO } from "@/lib/utils";
import { Card, EmptyState, SectionHeader } from "@/components/ui";
import { useTranslation } from "@/i18n/locale-context";

interface Notice {
  id: string;
  icon: typeof Bell;
  title: string;
  body: string;
  at?: string;
}

export default function NotificationsPage() {
  const progress = useProgress();
  const settings = useSettings();
  const { t } = useTranslation();
  const mounted = useMounted();
  const ACHIEVEMENTS = useAchievements();

  const notices = useMemo<Notice[]>(() => {
    const out: Notice[] = [];
    const due = dueCards(srsFor(progress, settings.language));
    const today = todayISO();

    if (due.length > 0) {
      out.push({ id: "due", icon: Bell, title: t("notifications.pendingReviews", { n: String(due.length) }), body: t("notifications.dueBody") });
    }
    const overdue = progress.tasks.filter((t) => t.status !== "done" && t.dueDate < today);
    if (overdue.length > 0) {
      out.push({ id: "overdue", icon: ClipboardList, title: t("notifications.overdueTasks", { n: String(overdue.length) }), body: t("notifications.overdueBody") });
    }
    if (settings.streakAlerts && progress.streak > 0 && progress.lastStudyDate !== today) {
      out.push({ id: "streak", icon: Flame, title: t("notifications.streakAtStake", { n: String(progress.streak) }), body: t("notifications.streakBody") });
    }
    for (const [id, at] of Object.entries(progress.achievements).sort((a, b) => b[1].localeCompare(a[1])).slice(0, 10)) {
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      if (a) out.push({ id: `ach-${id}`, icon: Award, title: t("notifications.achievementUnlocked", { name: a.title }), body: `${a.description} (+${a.xp} XP)`, at });
    }
    return out;
  }, [progress, settings.streakAlerts, settings.language, t, ACHIEVEMENTS]);

  if (!mounted) return null;

  return (
    <div className="mx-auto max-w-2xl animate-fade-up">
      <SectionHeader  title={t("nav.notifications")} subtitle={t("notifications.subtitle")} />
      {notices.length === 0 ? (
        <EmptyState icon={<Bell className="h-10 w-10" />} title={t("notifications.allCaughtUp")} description={t("notifications.emptyDescription")} />
      ) : (
        <div className="space-y-2.5">
          {notices.map((n) => (
            <Card key={n.id} className="flex items-start gap-3.5 p-4">
              <n.icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
              <div>
                <p className="font-medium">{n.title}</p>
                <p className="text-sm text-ink-soft">{n.body}</p>
                {n.at && <p className="mt-0.5 text-xs text-ink-faint">{new Date(n.at).toLocaleDateString("en", { day: "numeric", month: "long" })}</p>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
