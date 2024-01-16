"use client";

import Link from "next/link";
import { Activity, Award, BookOpen, Brain, Headphones, Mic, PenLine } from "lucide-react";
import { NaviaChip } from "@/components/marketing/navia-chip";
import { Float3D } from "@/components/marketing/tilt-card";
import { Reveal } from "@/components/ui";
import { useTranslation } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";

const CHIP_TONES = ["bauhaus-chip-red", "bauhaus-chip-blue", "bauhaus-chip-yellow", "bauhaus-chip-ink"] as const;

const MODULES = [
  { key: "srs", icon: Brain },
  { key: "pronunciation", icon: Mic },
  { key: "reading", icon: BookOpen },
  { key: "listening", icon: Headphones },
  { key: "writing", icon: PenLine },
  { key: "achievements", icon: Award },
  { key: "stats", icon: Activity },
] as const;

export default function FeaturesPage() {
  const { t } = useTranslation();
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" aria-hidden>
          <div className="absolute left-[-12%] top-[-20%] h-[28rem] w-[28rem] rounded-full bg-[var(--bauhaus-red)]/20 blur-3xl" />
          <div className="absolute right-[-10%] top-[10%] h-[26rem] w-[26rem] rounded-full bg-[var(--bauhaus-blue)]/20 blur-3xl" />
          <div className="absolute bottom-[-30%] left-[30%] h-80 w-80 rounded-full bg-[var(--bauhaus-yellow)]/20 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(20,22,27,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(20,22,27,0.045)_1px,transparent_1px)] bg-[size:56px_56px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 md:pb-24 md:pt-24">
          <Reveal>
            <span className="bauhaus-chip bauhaus-chip-ink inline-flex items-center gap-2">
              <NaviaChip className="h-4 w-6" />
              {t("nav.features")}
            </span>
            <h1 className="font-display mt-6 max-w-3xl text-display-xl leading-[0.98] tracking-tight text-ink">
              {t("modules.title")}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">{t("modules.subtitle")}</p>
          </Reveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" style={{ perspective: 1000 }}>
            {MODULES.map(({ key, icon: Icon }, i) => (
              <Reveal key={key} delay={(i % 4) * 0.06}>
                <Float3D className="h-full" tilt={7}>
                  <div className="group h-full scroll-mt-28 border border-line bg-sunken shadow-neo">
                    <div className="border-b border-line p-6">
                      <span className={cn("bauhaus-chip inline-flex", CHIP_TONES[i % CHIP_TONES.length])}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <h2 className="font-display mt-5 text-xl font-semibold tracking-tight text-ink">
                        {t(`module.${key}`)}
                      </h2>
                    </div>
                    <p className="p-6 pt-4 text-sm leading-relaxed text-ink-soft">{t(`module.${key}Desc`)}</p>
                  </div>
                </Float3D>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-sunken">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 md:py-20">
          <Reveal>
            <h2 className="font-display text-display-lg tracking-tight text-ink">{t("cta.title")}</h2>
            <p className="mx-auto mt-4 max-w-xl text-ink-soft">{t("cta.subtitle")}</p>
            <Link
              href="/register"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-[var(--radius)] bg-accent px-6 py-3 font-medium text-accent-ink transition-transform hover:-translate-y-0.5"
            >
              {t("cta.button")}
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}