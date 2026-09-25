import { headword } from "@/lib/languages"
import type { VocabWord } from "@/types/api"

/**
 * Greedy longest-match segmentation of text against the vocabulary bank.
 *
 * Ported from Chinese-Easy `lib/textSegmentation`, with the cache kept because
 * it is not optional: one call meant tens of thousands of map inserts, which is
 * survivable when a reader segments a page at a time and not when a modal
 * segments sixty sentences. The table is keyed on the bank it was built from, so
 * a rebuilt bundle produces a new index rather than stale membership.
 *
 * `text` is what offsets are measured from, `word` is identity, and `known` says
 * whether the bank recognised it. Drawing uses `text`; lookup uses `word`.
 */
export interface TextSegment {
  text: string
  /** The matched entry, or null for a run of characters the bank does not have. */
  word: VocabWord | null
  known: boolean
}

let cachedBank: VocabWord[] | null = null
let cachedIndex: Map<string, VocabWord> | null = null

function indexFor(bank: VocabWord[]) {
  if (cachedBank === bank && cachedIndex) return cachedIndex
  const index = new Map<string, VocabWord>()
  for (const w of bank) {
    const hw = headword(w)
    // A duplicate headword resolves to the lowest-frequency entry, which is the
    // one a learner is more likely to have met first.
    const existing = index.get(hw)
    if (!existing || (w.frequency ?? 0) < (existing.frequency ?? 0)) {
      index.set(hw, w)
    }
  }
  cachedBank = bank
  cachedIndex = index
  return index
}

/** Longest key in the bank, so the greedy scan knows how far to look ahead. */
function maxKeyLength(index: Map<string, VocabWord>): number {
  let max = 1
  for (const key of index.keys()) if (key.length > max) max = key.length
  return max
}

/**
 * Segment into runs of known words and unknown text.
 *
 * Unknown runs are broken per character rather than kept whole, because the
 * reader draws a reading under every segment and a blank line under a 12-character
 * run of names and bound forms is exactly the case that looks broken.
 */
export function segmentText(text: string, bank: VocabWord[]): TextSegment[] {
  if (!text) return []
  const index = indexFor(bank)
  const limit = Math.max(1, maxKeyLength(index))
  const out: TextSegment[] = []
  let i = 0
  let unknownRun = ""

  const flushUnknown = () => {
    if (!unknownRun) return
    for (const ch of unknownRun) {
      out.push({ text: ch, word: null, known: false })
    }
    unknownRun = ""
  }

  while (i < text.length) {
    // Longest match wins: 我喜欢 must prefer 喜欢 over 我.
    let matched: string | null = null
    const max = Math.min(limit, text.length - i)
    for (let n = max; n > 0; n--) {
      const slice = text.slice(i, i + n)
      if (index.has(slice)) {
        matched = slice
        break
      }
    }
    if (matched) {
      flushUnknown()
      out.push({ text: matched, word: index.get(matched)!, known: true })
      i += matched.length
    } else {
      unknownRun += text[i]
      i += 1
    }
  }
  flushUnknown()
  return out
}

/** How much of a passage the bank can actually account for. */
export function coverage(segments: TextSegment[]): number {
  if (segments.length === 0) return 0
  const known = segments.filter((s) => s.known).length
  return known / segments.length
}
