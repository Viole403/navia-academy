"use client";

import { useEffect } from "react";
import { useMounted } from "@/lib/use-mounted";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useProgress } from "@/stores/progress";
import { Logo } from "@/components/ui/logo";
import { useSettings } from "@/stores/settings";
import { Button, ProgressBar } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/locale-context";
import { LANGUAGES, languageInfo } from "@/lib/languages";
import { setLearningLanguage } from "@/lib/language-context";
import type { ExamType, LanguageCode, OnboardingData } from "@/types";
import { usePlacement } from "@/lib/placement";

interface StepDef {
  id: string;
  titleKey: string;
  subtitleKey: string;
}

const STEPS: StepDef[] = [
  { id: "welcome", titleKey: "onboarding.step.welcome.title", subtitleKey: "onboarding.step.welcome.subtitle" },
  { id: "language", titleKey: "onboarding.step.language.title", subtitleKey: "onboarding.step.language.subtitle" },
  { id: "experience", titleKey: "onboarding.step.experience.title", subtitleKey: "onboarding.step.experience.subtitle" },
  { id: "motivation", titleKey: "onboarding.step.motivation.title", subtitleKey: "onboarding.step.motivation.subtitle" },
  { id: "time", titleKey: "onboarding.step.time.title", subtitleKey: "onboarding.step.time.subtitle" },
  { id: "placement", titleKey: "onboarding.step.placement.title", subtitleKey: "onboarding.step.placement.subtitle" },
];

const MOTIVATIONS = [
  { id: "culture", labelKey: "onboarding.motivation.culture" },
  { id: "work", labelKey: "onboarding.motivation.work" },
  { id: "travel", labelKey: "onboarding.motivation.travel" },
  { id: "live", labelKey: "onboarding.motivation.live" },
  { id: "exam", labelKey: "onboarding.motivation.exam" },
  { id: "family", labelKey: "onboarding.motivation.family" },
  { id: "studies", labelKey: "onboarding.motivation.studies" },
  { id: "conversation", labelKey: "onboarding.motivation.conversation" },
  { id: "challenge", labelKey: "onboarding.motivation.challenge" },
  { id: "media", labelKey: "onboarding.motivation.media" },
];

function OptionGrid<T extends string>({
  options,
  value,
  onSelect,
  cols = 2,
}: {
  options: { id: T; label: string; desc?: string }[];
  value: T | undefined;
  onSelect: (v: T) => void;
  cols?: number;
}) {
  return (
    <div className={cn("grid gap-2.5", cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onSelect(o.id)}
          aria-pressed={value === o.id}
          className={cn(
            "rounded-[var(--radius)] border px-4 py-3 text-left transition-colors cursor-pointer",
            value === o.id ? "border-accent bg-accent-soft" : "border-line bg-raised hover:border-line-strong"
          )}
        >
          <span className={cn("flex items-center justify-between text-sm font-medium", value === o.id && "text-accent")}>
            {o.label}
            {value === o.id && <Check className="h-4 w-4" />}
          </span>
          {o.desc && <span className="mt-0.5 block text-xs text-ink-faint">{o.desc}</span>}
        </button>
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const onboarding = useProgress((s) => s.onboarding);
  const setOnboarding = useProgress((s) => s.setOnboarding);
  const hydrated = useProgress((s) => s.hydrated);
  const settings = useSettings();
  const mounted = useMounted();
  const placementBank = usePlacement();

  // Completed users must not be able to re-enter onboarding (even via manual URL).
  useEffect(() => {
    if (hydrated && onboarding.completed) router.replace("/dashboard");
  }, [hydrated, onboarding.completed, router]);

  const step = Math.min(onboarding.step, STEPS.length - 1);
  const def = STEPS[step];
  const patch = (p: Partial<OnboardingData>) => setOnboarding(p);
  const go = (delta: number) => setOnboarding({ step: Math.max(0, step + delta) });

  // Guard: wait for mount + hydration, and bounce completed users back.
  if (!mounted || !hydrated || onboarding.completed) return null;

  const canContinue = (() => {
    switch (def.id) {
      case "experience": return !!onboarding.experience;
      case "motivation": return !!onboarding.motivation;
      case "time": return !!onboarding.minutesPerDay;
      default: return true;
    }
  })();

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-4 py-10">
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs text-ink-faint">
          <span>{t("onboarding.stepOf", { n: String(step + 1), total: String(STEPS.length) })}</span>
          <Logo className="h-6 w-6" alt="" aria-hidden />
        </div>
        <ProgressBar className="mt-2" value={step + 1} max={STEPS.length} label={t("onboarding.progress")} />
      </div>

      <div className="flex-1 animate-fade-up" key={def.id}>
        <h1 className="font-display text-2xl font-bold">{t(def.titleKey)}</h1>
        <p className="mt-1.5 text-ink-soft">{t(def.subtitleKey)}</p>

        <div className="mt-8">
          {def.id === "welcome" && (
            <div className="space-y-4 text-sm leading-relaxed text-ink-soft">
              <p>
                {t("onboarding.welcomeIntro", { name: user?.displayName ? `, ${user.displayName.split(" ")[0]}` : "" })}
              </p>
              <p>{t("onboarding.answersSaved")}</p>
            </div>
          )}

          {def.id === "language" && (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLearningLanguage(lang.code as LanguageCode)}
                  aria-pressed={settings.language === lang.code}
                  className={cn(
                    "rounded-[var(--radius)] border px-4 py-3 text-left transition-colors cursor-pointer",
                    settings.language === lang.code ? "border-accent bg-accent-soft" : "border-line bg-raised hover:border-line-strong"
                  )}
                >
                  <span className={cn("flex items-center justify-between text-sm font-medium", settings.language === lang.code && "text-accent")}>
                    <span>{lang.nativeName} <span className="font-normal text-ink-faint">· {lang.name}</span></span>
                    {settings.language === lang.code && <Check className="h-4 w-4" />}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-faint">
                    {lang.examTypes.map((e) => e.toUpperCase()).join(" / ")}
                  </span>
                </button>
              ))}
            </div>
          )}

          {def.id === "motivation" && (
            <OptionGrid
              options={MOTIVATIONS.map((m) => ({ id: m.id, label: t(m.labelKey) }))}
              value={onboarding.motivation}
              onSelect={(v) => {
                patch({ motivation: v });
                if (v === "exam") settings.set({ activeExamType: languageInfo(settings.language).examTypes[0] as ExamType });
              }}
            />
          )}

          {def.id === "experience" && (
            <OptionGrid
              options={[
                { id: "none", label: t("onboarding.experience.none"), desc: t("onboarding.experience.none.desc") },
                { id: "some-pinyin", label: t("onboarding.experience.basic"), desc: t("onboarding.experience.basic.desc") },
                { id: "beginner", label: t("onboarding.experience.beginner"), desc: t("onboarding.experience.beginner.desc") },
                { id: "conversational", label: t("onboarding.experience.conversational"), desc: t("onboarding.experience.conversational.desc") },
                { id: "intermediate", label: t("onboarding.experience.intermediate"), desc: t("onboarding.experience.intermediate.desc") },
                { id: "advanced", label: t("onboarding.experience.advanced"), desc: t("onboarding.experience.advanced.desc") },
              ]}
              value={onboarding.experience}
              onSelect={(v) => patch({ experience: v as OnboardingData["experience"] })}
            />
          )}

          {def.id === "time" && (
            <OptionGrid
              options={[
                { id: "15", label: t("onboarding.time.15"), desc: t("onboarding.time.15.desc") },
                { id: "30", label: t("onboarding.time.30"), desc: t("onboarding.time.30.desc") },
                { id: "60", label: t("onboarding.time.60"), desc: t("onboarding.time.60.desc") },
                { id: "120", label: t("onboarding.time.120"), desc: t("onboarding.time.120.desc") },
              ]}
              value={onboarding.minutesPerDay ? String(onboarding.minutesPerDay) as "15" : undefined}
              onSelect={(v) => patch({ minutesPerDay: Number(v) })}
            />
          )}

          {def.id === "placement" && (
            placementBank.length > 0 ? (
              <div className="space-y-4 text-sm leading-relaxed text-ink-soft">
                <p>{t("onboarding.placementIntro")}</p>
                <p>{t("onboarding.placementOutcome")}</p>
              </div>
            ) : (
              <div className="space-y-4 text-sm leading-relaxed text-ink-soft">
                <p>{t("onboarding.placementUnavailable")}</p>
              </div>
            )
          )}
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button variant="ghost" onClick={() => go(-1)}>
            <ArrowLeft className="h-4 w-4" /> {t("onboarding.back")}
          </Button>
        ) : (
          <span />
        )}

        {def.id === "placement" ? (
          placementBank.length > 0 ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setOnboarding({ completed: true });
                  router.push("/dashboard");
                }}
              >
                {t("onboarding.skipTest")}
              </Button>
              <Button onClick={() => router.push("/dashboard/placement-test")}>
                {t("onboarding.takeTest")} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => {
                setOnboarding({ completed: true });
                router.push("/dashboard");
              }}
            >
              {t("onboarding.startLearning")} <ArrowRight className="h-4 w-4" />
            </Button>
          )
        ) : (
          <Button onClick={() => go(1)} disabled={!canContinue}>
            {t("lesson.continue")} <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </main>
  );
}
