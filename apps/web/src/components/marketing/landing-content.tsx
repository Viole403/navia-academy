import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Compass, Loader2, Volume2 } from "lucide-react";
import { Highlighter } from "@/components/marketing/highlighter";
import { NaviaChip } from "@/components/marketing/navia-chip";
import { DriftOrb, Float3D } from "@/components/marketing/tilt-card";
import { Reveal, Marquee, NoiseOverlay } from "@/components/ui";
import { play, speak } from "@/lib/audio";
import {
  EXAM_LANGS,
  type ExamConfigBundle,
  type LandingStats,
  type VocabWord,
} from "@/lib/data-client";
import { languageInfo } from "@/lib/languages";
import { useTranslation } from "@/i18n/locale-context";
import { useSettings } from "@/stores/settings";
import { cn } from "@/lib/utils";
import { NumberTicker } from "@/components/marketing/number-ticker";
import { useTypeCycler, TypeCycle, type TypeCycleItem } from "@/components/marketing/type-cycle";

/* --------------------------------- Hero ---------------------------------- */

function Hero({
  examConfig,
  active,
  onActive,
  initialVocab = [],
  preview,
  placementTotal,
}: {
  examConfig: ExamConfigBundle | null;
  active: string;
  onActive: (exam: string) => void;
  initialVocab?: VocabWord[];
  preview?: Record<string, VocabWord[]>;
  placementTotal?: number;
}) {
  const { t, locale } = useTranslation();
  const settings = useSettings();
  const examTypes = useMemo(() => {
    if (examConfig) return examConfig.types;
    return languageInfo(settings.language).examTypes as string[];
  }, [examConfig, settings.language]);

  const activeLang = EXAM_LANGS[active] ?? languageInfo(settings.language).code;

  const vocab = useMemo<{ text: string; romanization?: string; gloss: string; key: string }[]>(() => {
    const toCard = (w: VocabWord) => ({
      text: w.text,
      romanization: w.romanization,
      gloss: locale === "id" && w.translation_id ? w.translation_id : w.translation,
      key: w.audio ?? `v:${w.id}`,
    });
    const words = preview?.[activeLang] ?? (activeLang === "zh" ? initialVocab : []);
    return words.slice(0, 3).map(toCard);
  }, [activeLang, initialVocab, locale, preview]);

  const displayName = (exam: string) => {
    const cfg = examConfig?.definitions?.[exam];
    if (cfg) return examNameLocal(cfg, locale);
    return exam.toUpperCase();
  };
  const chipColor = (exam: string) => examConfig?.badgeColors?.[exam] ?? "var(--accent)";

  const levelItems: TypeCycleItem[] = examConfig
    ? examConfig.types.map((exam) => {
        const lv = examConfig.definitions?.[exam]?.levels ?? [];
        const abbr = examConfig.abbreviations?.[exam] ?? exam.toUpperCase();
        return {
          text: lv.length ? `${abbr} ${lv[0]} → ${lv[lv.length - 1]}` : abbr,
          color: chipColor(exam),
          key: exam,
        };
      })
    : [
        { text: "HSK 1 → 7", key: "hsk" },
        { text: "TOCFL Novice 1 → Level 5", key: "tocfl" },
        { text: "Goethe A1 → C2", key: "goethe" },
        { text: "JLPT N5 → N1", key: "jlpt" },
        { text: "TOEFL iBT 0-30 → 101-120", key: "toefl" },
      ];
  const activeExamIndex = Math.max(0, (examConfig?.types ?? []).indexOf(active));
  const levelCycler = useTypeCycler(levelItems, { initialIndex: activeExamIndex });
  const cyclerExam = levelCycler.item.key ?? active;
  useEffect(() => {
    levelCycler.jumpTo(activeExamIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  const cyclerWords = examConfig?.wordTotals?.[cyclerExam];
  const MIN_WORDS = 500;
  const cyclerWordsLabel =
    cyclerWords != null ? `${cyclerWords.toLocaleString(locale === "id" ? "id-ID" : "en-US")} ${t("landing.wordsCount")}` : null;
  const showWordsChip = cyclerWordsLabel != null && cyclerWords! >= MIN_WORDS;
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0" aria-hidden>
        <DriftOrb seed={0} className="left-[-10%] top-[-20%] h-96 w-96 bg-[var(--bauhaus-red)]/20" />
        <DriftOrb seed={1} className="right-[-12%] top-[10%] h-[28rem] w-[28rem] bg-[var(--bauhaus-blue)]/20" />
        <DriftOrb seed={2} className="bottom-[-30%] left-[30%] h-80 w-80 bg-[var(--bauhaus-yellow)]/25" />
        <div className="bauhaus-grid absolute inset-0" />
        <NoiseOverlay />
      </div>
      <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 md:pb-32 md:pt-24">
        <div className="grid items-center gap-12 md:grid-cols-[1.05fr_1fr]">
          <div className="relative" style={{ perspective: 1000 }}>
            <Reveal>
              <span className="bauhaus-chip bauhaus-chip-ink inline-flex items-center gap-2">
                <NaviaChip className="h-4 w-6" />
                {t("hero.badge")}
              </span>
            </Reveal>
            <Reveal delay={60}>
              <h1 className="font-display mt-6 text-display-xl leading-[0.98] tracking-tight text-ink">
                {t("hero.title").split(". ").map((sentence, i) => (
                  <span key={i} className="block">
                    {i === 1 ? <span className="transition-colors duration-300" style={{ color: chipColor(active) }}>{sentence}</span> : sentence}
                  </span>
                ))}
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-6 text-lg leading-relaxed text-ink-soft">
                {t("landing.heroSubPre")}{" "}
                <Highlighter action="underline" color="var(--bauhaus-red)">
                  {t("landing.heroSubMark")}
                </Highlighter>{" "}
                {t("landing.heroSubTail")}
              </p>
            </Reveal>
            <Reveal delay={180}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/register" className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-accent px-6 py-3 font-semibold text-accent-ink transition-colors hover:bg-accent-strong">
                  {t("hero.cta")} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="#how-it-works" className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-line px-6 py-3 font-semibold text-ink transition-colors hover:bg-sunken">
                  {t("hero.secondaryCta")}
                </Link>
              </div>
              <p aria-hidden className="mt-5 font-mono text-xs text-ink-faint md:hidden">
                <TypeCycle items={levelItems} />
              </p>
              <p className="mt-3 text-xs text-ink-faint">{t("hero.note")}</p>
            </Reveal>
          </div>
          <div className="relative" style={{ perspective: 1000 }}>
            <Float3D className="relative">
              <div className="rounded-2xl border border-line bg-raised p-5 shadow-neo-lg" style={{ transformStyle: "preserve-3d" }}>
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-ink-faint">
                    <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: chipColor(active) }} />
                    {t("landing.heroPanel")}
                  </p>
                  <span className="text-xs font-medium text-ink-faint">{t("landing.heroPanelHint")}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label={t("landing.programsTitle")}>
                  {examTypes.map((exam) => (
                    <button
                      key={exam}
                      onClick={() => onActive(exam)}
                      aria-pressed={active === exam}
                      title={examConfig?.abbreviations?.[exam] !== displayName(exam) ? displayName(exam) : undefined}
                      className={cn(
                        "inline-flex min-h-11 items-center rounded-full border px-3 text-xs font-medium transition-all cursor-pointer",
                        active === exam
                          ? "border-transparent text-white"
                          : "border-line bg-sunken text-ink-soft hover:text-ink"
                      )}
                      style={active === exam ? { background: chipColor(exam) } : undefined}
                    >
                      {examConfig?.abbreviations?.[exam] ?? displayName(exam)}
                    </button>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  {vocab.map((w) => (
                    <div key={w.key} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-sunken/60 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-lg font-semibold text-ink">{w.text}</p>
                        {w.romanization && <p className="truncate text-xs text-ink-faint">{w.romanization}</p>}
                        <p className="truncate text-sm text-ink-soft">{w.gloss}</p>
                      </div>
                      <button
                        onClick={() => {
                          play(w.key, { onLoadingChange: (l) => setLoadingKey(l ? w.key : null), onError: () => speak(w.text) });
                        }}
                        disabled={loadingKey === w.key}
                        aria-label={`${w.text} — ${w.gloss}`}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink transition-colors hover:bg-accent-strong cursor-pointer"
                      >
                        {loadingKey === w.key ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Volume2 className="h-4 w-4" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </Float3D>
            <Float3D className="absolute -left-6 -top-8 hidden rotate-[-4deg] md:block" tilt={12}>
              <div
                className="bauhaus-chip px-4 py-2 text-xs font-bold text-white shadow-neo"
                style={{ background: levelCycler.item.color ?? chipColor(active), borderColor: "var(--bauhaus-black)" }}
              >
                <span>{levelCycler.text}</span>
                <span className="animate-pulse">▍</span>
              </div>
            </Float3D>
            {showWordsChip && (
              <Float3D className="absolute -right-6 -top-10 hidden rotate-[3deg] md:block" tilt={12}>
                <div className="bauhaus-chip bauhaus-chip-yellow px-4 py-2 text-xs font-bold text-ink shadow-[var(--shadow-neo)]">
                  <motion.span
                    key={cyclerExam}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {cyclerWordsLabel}
                  </motion.span>
                </div>
              </Float3D>
            )}
            <Float3D className="absolute -right-7 -bottom-9 hidden rotate-[4deg] md:block" tilt={12}>
              <div className="bauhaus-chip bauhaus-chip-blue px-4 py-2 text-xs font-bold text-white shadow-[var(--shadow-neo)]">
                SRS
              </div>
            </Float3D>
            <Float3D className="absolute -left-5 -bottom-8 hidden rotate-[-3deg] md:block" tilt={12}>
              <div className="bauhaus-chip bauhaus-chip-ink px-4 py-2 text-xs font-bold text-white shadow-[var(--shadow-neo)]">
                {t("landing.heroPlacement")} {placementTotal ?? 84}
              </div>
            </Float3D>
          </div>
        </div>
        <Marquee pauseOnHover className="mt-16 border-y border-line bg-sunken/40 py-3">
          {examTypes.map((exam) => {
            const lv = examConfig?.definitions?.[exam]?.levels ?? [];
            const abbr = examConfig?.abbreviations?.[exam] ?? exam.toUpperCase();
            return (
              <span key={exam} className="flex items-center gap-3 px-6">
                <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: chipColor(exam) }} />
                <span className="font-display text-xs font-bold uppercase tracking-widest text-ink-soft">
                  {lv.length ? `${abbr} ${lv[0]} → ${lv[lv.length - 1]}` : abbr}
                </span>
              </span>
            );
          })}
        </Marquee>
      </div>
    </section>
  );
}

const MONOGRAM: Record<string, string> = { hsk: "HSK", tocfl: "TCF", goethe: "GOE", jlpt: "JLT", toefl: "TOE" };

function examNameLocal(cfg: { name: string; nameCN?: string; name_de?: string; name_ja?: string; name_en?: string }, locale: string) {
  if (locale === "id") return cfg.name_en || cfg.name;
  return cfg.name;
}

/* ------------------------------- Stats strip ------------------------------ */

const FALLBACK_LESSONS: Record<string, number> = { zh: 59, de: 30, en: 13, ja: 12 };

function StatsStrip({
  initialStats,
  examCount,
  placementTotal,
}: {
  initialStats?: LandingStats;
  examCount?: number;
  placementTotal?: number;
}) {
  const { t } = useTranslation();
  const lessons = useMemo(() => {
    if (initialStats) {
      return Object.keys(FALLBACK_LESSONS).reduce(
        (sum, l) => sum + ((initialStats as Record<string, number>)[l] ?? FALLBACK_LESSONS[l]),
        0,
      );
    }
    return Object.values(FALLBACK_LESSONS).reduce((a, b) => a + b, 0);
  }, [initialStats]);

  const stats = [
    { value: examCount ?? 5, suffix: "", label: t("landing.statExams") },
    { value: new Set(Object.values(EXAM_LANGS)).size, suffix: "", label: t("landing.statLanguages") },
    { value: lessons, suffix: "+", label: t("landing.statLessons") },
    { value: placementTotal ?? 84, suffix: "+", label: t("landing.statPlacement") },
  ];

  return (
    <section className="border-y border-line bg-sunken/60">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-4 py-10 sm:px-6 md:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} className={cn("px-4 py-2 text-center", i > 0 && "md:border-l md:border-line")}>
            <p className="text-ink-faint text-xs font-medium uppercase tracking-widest">{s.label}</p>
            <p className="font-display mt-1 text-4xl font-bold text-ink tabular-nums"><NumberTicker value={s.value} />
              {s.suffix}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------- Programs -------------------------------- */

type ProgramItem = {
  type: string;
  name: string;
  levels: string[];
  words: number;
  color: string;
  focus: string[];
};

function ProgramCard({
  p,
  i,
}: {
  p: ProgramItem;
  i: number;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLElement | null>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const blobY = useTransform(scrollYProgress, [0, 1], [24, -24]);

  return (
    <Reveal delay={i * 70} className={cn(i === 0 && "lg:col-span-1")}>
      <Float3D tilt={6} className="h-full">
        <article
          ref={ref}
          className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-raised p-6 hover:shadow-neo-lg focus-visible:shadow-neo-lg"
          style={{ transform: `translateZ(${(i % 3) * 14}px)` }}
        >
          <span
            aria-hidden
            className="absolute right-0 top-0 h-24 w-24 -translate-y-12 translate-x-12 rounded-full opacity-15 transition-transform duration-500 group-hover:translate-y-[-4px]"
            style={{ background: p.color }}
          >
            <motion.span
              style={{ y: reduce ? 0 : blobY }}
              className="absolute inset-0 rounded-full"
            />
          </span>
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl font-display text-lg font-bold text-white shadow-[var(--shadow-neo)]" style={{ background: p.color }}>
              {MONOGRAM[p.type] ?? p.type.toUpperCase().slice(0, 3)}
            </span>
            <span className="text-xs font-medium text-ink-faint">{p.words} {t("landing.wordsCount")}</span>
          </div>
          <h3 className="mt-4 font-display text-xl font-bold text-ink">{p.name}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t("landing.programDesc", { type: p.name })}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {p.levels.map((lvl) => (
              <span key={lvl} className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-soft">
                {lvl}
              </span>
            ))}
          </div>
          {p.focus.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {p.focus.map((f) => (
                <span key={f} className="rounded-full bg-sunken px-3 py-1 text-xs font-medium text-ink-soft">
                  {f}
                </span>
              ))}
            </div>
          )}
          <div className="mt-auto pt-4">
            <Link href={`/features?program=${p.type}`} className="inline-flex items-center gap-2 text-sm font-semibold text-accent transition-colors hover:text-accent-strong">
              {t("landing.exploreProgram")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </article>
      </Float3D>
    </Reveal>
  );
}

function PlacementCard() {
  const { t } = useTranslation();
  const ref = useRef<HTMLElement | null>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const blobY = useTransform(scrollYProgress, [0, 1], [24, -24]);

  return (
    <Reveal delay={350}>
      <Float3D tilt={6} className="h-full">
        <article
          ref={ref}
          className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-dashed border-line-strong bg-sunken p-6 hover:shadow-neo-lg focus-visible:shadow-neo-lg"
        >
          <span
            aria-hidden
            className="absolute right-0 top-0 h-24 w-24 -translate-y-12 translate-x-12 rounded-full opacity-15 transition-transform duration-500 group-hover:translate-y-[-4px]"
            style={{ background: "var(--accent)" }}
          >
            <motion.span
              style={{ y: reduce ? 0 : blobY }}
              className="absolute inset-0 rounded-full"
            />
          </span>
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-[var(--shadow-neo)]" style={{ background: "var(--accent)" }}>
              <Compass className="h-5 w-5" aria-hidden />
            </span>
          </div>
          <h3 className="mt-4 font-display text-xl font-bold text-ink">{t("landing.placementCardTitle")}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t("landing.placementCardDesc")}</p>
          <div className="mt-auto pt-4">
            <Link href="/register" className="inline-flex items-center gap-2 text-sm font-semibold text-accent transition-colors hover:text-accent-strong">
              {t("landing.placementCardCta")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </article>
      </Float3D>
    </Reveal>
  );
}

function Programs({ examConfig }: { examConfig: ExamConfigBundle | null }) {
  const { t, locale } = useTranslation();
  const programs = useMemo(() => {
    if (!examConfig) return [];
    return (examConfig.types ?? []).map((type) => {
      const def = examConfig.definitions?.[type];
      // Real seeded total (computed at publish time); fall back to the
      // curriculum-target sum when the bundle predates wordTotals.
      const totalWords =
        examConfig.wordTotals?.[type] ??
        (def
          ? Object.values(def.wordCountPerLevel ?? {}).reduce((a: number, b: number) => a + (Number(b) || 0), 0)
          : 0);
      return {
        type,
        name: examNameLocal(def ?? { name: type }, locale),
        levels: def?.levels ?? [],
        words: totalWords,
        color: examConfig.badgeColors?.[type] ?? "var(--accent)",
        focus: def?.focus ?? [],
      };
    });
  }, [examConfig, locale]);

  if (programs.length === 0) {
    return (
      <section id="programs" className="scroll-mt-24">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <span className="bauhaus-chip bauhaus-chip-ink">{t("nav.program")}</span>
            <h2 className="font-display mt-4 text-display-lg text-ink">{t("landing.programsTitle")}</h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-soft">{t("landing.programsSubtitle")}</p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl border border-line bg-sunken" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="programs" className="scroll-mt-24">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="bauhaus-chip bauhaus-chip-ink">{t("nav.program")}</span>
            <h2 className="font-display mt-4 text-display-lg text-ink">{t("landing.programsTitle")}</h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-soft">{t("landing.programsSubtitle")}</p>
          </Reveal>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((p, i) => (
            <ProgramCard key={p.type} p={p} i={i} />
          ))}
          <PlacementCard />
        </div>
      </div>
    </section>
  );
}

const LandingSections = dynamic(() => import("./landing-sections").then((m) => m.LandingSections));

export { Hero, StatsStrip, Programs, LandingSections };
