import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { loadVocabulary } from "@/lib/content-data"
import { useOnboardingStore } from "@/store/onboarding"
import type { VocabWord } from "@/types/api"
import { useTargetLanguage } from "@/hooks/useTargetLanguage"

/**
 * Resolve card item ids to their vocabulary entries.
 *
 * The deck is the server's — it holds `item_id`s, not words — and the words live
 * in the CDN bundle. So the join happens here, once, against the bundle that is
 * already in memory: `findWord` per id would reload *every* language bundle once
 * per lookup, which is the right cost for a detail screen and the wrong one for
 * a list of forty.
 *
 * An id with no entry is simply absent from the result rather than rendered as
 * a raw identifier — a row reading `vocab:hs1:0231` teaches nobody anything.
 */
export function useWordsFor(ids: string[]): Record<string, VocabWord> {
  const language = useTargetLanguage()
  const key = ids.slice().sort().join("|")

  const vocabQ = useQuery({
    queryKey: ["vocab-all", language],
    queryFn: () => loadVocabulary(language),
  })

  return useMemo(() => {
    const out: Record<string, VocabWord> = {}
    const all = vocabQ.data
    if (!all) return out
    const wanted = new Set(ids)
    for (const w of all) {
      if (wanted.has(w.id)) out[w.id] = w
      if (Object.keys(out).length === wanted.size) break
    }
    return out
    // `key` is the stable identity of `ids`; `ids` itself is a fresh array on
    // every render and would defeat the memo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vocabQ.data, key])
}
