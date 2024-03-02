"use client";

import { useMounted } from "@/lib/use-mounted";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MessageCircle, Search } from "lucide-react";
import { useConversations } from "@/lib/conversations";
import { useExamConfig } from "@/lib/exam-definitions";
import { useSettings } from "@/stores/settings";
import { Badge, ExamBadge, EmptyState, Pagination, SectionHeader, Select } from "@/components/ui";
import { stripPinyinTones } from "@/lib/utils";
import { useTranslation } from "@/i18n/locale-context";
import { locText } from "@/lib/content-translation";

export default function ConversationsPage() {
  const settings = useSettings();
  const { t, locale } = useTranslation();
  const CONVERSATIONS = useConversations();
  const { definitions: EXAM_DEFINITIONS, displayNames: EXAM_DISPLAY_NAMES, abbreviations: EXAM_ABBREVIATIONS } = useExamConfig();
  const examConversations = useMemo(
    () => CONVERSATIONS.filter((c) => Boolean(c.examMappings?.[settings.activeExamType])),
    [settings.activeExamType, CONVERSATIONS],
  );
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");
  const PAGE_SIZE = 12;
  const mounted = useMounted();
  const examDef = EXAM_DEFINITIONS[settings.activeExamType];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qToneFree = stripPinyinTones(q);
    return examConversations.filter((c) => {
      if (level !== "all") {
        const cLevel = String(c.examMappings?.[settings.activeExamType] ?? c.level ?? c.hsk);
        if (cLevel !== level) return false;
      }
      if (!q) return true;
      const turnText = (c.turns ?? []).map((tr) => `${tr.text} ${tr.translation} ${tr.romanization ?? ""}`).join(" ");
      const fields = [c.title, c.context, turnText, locText(c, "title", locale), locText(c, "context", locale)];
      return fields.some((s) => {
        const low = s.toLowerCase();
        return low.includes(q) || stripPinyinTones(low).includes(qToneFree);
      });
    });
  }, [query, level, examConversations, settings.activeExamType, locale]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const [filterKey, setFilterKey] = useState("");
  const nextKey = `${query}|${level}|${settings.activeExamType}`;
  if (nextKey !== filterKey) { setFilterKey(nextKey); setPage(1); }
  if (!mounted || !examDef) return null;

  return (
    <div className="animate-fade-up">
      <SectionHeader
        
        title={t("nav.conversations")}
        subtitle={t("conversation.scenarios", { n: String(examConversations.length), exam: EXAM_DISPLAY_NAMES[settings.activeExamType] })}
      />
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("conversation.searchPlaceholder")}
            aria-label={t("conversation.searchAria")}
            className="w-full rounded-[var(--radius)] border border-line bg-raised py-2.5 pl-9 pr-3 text-sm placeholder:text-ink-faint focus:border-accent focus:outline-none"
          />
        </div>
        <Select aria-label={t("conversation.levelFilter")} value={level} onChange={(e) => setLevel(e.target.value)} className="w-44">
          <option value="all">{t("conversation.allLevels", { exam: EXAM_ABBREVIATIONS[settings.activeExamType] || EXAM_DISPLAY_NAMES[settings.activeExamType] })}</option>
          {examDef.levels.map((l: string) => (
            <option key={l} value={l}>{t("conversation.levelOption", { exam: EXAM_ABBREVIATIONS[settings.activeExamType] || EXAM_DISPLAY_NAMES[settings.activeExamType], level: l })}</option>
          ))}
        </Select>
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={<Search className="h-8 w-8" />} title={t("grammar.noResults")} />
      ) : (
      <div className="grid gap-3 md:grid-cols-2">
        {visible.map((c) => (
          <Link key={c.id} href={`/dashboard/conversations/${c.id}`} className="rounded-xl border border-line bg-raised p-5 transition-colors hover:border-accent">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-display font-semibold">{c.title}</h2>
              <ExamBadge hsk={c.hsk} examMappings={c.examMappings} currentExam={settings.activeExamType} />
            </div>
            <p className="mt-1 text-sm text-ink-soft">{locText(c, "context", locale)}</p>
            <div className="mt-3 flex gap-2 text-xs">
              <Badge>{c.formality === "formal" ? t("conversation.formal") : c.formality === "informal" ? t("conversation.informal") : t("conversation.neutral")}</Badge>
              <Badge><MessageCircle className="h-3 w-3" /> {t("conversation.interventions", { n: String((c.turns ?? []).filter((tr) => tr.speaker === "user").length) })}</Badge>
            </div>
          </Link>
        ))}
      </div>
      )}
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
