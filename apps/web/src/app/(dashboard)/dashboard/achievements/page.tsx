"use client"

import { useMounted } from "@/lib/use-mounted"
import { useEffect } from "react"
import { Award } from "lucide-react"
import { useAchievements } from "@/lib/achievements"
import { useProgress } from "@/stores/progress"
import { cn } from "@/lib/utils"
import { Badge, SectionHeader, StatCard } from "@/components/ui"
import { useTranslation } from "@/i18n/locale-context"

const CATEGORY_KEYS: Record<string, string> = {
  start: "achievements.cat.start",
  consistency: "achievements.cat.consistency",
  vocabulary: "nav.vocabulary",
  characters: "nav.characters",
  hsk: "achievements.cat.hsk",
  skill: "achievements.cat.skill",
  dedication: "achievements.cat.dedication",
}

export default function AchievementsPage() {
  const progress = useProgress()
  const { t } = useTranslation()
  const mounted = useMounted()
  const ACHIEVEMENTS = useAchievements()
  useEffect(() => {
    progress.unlockAchievements()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  if (!mounted) return null

  const unlocked = Object.keys(progress.achievements).length
  const categories = [...new Set(ACHIEVEMENTS.map((a) => a.category))]

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title={t("nav.achievements")}
        subtitle={t("achievements.subtitle")}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label={t("achievements.unlocked")}
          value={`${unlocked} / ${ACHIEVEMENTS.length}`}
        />
        <StatCard
          label={t("achievements.xpFromAchievements")}
          value={ACHIEVEMENTS.filter((a) => progress.achievements[a.id]).reduce(
            (s, a) => s + a.xp,
            0
          )}
        />
        <StatCard
          label={t("achievements.currentStreak")}
          value={t("common.days", { n: String(progress.streak) })}
        />
      </div>

      {categories.map((cat) => (
        <section key={cat} className="mb-8">
          <h2 className="mb-3 font-display text-lg font-semibold">
            {t(CATEGORY_KEYS[cat])}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ACHIEVEMENTS.filter((a) => a.category === cat).map((a) => {
              const unlockedAt = progress.achievements[a.id]
              return (
                <div
                  key={a.id}
                  className={cn(
                    "flex items-center gap-3.5 rounded-[var(--radius)] border p-4",
                    unlockedAt
                      ? "border-line bg-raised"
                      : "border-line bg-sunken/40 opacity-55"
                  )}
                >
                  <span
                    className={cn(
                      "bg-surface flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius)] border border-line text-accent",
                      !unlockedAt && "opacity-55 grayscale"
                    )}
                  >
                    <Award className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">{a.title}</p>
                    <p className="text-xs text-ink-faint">{a.description}</p>
                    {unlockedAt ? (
                      <p className="mt-1 text-xs text-jade">
                        {t("achievements.earned", {
                          date: new Date(unlockedAt).toLocaleDateString("en"),
                          xp: String(a.xp),
                        })}
                      </p>
                    ) : (
                      <Badge className="mt-1">
                        {t("achievements.xp", { xp: String(a.xp) })}
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
