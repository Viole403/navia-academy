"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Award,
  BarChart3,
  BookOpen,
  BookOpenCheck,
  Brain,
  Calendar,
  ChevronDown,
  ClipboardList,
  Ear,
  Globe,
  GraduationCap,
  Home,
  Library,
  LogOut,
  MessageCircle,
  Mic,
  MoreHorizontal,
  PenLine,
  Play,
  Settings,
  ShieldCheck,
  Type,
  User,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useProgress } from "@/stores/progress";
import { orderedDisplayModes, useSettings } from "@/stores/settings";
import { useTranslation } from "@/i18n/locale-context";
import { isCharScript, LANGUAGES, languageInfo } from "@/lib/languages";
import { setLearningLanguage } from "@/lib/language-context";
import type { DisplayModeMode, ExamType, LanguageCode } from "@/types";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui";
import { Logo } from "@/components/ui/logo";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { OfflineBanner } from "@/components/dashboard/offline-banner";
import { CommandPalette, CommandPaletteTrigger } from "@/components/dashboard/command-palette";
import { useExamConfig } from "@/lib/exam-definitions";

function NavLink({ href, label, icon: Icon, onClick }: { href: string; label: string; icon: typeof Home; onClick?: () => void }) {
  const pathname = usePathname();
  const active = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors",
        active ? "bg-accent-soft font-medium text-accent" : "text-ink-soft hover:bg-hover hover:text-ink"
      )}
    >
      {active && (
        <span
          className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent"
          aria-hidden
        />
      )}
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, signOut, isContributor } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const onboarding = useProgress((s) => s.onboarding);
  const focusMode = useSettings((s) => s.focusMode);
  const language = useSettings((s) => s.language);
  const activeExamType = useSettings((s) => s.activeExamType);
  const displayModeMode = useSettings((s) => s.displayMode.mode);
  const set = useSettings((s) => s.set);
  const setDisplayMode = useSettings((s) => s.setDisplayMode);
  const { t, locale, setLocale } = useTranslation();
  const examConfig = useExamConfig();
  const langExamOptions = LANGUAGES.flatMap((lang) =>
    lang.examTypes.map((et) => ({
      value: `${lang.code}:${et}`,
      label: `${lang.nativeName} · ${examConfig.abbreviations[et] || examConfig.displayNames[et] || et}`,
    }))
  ).sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));
  const currentLangExams = languageInfo(language).examTypes;
  const mergedLangExamValue = `${language}:${currentLangExams.includes(activeExamType) ? activeExamType : currentLangExams[0]}`;
  const [moreOpen, setMoreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  useFocusTrap({ active: moreOpen, containerRef: sheetRef, onEscape: () => setMoreOpen(false) });

  useEffect(() => {
    if (!profileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setProfileOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [profileOpen]);

  const inOnboarding = pathname.startsWith("/dashboard/onboarding") || pathname.startsWith("/dashboard/placement-test") || pathname.startsWith("/dashboard/exam/adaptive");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user && !onboarding.completed && !inOnboarding) {
      router.replace("/dashboard/onboarding");
    }
  }, [loading, user, onboarding.completed, inOnboarding, router]);

  const [prevPathname, setPrevPathname] = useState(pathname);
if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMoreOpen(false);
    setProfileOpen(false);
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Spinner />
      </div>
    );
  }

  if (inOnboarding) {
    return <div className="min-h-screen bg-bg">{children}</div>;
  }

  const NAV_MAIN = [
    { href: "/dashboard", label: t("nav.home"), icon: Home },
    { href: "/dashboard/learn", label: t("nav.learn"), icon: Play },
    { href: "/dashboard/program", label: t("nav.program"), icon: GraduationCap },
    { href: "/dashboard/review", label: t("nav.review"), icon: Brain },
  ];

  const NAV_CONTENT = [
    { href: "/dashboard/vocabulary", label: t("nav.vocabulary"), icon: BookOpen },
    { href: "/dashboard/characters", label: t("nav.characters"), icon: Type },
    { href: "/dashboard/grammar", label: t("nav.grammar"), icon: BookOpenCheck },
    { href: "/dashboard/exam", label: t("nav.exam"), icon: ClipboardList },
    { href: "/dashboard/listening", label: t("nav.listening"), icon: Ear },
    { href: "/dashboard/speaking", label: t("nav.speaking"), icon: Mic },
    { href: "/dashboard/reading", label: t("nav.reading"), icon: Library },
    // Writing is character-script only (zh/ja crafts); hidden for Latin scripts.
    ...(isCharScript(language)
      ? [{ href: "/dashboard/writing", label: t("nav.writing"), icon: PenLine }]
      : []),
    { href: "/dashboard/conversations", label: t("nav.conversations"), icon: MessageCircle },
  ];

  const NAV_TOOLS = [
    { href: "/dashboard/tasks", label: t("nav.tasks"), icon: ClipboardList },
    { href: "/dashboard/calendar", label: t("nav.calendar"), icon: Calendar },

    { href: "/dashboard/progress", label: t("nav.progress"), icon: BarChart3 },
    { href: "/dashboard/library", label: t("nav.library"), icon: Library },
    { href: "/dashboard/achievements", label: t("nav.achievements"), icon: Award },
  ];

  const NAV_STAFF = [
    ...(isContributor
      ? [{ href: "/dashboard/contributor", label: t("nav.contributorStudio"), icon: PenLine }]
      : []),
    ...(user?.role === "admin"
      ? [{ href: "/dashboard/admin", label: t("nav.adminPanel"), icon: ShieldCheck }]
      : []),
  ];

  const NAV_USER = [
    { href: "/dashboard/profile", label: t("nav.profile"), icon: User },
    { href: "/dashboard/settings", label: t("nav.settings"), icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-bg">
      <OfflineBanner />
      {/* Desktop sidebar */}
      {!focusMode && (
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-bg lg:flex">
          <Link href="/dashboard" className="flex h-14 items-center gap-2.5 border-b border-line px-5" aria-label={t("nav.home")}>
            <Logo className="h-8 w-8" />
            <span className="font-display font-bold">Navia</span>
          </Link>
          <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4 pt-1" aria-label="Application navigation">
            <div>
              <p className="flex items-center gap-2 px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-ink-faint">
                <span className="text-xs tabular-nums text-ink-faint/60">01</span>
                Learn
                <span className="h-px flex-1 bg-line" aria-hidden />
              </p>
              <div className="space-y-0.5">{NAV_MAIN.map((i) => <NavLink key={i.href} {...i} />)}</div>
            </div>
            <div>
              <p className="flex items-center gap-2 px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-ink-faint">
                <span className="text-xs tabular-nums text-ink-faint/60">02</span>
                Study
                <span className="h-px flex-1 bg-line" aria-hidden />
              </p>
              <div className="space-y-0.5">{NAV_CONTENT.map((i) => <NavLink key={i.href} {...i} />)}</div>
            </div>
            <div>
              <p className="flex items-center gap-2 px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-ink-faint">
                <span className="text-xs tabular-nums text-ink-faint/60">03</span>
                Tools
                <span className="h-px flex-1 bg-line" aria-hidden />
              </p>
              <div className="space-y-0.5">{NAV_TOOLS.map((i) => <NavLink key={i.href} {...i} />)}</div>
            </div>
            {NAV_STAFF.length > 0 && (
              <div>
                <p className="flex items-center gap-2 px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-ink-faint">
                  <span className="text-xs tabular-nums text-ink-faint/60">04</span>
                  Staff
                  <span className="h-px flex-1 bg-line" aria-hidden />
                </p>
                <div className="space-y-0.5">{NAV_STAFF.map((i) => <NavLink key={i.href} {...i} />)}</div>
              </div>
            )}
          </nav>
        </aside>
      )}

      {/* Desktop header: search (left) → language·exam → display mode → UI language → profile */}
      {!focusMode && (
        <header className="sticky top-0 z-30 hidden h-14 items-center justify-end gap-3 border-b border-line bg-bg/95 px-6 backdrop-blur lg:ml-60 lg:flex">
          <div className="mr-auto w-48 xl:w-64">
            <CommandPaletteTrigger />
          </div>
          <label className="relative block">
            <Globe className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
            <select
              value={mergedLangExamValue}
              onChange={(e) => {
                const [langCode, examCode] = e.target.value.split(":");
                setLearningLanguage(langCode as LanguageCode);
                set({ activeExamType: examCode as ExamType });
                if (langCode === "zh") {
                  setDisplayMode({ script: examCode === "tocfl" ? "traditional" : "simplified" });
                }
              }}
              aria-label={t("settings.learningLanguage")}
              className="h-8 cursor-pointer appearance-none rounded-lg border border-line bg-raised pl-8 pr-9 text-xs text-ink outline-none transition-colors hover:border-line-strong"
            >
              {langExamOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" aria-hidden />
          </label>
          {language === "zh" && (
            <label className="relative block">
              <Type className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
              <select
                value={displayModeMode}
                onChange={(e) => setDisplayMode({ mode: e.target.value as DisplayModeMode })}
                aria-label={t("settings.displayMode")}
                className="h-8 cursor-pointer appearance-none rounded-lg border border-line bg-raised pl-8 pr-7 text-xs text-ink outline-none transition-colors hover:border-line-strong"
              >
                {orderedDisplayModes((m) => t(`settings.displayMode.${m}`), locale).map((mode) => (
                  <option key={mode} value={mode}>{t(`settings.displayMode.${mode}`)}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" aria-hidden />
            </label>
          )}
          <div className="flex items-center gap-1 rounded-lg border border-line bg-sunken p-0.5" role="group" aria-label="UI language">
            {(["en", "id"] as const).map((lc) => (
              <button
                key={lc}
                onClick={() => setLocale(lc)}
                aria-pressed={locale === lc}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium uppercase transition-colors cursor-pointer",
                  locale === lc ? "bg-raised text-ink border border-line" : "text-ink-faint hover:text-ink"
                )}
              >
                {lc}
              </button>
            ))}
          </div>
          <div className="relative">
            <button
              onClick={() => setProfileOpen((v) => !v)}
              aria-expanded={profileOpen}
              aria-label={`${user.displayName ?? t("nav.profile")} — ${t("settings.title")}`}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg p-1 pr-1.5 transition-colors hover:bg-hover"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-soft font-display text-sm font-semibold text-accent" aria-hidden>
                {(user.displayName ?? user.email ?? "?")[0]?.toUpperCase() ?? "?"}
              </span>
              <span className="hidden max-w-28 truncate font-medium text-ink xl:block">{user.displayName ?? t("nav.profile")}</span>
              <ChevronDown className={cn("h-4 w-4 text-ink-faint transition-transform", profileOpen && "rotate-180")} aria-hidden />
            </button>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-line bg-raised p-1.5 shadow-xl">
                  <div className="flex items-center gap-2.5 px-3 py-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-soft font-display text-sm font-semibold text-accent" aria-hidden>
                      {(user.displayName ?? user.email ?? "?")[0]?.toUpperCase() ?? "?"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{user.displayName ?? t("nav.profile")}</p>
                      <p className="truncate text-xs text-ink-faint">{user.email}</p>
                    </div>
                  </div>
                  <div className="mt-1 space-y-0.5 border-t border-line pt-1">
                    {NAV_USER.map((i) => <NavLink key={i.href} {...i} onClick={() => setProfileOpen(false)} />)}
                    <button
                      onClick={async () => {
                        await signOut();
                        router.push("/");
                      }}
                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-hover hover:text-ink"
                    >
                      <LogOut className="h-4 w-4" aria-hidden /> {t("auth.signOut")}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>
      )}

      {/* Main content */}
      <div className={cn(!focusMode && "lg:pl-60")}>
        <main className="mx-auto min-h-screen max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:pb-10">{children}</main>
      </div>

      <CommandPalette />
      {/* Mobile bottom nav */}
      {!focusMode && (
        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-raised/95 backdrop-blur lg:hidden"
          aria-label="Bottom navigation"
        >
          <div className="grid grid-cols-5">
            {NAV_MAIN.map((item) => {
              const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium",
                    active ? "text-accent" : "text-ink-faint"
                  )}
                >
                  <item.icon className="h-5 w-5" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={() => setMoreOpen(true)}
              className="flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium text-ink-faint cursor-pointer"
              aria-label={t("common.more")}
              aria-expanded={moreOpen}
            >
              <MoreHorizontal className="h-5 w-5" aria-hidden />
              {t("common.more")}
            </button>
          </div>
        </nav>
      )}

      {/* Mobile "more" sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={(e) => e.target === e.currentTarget && setMoreOpen(false)}>
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("common.allSections")}
            className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-2xl border-t border-line bg-raised p-5 animate-fade-up"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display font-semibold">{t("common.allSections")}</h2>
              <button onClick={() => setMoreOpen(false)} aria-label="Close" className="p-1.5 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {[...NAV_CONTENT, ...NAV_TOOLS, ...NAV_STAFF, ...NAV_USER].map((i) => (
                <NavLink key={i.href} {...i} onClick={() => setMoreOpen(false)} />
              ))}
              <button
                onClick={async () => {
                  await signOut();
                  router.push("/");
                }}
                className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-ink-soft hover:bg-hover cursor-pointer"
              >
                <LogOut className="h-4 w-4" aria-hidden /> {t("auth.signOut")}
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <label className="relative block">
                <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
                <select
                  value={mergedLangExamValue}
                  onChange={(e) => {
                    const [langCode, examCode] = e.target.value.split(":");
                    setLearningLanguage(langCode as LanguageCode);
                    set({ activeExamType: examCode as ExamType });
                    if (langCode === "zh") {
                      setDisplayMode({ script: examCode === "tocfl" ? "traditional" : "simplified" });
                    }
                    setMoreOpen(false);
                  }}
                  aria-label={t("settings.learningLanguage")}
                  className="h-11 w-full cursor-pointer appearance-none rounded-lg border border-line bg-sunken pl-9 pr-9 text-sm text-ink outline-none transition-colors hover:border-line-strong"
                >
                  {langExamOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
              </label>
              {language === "zh" && (
                <label className="relative block">
                  <Type className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
                  <select
                    value={displayModeMode}
                    onChange={(e) => {
                      setDisplayMode({ mode: e.target.value as DisplayModeMode });
                      setMoreOpen(false);
                    }}
                    aria-label={t("settings.displayMode")}
                    className="h-11 w-full cursor-pointer appearance-none rounded-lg border border-line bg-sunken pl-9 pr-9 text-sm text-ink outline-none transition-colors hover:border-line-strong"
                  >
                    {orderedDisplayModes((m) => t(`settings.displayMode.${m}`), locale).map((mode) => (
                      <option key={mode} value={mode}>{t(`settings.displayMode.${mode}`)}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
                </label>
              )}
            </div>
            {/* Mobile language switcher */}
            <div className="mt-4 flex gap-1 rounded-lg border border-line bg-sunken p-0.5">
              <button
                onClick={() => setLocale("en")}
                aria-pressed={locale === "en"}
                className={cn(
                  "flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors cursor-pointer",
                  locale === "en" ? "bg-raised text-ink border border-line" : "text-ink-faint hover:text-ink"
                )}
              >
                EN
              </button>
              <button
                onClick={() => setLocale("id")}
                aria-pressed={locale === "id"}
                className={cn(
                  "flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors cursor-pointer",
                  locale === "id" ? "bg-raised text-ink border border-line" : "text-ink-faint hover:text-ink"
                )}
              >
                ID
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
