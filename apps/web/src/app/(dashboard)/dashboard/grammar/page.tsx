"use client";

import { useMounted } from "@/lib/use-mounted";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useGrammar } from "@/lib/grammar";
import { useExamConfig } from "@/lib/exam-definitions";
import { srsFor, useProgress } from "@/stores/progress";
import { useSettings } from "@/stores/settings";
import { masteryLabel } from "@/lib/srs";
import { useTranslation } from "@/i18n/locale-context";
import { locText } from "@/lib/content-translation";
import { stripPinyinTones } from "@/lib/utils";
import { Badge, EmptyState, ExamBadge, Pagination, SectionHeader, Select } from "@/components/ui";

export default function GrammarPage() {
  const settings = useSettings();
  const langSrs = useProgress((s) => srsFor(s, settings.language));
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 24;
  const mounted = useMounted();
  const { t, locale } = useTranslation();
  const GRAMMAR_POINTS = useGrammar();
  const { definitions: EXAM_DEFINITIONS, displayNames: EXAM_DISPLAY_NAMES, abbreviations: EXAM_ABBREVIATIONS } = useExamConfig();

  const examDef = EXAM_DEFINITIONS[settings.activeExamType];
  const examGrammar = useMemo(
    () => GRAMMAR_POINTS.filter((g) => Boolean(g.examMappings?.[settings.activeExamType])),
    [settings.activeExamType, GRAMMAR_POINTS],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qToneFree = stripPinyinTones(q);
    return examGrammar.filter((g) => {
      if (level !== "all") {
        const gLevel = String(g.examMappings?.[settings.activeExamType] ?? g.level ?? g.hsk);
        if (gLevel !== level) return false;
      }
      if (difficulty !== "all" && String(g.difficulty) !== difficulty) return false;
      if (q) {
        const fields = [
          g.title,
          g.pattern,
          g.simpleExplanation,
          locText(g, "title", locale),
          locText(g, "simpleExplanation", locale),
        ];
        const match = fields.some((s) => {
          const low = s.toLowerCase();
          return low.includes(q) || stripPinyinTones(low).includes(qToneFree);
        });
        if (!match) return false;
      }
      return true;
    });
  }, [examGrammar, query, level, difficulty, settings.activeExamType, locale]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const [filterKey, setFilterKey] = useState("");
  const nextKey = `${query}|${level}|${difficulty}`;
  if (nextKey !== filterKey) { setFilterKey(nextKey); setPage(1); }

  // Guard: Wait for exam config to hydrate before accessing levels
  if (!mounted || !examDef) return null;

  return (
    <div className="animate-fade-up">
      <SectionHeader
        
        title={t("nav.grammar")}
        subtitle={t("grammar.subtitle", { n: String(examGrammar.length), exam: EXAM_DISPLAY_NAMES[settings.activeExamType] })}
      />

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("grammar.searchPlaceholder")}
            aria-label={t("grammar.searchAria")}
            className="w-full rounded-[var(--radius)] border border-line bg-raised py-2.5 pl-9 pr-3 text-sm placeholder:text-ink-faint focus:border-accent focus:outline-none"
          />
        </div>
        <Select aria-label={t("grammar.levelFilter")} value={level} onChange={(e) => setLevel(e.target.value)} className="w-44">
          <option value="all">{t("grammar.allLevels", { exam: EXAM_ABBREVIATIONS[settings.activeExamType] || EXAM_DISPLAY_NAMES[settings.activeExamType] })}</option>
          {examDef.levels.map((l: string) => (
            <option key={l} value={l}>{t("grammar.levelOption", { exam: EXAM_ABBREVIATIONS[settings.activeExamType] || EXAM_DISPLAY_NAMES[settings.activeExamType], level: l })}</option>
          ))}
        </Select>
        <Select aria-label={t("grammar.difficultyFilter")} value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-36">
          <option value="all">{t("grammar.allDifficulties")}</option>
          {[1, 2, 3, 4, 5].map((d) => <option key={d} value={String(d)}>{"◆".repeat(d)}</option>)}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Search className="h-8 w-8" />} title={t("grammar.noResults")} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((g) => {
            const card = langSrs[g.id];
            return (
              <Link
                key={g.id}
                href={`/dashboard/grammar/${g.id}`}
                className="rounded-[var(--radius)] border border-line bg-raised p-5 transition-colors hover:border-accent"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-medium">{g.title}</h2>
                  <ExamBadge hsk={g.hsk} examMappings={g.examMappings} currentExam={settings.activeExamType} />
                </div>
                <p className="hanzi mt-1 text-sm text-accent" lang="zh-CN">{g.pattern}</p>
                <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{locText(g, "simpleExplanation", locale)}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-gold" aria-label={t("grammar.difficultyOf", { n: String(g.difficulty) })}>
                    {"◆".repeat(g.difficulty)}<span className="opacity-30">{"◆".repeat(5 - g.difficulty)}</span>
                  </span>
                  <Badge tone={card ? (card.mastery >= 60 ? "success" : "warn") : "neutral"}>
                    {card ? t(masteryLabel(card.mastery)) : t("grammar.notStudied")}
                  </Badge>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
