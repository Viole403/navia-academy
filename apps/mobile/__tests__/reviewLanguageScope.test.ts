import { describe, expect, it } from "vitest"
import { cardsInLanguage, indexWordsById } from "../src/lib/content-data"
import type { SrsCard, VocabWord } from "../src/types/api"

/**
 * The due-card endpoint answers every card an account owes, in any language, so
 * the review session has to scope them itself. Item ids are unique only inside
 * their own bundle, which made a cross-language lookup look harmless — a Goethe
 * learner was served Chinese questions, and Chinese answer options, because the
 * ids were resolved against all four languages and the distractors came from the
 * same unscoped list.
 */
const word = (id: string): VocabWord =>
  ({ id, text: id, translation: id }) as unknown as VocabWord

const card = (item_id: string): SrsCard =>
  ({ item_id, kind: "flashcard", mastery: 0 }) as unknown as SrsCard

describe("review session language scope", () => {
  const german = indexWordsById([word("de_abend"), word("de_baum")])
  const owed = [card("de_abend"), card("zh_ma"), card("de_baum"), card("ja_a")]

  it("keeps only the cards that exist in the active course's bundle", () => {
    expect(cardsInLanguage(owed, german).map((c) => c.item_id)).toEqual([
      "de_abend",
      "de_baum",
    ])
  })

  it("resolves every word from the active bundle, with no other-language fallback", () => {
    const kept = cardsInLanguage(owed, german)
    expect(kept.every((c) => german.has(c.item_id))).toBe(true)
    expect(german.has("zh_ma")).toBe(false)
  })

  it("yields an empty session rather than a session in the wrong language", () => {
    const chinese = indexWordsById([word("zh_ma")])
    expect(cardsInLanguage(owed, chinese)).toHaveLength(1)
    expect(cardsInLanguage(owed, indexWordsById([word("ja_a")]))).toHaveLength(
      1
    )
    expect(cardsInLanguage(owed, indexWordsById([]))).toHaveLength(0)
  })

  it("builds the map last-wins on duplicate ids so lookups stay deterministic", () => {
    const map = indexWordsById([word("de_abend"), word("de_abend")])
    expect(map.size).toBe(1)
  })
})
