"use client";

import { useMounted } from "@/lib/use-mounted";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpen, Search } from "lucide-react";
import { useReadings } from "@/lib/readings";
import { useExamConfig } from "@/lib/exam-definitions";
import { useSettings } from "@/stores/settings";
import { useTranslation } from "@/i18n/locale-context";
import { locText } from "@/lib/content-translation";
import { stripPinyinTones } from "@/lib/utils";
import { Badge, ExamBadge, Pagination, SectionHeader, Select } from "@/components/ui";

const TYPE_LABEL_KEYS: Record<string, string> = {
  sentences: "reading.type.sentences",
  conversation: "reading.type.conversation",
  story: "reading.type.story",
  news: "reading.type.news",
  culture: "reading.type.culture",
  professional: "reading.type.professional",
};

export default function ReadingPage() {
  const settings = useSettings();
  const [level, setLevel] = useState("all");
  const [type, setType] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 24;
  const mounted = useMounted();
  const { t, locale } = useTranslation();
  const READINGS = useReadings();
  const { definitions: EXAM_DEFINITIONS, displayNames: EXAM_DISPLAY_NAMES, abbreviations: EXAM_ABBREVIATIONS } = useExamConfig();
  const typeLabels = useMemo(
    () => Object.fromEntries(Object.entries(TYPE_LABEL_KEYS).map(([k, v]) => [k, t(v)])) as Record<string, string>,
    [t]
  );

  const examDef = EXAM_DEFINITIONS[settings.activeExamType];
  const examReadings = useMemo(
    () => READINGS.filter((r) => Boolean(r.examMappings?.[settings.activeExamType])),
    [settings.activeExamType, READINGS],
  );

  const filtered = useMemo(
    () => {
      const q = query.trim().toLowerCase();
      const qToneFree = stripPinyinTones(q);
      return examReadings.filter((r) => {
        if (level !== "all") {
          const rLevel = String(r.examMappings?.[settings.activeExamType] ?? r.level ?? r.hsk);
          if (rLevel !== level) return false;
        }
        if (type !== "all" && r.type !== type) return false;
        if (q) {
          const text = (r.paragraphs ?? []).map((p) => `${p.hanzi ?? ""} ${p.pinyin ?? ""} ${p.translation ?? ""}`).join(" ");
          const fields = [r.title, r.summary, text, locText(r, "title", locale), locText(r, "summary", locale)];
          const match = fields.some((s) => {
            const low = s.toLowerCase();
            return low.includes(q) || stripPinyinTones(low).includes(qToneFree);
          });
          if (!match) return false;
        }
        return true;
      });
    },
    [level, type, query, examReadings, settings.activeExamType, locale]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const [filterKey, setFilterKey] = useState("");
  const nextKey = `${query}|${level}|${type}`;
  if (nextKey !== filterKey) { setFilterKey(nextKey); setPage(1); }

  // Guard: Wait for exam config to hydrate before accessing levels
  if (!mounted || !examDef) return null;

  return (
    <div className="animate-fade-up">
      <SectionHeader  title={t("nav.reading")} subtitle={t("reading.subtitle", { n: String(examReadings.length), exam: EXAM_DISPLAY_NAMES[settings.activeExamType] })} />

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("reading.searchPlaceholder")}
            aria-label={t("reading.searchAria")}
            className="w-full rounded-[var(--radius)] border border-line bg-raised py-2.5 pl-9 pr-3 text-sm placeholder:text-ink-faint focus:border-accent focus:outline-none"
          />
        </div>
        <Select aria-label={t("reading.levelFilter")} value={level} onChange={(e) => setLevel(e.target.value)} className="w-44">
          <option value="all">{t("reading.allLevels", { exam: EXAM_ABBREVIATIONS[settings.activeExamType] || EXAM_DISPLAY_NAMES[settings.activeExamType] })}</option>
          {examDef.levels.map((l: string) => (
            <option key={l} value={l}>{t("reading.levelOption", { exam: EXAM_ABBREVIATIONS[settings.activeExamType] || EXAM_DISPLAY_NAMES[settings.activeExamType], level: l })}</option>
          ))}
        </Select>
        <Select aria-label={t("reading.typeFilter")} value={type} onChange={(e) => setType(e.target.value)} className="w-44">
          <option value="all">{t("reading.allTypes")}</option>
          {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-dashed border-line p-10 text-center text-sm text-ink-soft md:col-span-2">
            {t("reading.noReadings")}
          </div>
        ) : (
          visible.map((r) => (
          <Link key={r.id} href={`/dashboard/reading/${r.id}`} className="rounded-[var(--radius)] border border-line bg-raised p-5 transition-colors hover:border-accent">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-display font-semibold">{r.title}</h2>
              <ExamBadge hsk={r.hsk} examMappings={r.examMappings} currentExam={settings.activeExamType} />
            </div>
            <p className="mt-1 text-sm text-ink-soft">{locText(r, "summary", locale)}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-ink-faint">
              <Badge>{typeLabels[r.type]}</Badge>
              <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {t("reading.characters", { n: String(r.wordCount) })}</span>
            </div>
          </Link>
          ))
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
