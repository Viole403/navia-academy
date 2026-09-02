"use client"

import { useMounted } from "@/lib/use-mounted"
import Link from "next/link"
import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { useCharacters } from "@/lib/characters"
import { useExamConfig } from "@/lib/exam-definitions"
import { srsFor, useProgress } from "@/stores/progress"
import { showsTranslation, useSettings } from "@/stores/settings"
import {
  EmptyState,
  PinyinText,
  Pagination,
  SectionHeader,
  Select,
} from "@/components/ui"
import { cn, stripPinyinTones } from "@/lib/utils"
import { useTranslation } from "@/i18n/locale-context"

export default function CharactersPage() {
  const settings = useSettings()
  const langSrs = useProgress((s) => srsFor(s, settings.language))
  const [query, setQuery] = useState("")
  const [radical, setRadical] = useState("all")
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 24
  const mounted = useMounted()
  const { t } = useTranslation()
  const CHARACTERS = useCharacters()
  const { displayNames: EXAM_DISPLAY_NAMES } = useExamConfig()

  const examChars = useMemo(
    () =>
      CHARACTERS.filter((c) =>
        Boolean(c.examMappings?.[settings.activeExamType])
      ),
    [settings.activeExamType, CHARACTERS]
  )
  const radicals = useMemo(
    () => [...new Set(examChars.map((c) => c.radical).filter(Boolean))].sort(),
    [examChars]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const qToneFree = stripPinyinTones(q)
    return examChars.filter((c) => {
      if (radical !== "all" && c.radical !== radical) return false
      if (q) {
        const hanzi = c.char.includes(q)
        const pinyin = stripPinyinTones(c.pinyin)
          .toLowerCase()
          .includes(qToneFree)
        const meaning = c.meaning.toLowerCase().includes(q)
        if (!(hanzi || pinyin || meaning)) return false
      }
      return true
    })
  }, [query, radical, examChars])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const [filterKey, setFilterKey] = useState("")
  const nextKey = `${query}|${radical}`
  if (nextKey !== filterKey) {
    setFilterKey(nextKey)
    setPage(1)
  }

  if (!mounted) return null

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title={t("nav.characters")}
        subtitle={t("characters.subtitle", {
          n: String(examChars.length),
          exam: EXAM_DISPLAY_NAMES[settings.activeExamType],
        })}
      />

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
            placeholder={t("characters.searchPlaceholder")}
            aria-label={t("characters.searchAria")}
            className="w-full rounded-[var(--radius)] border border-line bg-raised py-2.5 pr-3 pl-9 text-sm placeholder:text-ink-faint focus:border-accent focus:outline-none"
          />
        </div>
        <Select
          aria-label={t("characters.radicalFilter")}
          value={radical}
          onChange={(e) => setRadical(e.target.value)}
          className="w-40"
        >
          <option value="all">{t("characters.allRadicals")}</option>
          {radicals.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="h-8 w-8" />}
          title={t("characters.noResults")}
          description={t("characters.noResultsDesc")}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {visible.map((c) => {
            const card = langSrs[c.id]
            return (
              <Link
                key={c.id}
                href={`/dashboard/characters/${c.id}`}
                className={cn(
                  "rounded-[var(--radius)] border bg-raised p-4 text-center transition-colors hover:border-accent",
                  card && card.mastery >= 60 ? "border-jade/50" : "border-line"
                )}
              >
                <span className="hanzi block text-5xl" lang="zh-CN">
                  {c.char}
                </span>
                <PinyinText
                  pinyin={c.pinyin}
                  zhuyin={c.zhuyin}
                  className="mt-2 block text-sm font-medium"
                />
                {showsTranslation(settings.displayMode.mode) && (
                  <span className="block text-xs text-ink-faint">
                    {c.meaning}
                  </span>
                )}
                <span className="mt-1.5 block text-xs text-ink-faint">
                  {c.radical
                    ? t("characters.strokes", {
                        n: String(c.strokes),
                        radical: c.radical,
                      })
                    : t("characters.strokesLabel") + " " + String(c.strokes)}
                </span>
              </Link>
            )
          })}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  )
}
