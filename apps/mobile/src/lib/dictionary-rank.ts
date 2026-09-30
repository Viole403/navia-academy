import { examLevels, headword, reading } from "@/lib/languages"
import type { VocabWord } from "@/types/api"

/**
 * Dictionary search ranking.
 *
 * The English tiers are the part that matters: an exact gloss outranks a loose
 * pinyin coincidence, so "red" answers 紅色 rather than 熱帶, 熱點 and 熱度.
 *
 * Ladder (per entry, best match wins):
 *   exact headword > exact gloss > headword prefix > reading
 *   syllable-prefix > gloss word-start > bare contains.
 * Ties break on headword length, then alphabetically.
 */
const SCORE = {
  headwordExact: 100,
  glossExact: 90,
  headwordPrefix: 70,
  readingPrefix: 60,
  glossWord: 50,
  headwordContains: 30,
  readingContains: 20,
  glossContains: 10,
} as const

function norm(s: string): string {
  return s.toLowerCase().normalize("NFKC").trim()
}

/** Fold plurals on the query (CC-CEDICT-style glosses are singular). */
function singularise(q: string): string[] {
  if (q.length > 3 && q.endsWith("s") && !q.endsWith("ss")) {
    return [q, q.slice(0, -1)]
  }
  return [q]
}

/** Pinyin prefix counts only on a syllable boundary ("shui" ⊂ "shuǐ guǒ" ✓). */
function isSyllablePrefix(reading: string, q: string): boolean {
  if (!reading.startsWith(q)) return false
  if (reading.length === q.length) return true
  const next = reading[q.length]
  return next === " " || next === "'" || /[1-5ˉˊˇˋ˙]/.test(next)
}

function glossWords(gloss: string): string[] {
  return gloss.split(/[^a-z0-9'’-]+/i).filter(Boolean)
}

export function rankVocabulary(
  words: VocabWord[],
  rawQuery: string
): VocabWord[] {
  const q0 = norm(rawQuery)
  if (!q0) return words
  const queries = singularise(q0)

  const scored: { w: VocabWord; s: number; tie: string }[] = []
  for (const w of words) {
    const hw = norm(headword(w))
    const rd = norm(reading(w) ?? "")
    const gl = norm(String(w.translation ?? ""))
    const words_ = glossWords(gl)
    let best = 0
    for (const q of queries) {
      if (hw === q) best = Math.max(best, SCORE.headwordExact)
      else if (gl === q) best = Math.max(best, SCORE.glossExact)
      else if (hw.startsWith(q)) best = Math.max(best, SCORE.headwordPrefix)
      else if (rd && isSyllablePrefix(rd, q))
        best = Math.max(best, SCORE.readingPrefix)
      else if (words_.some((g) => g === q || g.startsWith(q)))
        best = Math.max(best, SCORE.glossWord)
      else if (hw.includes(q)) best = Math.max(best, SCORE.headwordContains)
      else if (rd.includes(q)) best = Math.max(best, SCORE.readingContains)
      else if (gl.includes(q)) best = Math.max(best, SCORE.glossContains)
    }
    if (best > 0) scored.push({ w, s: best, tie: hw })
  }
  scored.sort(
    (a, b) =>
      b.s - a.s || a.tie.length - b.tie.length || (a.tie < b.tie ? -1 : 1)
  )
  return scored.map((s) => s.w)
}

/**
 * The starter deck: the easiest rung of the active exam's own ladder.
 *
 * Level names are only numeric for HSK. Goethe ladders read "A1" and JLPT reads
 * "N5", so a numeric comparison silently matched nothing and the card rendered
 * as an empty dictionary for every language except Chinese.
 */
export function starterVocabulary(
  words: VocabWord[],
  examType: string,
  limit = 8
): VocabWord[] {
  const first = examLevels(examType)[0]?.toUpperCase()
  if (!first) return []
  return words
    .filter(
      (w) => String(w.examMappings?.[examType] ?? "").toUpperCase() === first
    )
    .slice(0, limit)
}
