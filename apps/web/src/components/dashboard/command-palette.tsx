"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { Search, ArrowRight, Home, Play, GraduationCap, Brain, BookOpen, Type, BookOpenCheck, ClipboardList, Ear, Mic, Library, PenLine, MessageCircle, Calendar, BarChart3, Award, User, Settings } from "lucide-react";
import { useCommandPalette } from "@/stores/command-palette";
import { useProgress } from "@/stores/progress";
import { useTranslation } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";
import { useExamConfig } from "@/lib/exam-definitions";
import type { ExamType } from "@/types";

interface PageItem {
  labelKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PAGES: PageItem[] = [
  { labelKey: "nav.home", href: "/dashboard", icon: Home },
  { labelKey: "nav.learn", href: "/dashboard/learn", icon: Play },
  { labelKey: "nav.program", href: "/dashboard/program", icon: GraduationCap },
  { labelKey: "nav.review", href: "/dashboard/review", icon: Brain },
  { labelKey: "nav.vocabulary", href: "/dashboard/vocabulary", icon: BookOpen },
  { labelKey: "nav.characters", href: "/dashboard/characters", icon: Type },
  { labelKey: "nav.grammar", href: "/dashboard/grammar", icon: BookOpenCheck },
  { labelKey: "nav.exam", href: "/dashboard/exam", icon: ClipboardList },
  { labelKey: "nav.listening", href: "/dashboard/listening", icon: Ear },
  { labelKey: "nav.speaking", href: "/dashboard/speaking", icon: Mic },
  { labelKey: "nav.reading", href: "/dashboard/reading", icon: Library },
  { labelKey: "nav.writing", href: "/dashboard/writing", icon: PenLine },
  { labelKey: "nav.conversations", href: "/dashboard/conversations", icon: MessageCircle },
  { labelKey: "nav.tasks", href: "/dashboard/tasks", icon: ClipboardList },
  { labelKey: "nav.calendar", href: "/dashboard/calendar", icon: Calendar },

  { labelKey: "nav.progress", href: "/dashboard/progress", icon: BarChart3 },
  { labelKey: "nav.library", href: "/dashboard/library", icon: Library },
  { labelKey: "nav.achievements", href: "/dashboard/achievements", icon: Award },
  { labelKey: "nav.profile", href: "/dashboard/profile", icon: User },
  { labelKey: "nav.settings", href: "/dashboard/settings", icon: Settings },
];

function parseAttemptId(id: string): { examType?: string; level?: string } {
  const parts = id.split("-");
  if (parts.length >= 2) {
    return { examType: parts[0], level: parts[1] };
  }
  return {};
}

// Helper function moved inside component to access examConfig
function createAttemptLabel(displayNames: Record<string, string>) {
  return (examType?: string, level?: string): string => {
    const name = displayNames[examType as ExamType] ?? examType ?? "";
    return level ? `${name} ${level}` : name;
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface BaseResult {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface PageResult extends BaseResult {
  kind: "page";
  href: string;
  iconComponent: React.ComponentType<{ className?: string }>;
}

interface AttemptResult extends BaseResult {
  kind: "attempt";
  href: string;
  subtitle: string;
}

interface ActionResult extends BaseResult {
  kind: "action";
  onSelect: () => void;
}

type SearchResult = PageResult | AttemptResult | ActionResult;

interface ResultGroup {
  label: string;
  items: SearchResult[];
}

export function CommandPalette() {
  const router = useRouter();
  const { open, query, mode, setQuery, closePalette } = useCommandPalette();
  const examConfig = useExamConfig();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [prevQueryMode, setPrevQueryMode] = useState<[string, typeof mode]>([query, mode]);
  if (prevQueryMode[0] !== query || prevQueryMode[1] !== mode) {
    setPrevQueryMode([query, mode]);
    setSelectedIndex(0);
  }
  const attempts = useProgress((s) => s.attempts);
  const { t } = useTranslation();

  const attemptLabel = useMemo(() => createAttemptLabel(examConfig.displayNames), [examConfig.displayNames]);
  const queryLower = query.toLowerCase();

  const groups = useMemo(() => {
    const result: ResultGroup[] = [];
    const showAll = mode === "all";

    if (showAll || queryLower) {
      if (showAll) {
        const matched = PAGES.filter((p) => !queryLower || t(p.labelKey).toLowerCase().includes(queryLower));
        if (matched.length > 0) {
          result.push({
            label: t("command.pages"),
            items: matched.map((p) => ({
              id: `page-${p.href}`,
              kind: "page" as const,
              label: t(p.labelKey),
              href: p.href,
              iconComponent: p.icon,
            })),
          });
        }
      }

      const matchedAttempts = attempts
        .filter((a) => {
          const { examType, level } = parseAttemptId(a.assessmentId);
          return attemptLabel(examType, level).toLowerCase().includes(queryLower);
        })
        .slice(0, 5);
      if (matchedAttempts.length > 0) {
        result.push({
          label: t("command.examHistory"),
          items: matchedAttempts.map((a) => {
            const { examType, level } = parseAttemptId(a.assessmentId);
            return {
              id: `attempt-${a.id}`,
              kind: "attempt" as const,
              label: attemptLabel(examType, level),
              href: `/dashboard/exam/${examType}/${level}`,
              subtitle: `${a.score}% \u2022 ${formatDate(a.finishedAt ?? a.startedAt)}`,
            };
          }),
        });
      }
    }

    // Quick actions (only when query is empty or no results yet)
    if (!queryLower || result.every((g) => g.items.length === 0)) {
      const actions: ActionResult[] = [];
      if (!queryLower || "exam".includes(queryLower) || t("command.keyStart").includes(queryLower)) {
        actions.push({
          id: "action-exam",
          kind: "action" as const,
          label: t("command.startNewExam"),
          onSelect: () => router.push("/dashboard/exam"),
        });
      }
      if (actions.length > 0) {
        result.push({
          label: t("command.quickActions"),
          items: actions,
        });
      }
    }

    return result;
  }, [queryLower, attempts, mode, router, t, attemptLabel]);

  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  const handleSelect = useCallback(
    (item: SearchResult) => {
      closePalette();
      if (item.kind === "page") router.push((item as PageResult).href);
      else if (item.kind === "attempt") router.push((item as AttemptResult).href);
      else if (item.kind === "action") (item as ActionResult).onSelect();
    },
    [closePalette, router]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && flatItems[selectedIndex]) {
        e.preventDefault();
        handleSelect(flatItems[selectedIndex]);
      }
    },
    [flatItems, selectedIndex, handleSelect]
  );

  useFocusTrap({ active: open, containerRef: dialogRef, initialFocusRef: inputRef, onEscape: closePalette })

  useEffect(() => {
    if (open && listRef.current && selectedIndex >= 0) {
      const el = listRef.current.children[selectedIndex] as HTMLElement | undefined;
      el?.scrollIntoView?.({ block: "nearest" });
    }
  }, [selectedIndex, open]);

  // Global keyboard listener
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        useCommandPalette.getState().togglePalette();
      }
      if (e.key === "Escape" && useCommandPalette.getState().open) {
        useCommandPalette.getState().closePalette();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-50 flex justify-center bg-black/50 pt-[15vh]"
          onClick={(e) => e.target === e.currentTarget && closePalette()}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("command.quickSearch")}
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.12 }}
            className="w-full max-w-lg mx-4"
          >
            <div className="overflow-hidden rounded-[var(--radius)] border bg-raised shadow-xl border-line">
              <div className="flex items-center gap-3 border-b border-line px-4">
                <Search className="h-4 w-4 shrink-0 text-ink-soft" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={mode === "history" ? t("command.searchExams") : t("command.searchAll")}
                  className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-faint"
                />
                <kbd className="hidden rounded border bg-sunken px-1.5 py-0.5 text-xs text-ink-soft sm:inline-block">
                  ESC
                </kbd>
              </div>

              <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
                {groups.length === 0 || groups.every((g) => g.items.length === 0) ? (
                  <p className="p-4 text-center text-xs text-ink-soft">
                    {query
                      ? t("command.noResults", { query })
                      : t("command.typeToSearch")}
                  </p>
                ) : (
                  groups.map((group) => (
                    <div key={group.label}>
                      <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                        {group.label}
                      </p>
                      {group.items.map((item) => {
                        const globalIndex = flatItems.indexOf(item);
                        const selected = globalIndex === selectedIndex;
                        return (
                          <button
                            key={item.id}
                            ref={(el) => {
                              if (selected && el) {
                                el.scrollIntoView?.({ block: "nearest" });
                              }
                            }}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                              selected
                                ? "bg-accent-soft"
                                : "hover:bg-hover"
                            )}
                          >
                            {item.kind === "page" && (
                              <item.iconComponent className="h-4 w-4 shrink-0 text-ink-soft" />
                            )}
                            {item.kind === "action" && (
                              <ArrowRight className="h-4 w-4 shrink-0 text-ink-soft" />
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="font-medium">{item.label}</span>
                              {item.kind === "attempt" && (
                                <span className="ml-2 text-xs text-ink-soft">
                                  {(item as AttemptResult).subtitle}
                                </span>
                              )}
                            </div>
                            <ArrowRight className="h-3 w-3 shrink-0 text-ink-soft/50" />
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function CommandPaletteTrigger() {
  const { open, openPalette } = useCommandPalette();
  const { t } = useTranslation();
  return (
    <button
      onClick={() => openPalette()}
      aria-expanded={open}
      aria-haspopup="dialog"
      className="flex w-full items-center gap-2.5 rounded-lg border border-dashed border-line-strong px-3 py-1.5 text-sm text-ink-soft hover:text-ink hover:border-accent transition-colors cursor-pointer"
    >
      <Search className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-left">{t("command.quickSearch")}</span>
      <kbd className="rounded border bg-sunken px-1.5 py-0.5 text-xs font-medium">
        {typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent) ? "\u2318" : "Ctrl"}K
      </kbd>
    </button>
  );
}
