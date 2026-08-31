"use client"

import { useMounted } from "@/lib/use-mounted"
import Link from "next/link"
import { useMemo, useState } from "react"
import {
  BookOpen,
  BookOpenCheck,
  Library,
  MessageCircle,
  Search,
  Type,
} from "lucide-react"
import { useCurriculum, unitById } from "@/lib/curriculum"
import { useVocabulary } from "@/lib/vocabulary"
import { useCharacters } from "@/lib/characters"
import { useGrammar } from "@/lib/grammar"
import { useReadings } from "@/lib/readings"
import { useConversations } from "@/lib/conversations"
import { useProgress, notesFor, savedFor } from "@/stores/progress"
import { useSettings } from "@/stores/settings"
import { ttsLocaleFor } from "@/lib/languages"
import {
  Badge,
  EmptyState,
  SectionHeader,
  Tabs,
  TabPanel,
} from "@/components/ui"
import { useTranslation } from "@/i18n/locale-context"
import type {
  ExamType,
  VocabWord,
  Lesson,
  HanziChar,
  GrammarPoint,
  Reading,
  ConversationScenario,
} from "@/types"

interface Item {
  id: string
  title: string
  subtitle: string
  href: string
  kind: string
  icon: typeof BookOpen
}

function buildIndex(
  vocabulary: VocabWord[],
  lessons: Lesson[],
  characters: HanziChar[],
  grammar: GrammarPoint[],
  readings: Reading[],
  conversations: ConversationScenario[],
  t: (key: string, params?: Record<string, string>) => string,
  examType: ExamType
): Item[] {
  return [
    ...lessons.map((l) => ({
      id: l.id,
      title: l.title,
      subtitle: `${t("library.lesson")} · ${unitById(l.unitId)?.title ?? ""}`,
      href: `/dashboard/lesson/${l.id}`,
      kind: "lessons",
      icon: BookOpenCheck,
    })),
    ...vocabulary.map((w) => ({
      id: w.id,
      title: `${w.hanzi} · ${w.pinyin}`,
      subtitle: `${t("library.word")} · ${w.translation}`,
      href: `/dashboard/vocabulary/${w.id}`,
      kind: "vocab",
      icon: BookOpen,
    })),
    ...characters.map((c) => ({
      id: c.id,
      title: `${c.char} · ${c.pinyin}`,
      subtitle: `${t("library.character")} · ${c.meaning}`,
      href: `/dashboard/characters/${c.id}`,
      kind: "chars",
      icon: Type,
    })),
    ...grammar.map((g) => ({
      id: g.id,
      title: g.title,
      subtitle: `${t("nav.grammar")} · ${g.pattern}`,
      href: `/dashboard/grammar/${g.id}`,
      kind: "grammar",
      icon: BookOpenCheck,
    })),
    ...readings.map((r) => ({
      id: r.id,
      title: r.title,
      subtitle: `${t("nav.reading")} · ${String(r.examMappings?.[examType] ?? r.level ?? r.hsk)}`,
      href: `/dashboard/reading/${r.id}`,
      kind: "readings",
      icon: Library,
    })),
    ...conversations.map((c) => ({
      id: c.id,
      title: c.title,
      subtitle: `${t("library.conversation")} · ${c.context}`,
      href: `/dashboard/conversations/${c.id}`,
      kind: "convs",
      icon: MessageCircle,
    })),
  ]
}

export default function LibraryPage() {
  const progress = useProgress()
  const settings = useSettings()
  const { t } = useTranslation()
  const { lessons: LESSONS } = useCurriculum()
  const vocabulary = useVocabulary()
  const CHARACTERS = useCharacters()
  const GRAMMAR_POINTS = useGrammar()
  const READINGS = useReadings()
  const CONVERSATIONS = useConversations()
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState("all")
  const mounted = useMounted()

  const index = useMemo(
    () =>
      buildIndex(
        vocabulary,
        LESSONS,
        CHARACTERS,
        GRAMMAR_POINTS,
        READINGS,
        CONVERSATIONS,
        t,
        settings.activeExamType
      ),
    [
      vocabulary,
      t,
      LESSONS,
      CHARACTERS,
      GRAMMAR_POINTS,
      READINGS,
      CONVERSATIONS,
      settings.activeExamType,
    ]
  )
  const langSaved = savedFor(progress, settings.language)
  const langNotes = notesFor(progress, settings.language)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return index.filter((item) => {
      if (tab === "saved" && !langSaved.includes(item.id)) return false
      if (tab !== "all" && tab !== "saved" && item.kind !== tab) return false
      if (
        q &&
        !(
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q)
        )
      )
        return false
      return true
    })
  }, [index, query, tab, langSaved])

  if (!mounted) return null

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title={t("nav.library")}
        subtitle={t("library.subtitle")}
      />

      <div className="relative mb-4">
        <Search
          className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-faint"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("library.searchPlaceholder")}
          aria-label={t("library.searchAriaLabel")}
          className="w-full rounded-[var(--radius)] border border-line bg-raised py-3 pr-3 pl-9 text-sm placeholder:text-ink-faint focus:border-accent focus:outline-none"
        />
      </div>

      <Tabs
        tabs={[
          { id: "all", label: t("library.all") },
          { id: "lessons", label: t("library.lessons") },
          { id: "vocab", label: t("nav.vocabulary") },
          { id: "chars", label: t("nav.characters") },
          { id: "grammar", label: t("nav.grammar") },
          { id: "readings", label: t("library.readings") },
          { id: "convs", label: t("nav.conversations") },
          { id: "saved", label: t("library.saved") },
        ]}
        active={tab}
        onChange={setTab}
        id="library-tabs"
        className="mb-5"
      />

      <TabPanel baseId="library-tabs" tabId={tab}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Search className="h-8 w-8" />}
            title={t("library.noResults")}
            description={
              tab === "saved"
                ? t("library.savedEmpty")
                : t("library.searchEmpty")
            }
          />
        ) : (
          <>
            <p className="mb-3 text-xs text-ink-faint">
              {t("library.results", { n: String(filtered.length) })}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {filtered.slice(0, 60).map((item) => (
                <Link
                  key={item.kind + item.id}
                  href={item.href}
                  className="flex items-center gap-3 rounded-[var(--radius)] border border-line bg-raised px-4 py-3 transition-colors hover:border-accent"
                >
                  <item.icon
                    className="h-4 w-4 shrink-0 text-accent"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p
                      className="hanzi truncate text-sm font-medium"
                      lang={ttsLocaleFor(settings.language)}
                    >
                      {item.title}
                    </p>
                    <p className="truncate text-xs text-ink-faint">
                      {item.subtitle}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            {filtered.length > 60 && (
              <p className="mt-3 text-xs text-ink-faint">
                {t("library.showingFirst", { n: "60" })}
              </p>
            )}
          </>
        )}

        {Object.keys(langNotes).length > 0 && tab === "all" && !query && (
          <div className="mt-8">
            <h2 className="mb-3 font-display text-lg font-semibold">
              {t("library.yourNotes")}
            </h2>
            <Badge>
              {t("library.notesSaved", {
                n: String(Object.keys(langNotes).length),
              })}
            </Badge>
          </div>
        )}
      </TabPanel>
    </div>
  )
}
