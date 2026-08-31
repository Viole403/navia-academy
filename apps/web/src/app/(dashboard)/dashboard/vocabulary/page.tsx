"use client"

import { useMounted } from "@/lib/use-mounted"
import Link from "next/link"
import { useMemo, useState } from "react"
import { LayoutGrid, List, Search } from "lucide-react"
import { useVocabulary } from "@/lib/vocabulary"
import { EXAM_DEFINITIONS, useExamConfig } from "@/lib/exam-definitions"
import { difficultFor, savedFor, srsFor, useProgress } from "@/stores/progress"
import { showsTranslation, useSettings } from "@/stores/settings"
import { masteryLabel } from "@/lib/srs"
import { cn, stripPinyinTones } from "@/lib/utils"
import { useTranslation } from "@/i18n/locale-context"
import { translationFor } from "@/lib/content-translation"
import {
  Badge,
  EmptyState,
  ExamBadge,
  PinyinText,
  Pagination,
  Reveal,
  SectionHeader,
  Select,
  Tabs,
  TabPanel,
} from "@/components/ui"
import { VocabCard } from "@/components/dashboard/vocab-card"

type View = "cards" | "list"

export default function VocabularyPage() {
  const progress = useProgress()
  const settings = useSettings()
  const vocabulary = useVocabulary()
  const examConfig = useExamConfig()
  const [query, setQuery] = useState("")
  const [level, setLevel] = useState("all")
  const [tag, setTag] = useState("all")
  const [tab, setTab] = useState("all")
  const [view, setView] = useState<View>("cards")
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 48
  const mounted = useMounted()
  const { t, locale } = useTranslation()

  const examDef = EXAM_DEFINITIONS[settings.activeExamType]
  const examVocab = useMemo(
    () =>
      vocabulary.filter((w) =>
        Boolean(w.examMappings?.[settings.activeExamType])
      ),
    [vocabulary, settings.activeExamType]
  )

  const tags = useMemo(
    () => [...new Set(examVocab.flatMap((w) => w.tags))].sort(),
    [examVocab]
  )

  const langSrs = srsFor(progress, settings.language)
  const langSaved = savedFor(progress, settings.language)
  const langDifficult = difficultFor(progress, settings.language)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const qToneFree = stripPinyinTones(q)
    return examVocab.filter((w) => {
      if (level !== "all") {
        const wordLevel = String(
          w.examMappings?.[settings.activeExamType] ?? w.level ?? w.hsk
        )
        if (wordLevel !== level) return false
      }
      if (tag !== "all" && !w.tags.includes(tag)) return false
      if (tab === "saved" && !langSaved.includes(w.id)) return false
      if (tab === "difficult" && !langDifficult.includes(w.id)) return false
      if (tab === "learning" && !langSrs[w.id]) return false
      if (q) {
        const hanzi = (w.hanzi ?? w.text ?? "").includes(q)
        const pinyin = stripPinyinTones(w.pinyin ?? w.romanization ?? "")
          .toLowerCase()
          .includes(qToneFree)
        const translation = [
          w.translation,
          w.translation_en,
          w.translation_id,
          ...(w.meanings ?? []),
        ]
          .filter(Boolean)
          .some((t) => t.toLowerCase().includes(q))
        if (!(hanzi || pinyin || translation)) return false
      }
      return true
    })
  }, [
    query,
    level,
    tag,
    tab,
    langSaved,
    langDifficult,
    langSrs,
    examVocab,
    settings.activeExamType,
  ])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Reset to first page whenever filters change.
  const [filterKey, setFilterKey] = useState("")
  const nextKey = `${query}|${level}|${tag}|${tab}`
  if (nextKey !== filterKey) {
    setFilterKey(nextKey)
    setPage(1)
  }

  // Guard: Wait for exam config to hydrate before accessing levels
  if (!mounted || !examDef) return null

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title={t("nav.vocabulary")}
        subtitle={t("vocab.subtitle", {
          n: String(examVocab.length),
          exam:
            examConfig.displayNames[settings.activeExamType] ||
            settings.activeExamType,
        })}
      />

      <Tabs
        tabs={[
          { id: "all", label: t("vocab.all") },
          { id: "learning", label: t("vocab.learning") },
          { id: "saved", label: t("vocab.saved") },
          { id: "difficult", label: t("vocab.difficult") },
        ]}
        active={tab}
        onChange={setTab}
        id="vocab-tabs"
        className="mb-4"
      />

      <TabPanel baseId="vocab-tabs" tabId={tab}>
        <div className="mb-5 flex flex-wrap items-end gap-3">
          <div className="relative min-w-52 flex-1">
            <Search
              className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-faint"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("vocab.searchPlaceholder")}
              aria-label={t("vocab.searchAria")}
              className="w-full rounded-[var(--radius)] border border-line bg-raised py-2.5 pr-3 pl-9 text-sm placeholder:text-ink-faint focus:border-accent focus:outline-none"
            />
          </div>
          <Select
            aria-label={t("vocab.levelFilter")}
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="w-44"
          >
            <option value="all">
              {t("vocab.allLevels", {
                exam:
                  examConfig.abbreviations[settings.activeExamType] ||
                  examConfig.displayNames[settings.activeExamType] ||
                  settings.activeExamType,
              })}
            </option>
            {examDef.levels.map((l: string) => (
              <option key={l} value={l}>
                {t("vocab.levelOption", {
                  exam:
                    examConfig.abbreviations[settings.activeExamType] ||
                    examConfig.displayNames[settings.activeExamType] ||
                    settings.activeExamType,
                  level: l,
                })}
              </option>
            ))}
          </Select>
          <Select
            aria-label={t("vocab.tagFilter")}
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="w-40"
          >
            <option value="all">{t("vocab.allTags")}</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </Select>
          <div
            className="flex rounded-[var(--radius)] border border-line"
            role="group"
            aria-label={t("vocab.viewMode")}
          >
            <button
              onClick={() => setView("cards")}
              aria-pressed={view === "cards"}
              className={cn(
                "cursor-pointer p-2.5",
                view === "cards" ? "text-accent" : "text-ink-faint"
              )}
              title={t("vocab.cardView")}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              className={cn(
                "cursor-pointer p-2.5",
                view === "list" ? "text-accent" : "text-ink-faint"
              )}
              title={t("vocab.listView")}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Search className="h-8 w-8" />}
            title={t("vocab.noResults")}
            description={t("vocab.noResultsDesc")}
          />
        ) : view === "cards" ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((w, i) => (
              <Reveal key={w.id} delay={(i % 3) * 0.05} className="h-full">
                <Link
                  href={`/dashboard/vocabulary/${w.id}`}
                  className="block h-full"
                >
                  <VocabCard word={w} compact />
                </Link>
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius)] border border-line bg-raised">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-faint">
                  <th className="px-4 py-2.5 font-medium">
                    {t("vocab.hanzi")}
                  </th>
                  <th className="px-4 py-2.5 font-medium">
                    {t("vocab.pinyin")}
                  </th>
                  <th className="px-4 py-2.5 font-medium">
                    {t("vocab.translation")}
                  </th>
                  <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                    {t("vocab.hsk")}
                  </th>
                  <th className="hidden px-4 py-2.5 font-medium md:table-cell">
                    {t("vocab.status")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((w) => (
                  <tr
                    key={w.id}
                    className="border-b border-line last:border-0 hover:bg-hover"
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={`/dashboard/vocabulary/${w.id}`}
                        className="hanzi text-lg text-accent hover:underline"
                        lang="zh-CN"
                      >
                        {w.hanzi ?? w.text ?? ""}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <PinyinText
                        pinyin={w.pinyin ?? w.romanization ?? ""}
                        zhuyin={w.zhuyin}
                      />
                    </td>
                    <td className="px-4 py-2 text-ink-soft">
                      {showsTranslation(settings.displayMode.mode) &&
                        translationFor(w, locale)}
                    </td>
                    <td className="hidden px-4 py-2 sm:table-cell">
                      <ExamBadge
                        hsk={w.hsk}
                        examMappings={w.examMappings}
                        currentExam={settings.activeExamType}
                      />
                    </td>
                    <td className="hidden px-4 py-2 md:table-cell">
                      <Badge
                        tone={
                          langSrs[w.id]
                            ? langSrs[w.id].mastery >= 60
                              ? "success"
                              : "warn"
                            : "neutral"
                        }
                      >
                        {langSrs[w.id]
                          ? t(masteryLabel(langSrs[w.id].mastery))
                          : t("vocab.notStudied")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </TabPanel>
    </div>
  )
}
