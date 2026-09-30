import { describe, expect, it } from "vitest"
import { starterVocabulary } from "@/lib/dictionary-rank"
import type { VocabWord } from "@/types/api"

const word = (
  id: string,
  mappings: Record<string, string | number>
): VocabWord =>
  ({
    id,
    hanzi: id,
    text: id,
    translation: id,
    examMappings: mappings,
  }) as VocabWord

describe("starterVocabulary", () => {
  // Goethe ladders read "A1" and JLPT reads "N5", so the old numeric
  // `Number(lv) <= 1` test matched nothing and the German, Japanese and
  // English starter decks rendered empty even though the bank was full.
  it("picks the first rung of a letter-named ladder", () => {
    const words = [
      word("abend", { goethe: "A1" }),
      word("acht", { goethe: "A2" }),
    ]
    expect(starterVocabulary(words, "goethe").map((w) => w.id)).toEqual([
      "abend",
    ])
  })

  it("picks the first rung of a kana ladder", () => {
    const words = [
      word("あさ", { jlpt: "N5" }),
      word("せんせい", { jlpt: "N4" }),
    ]
    expect(starterVocabulary(words, "jlpt").map((w) => w.id)).toEqual(["あさ"])
  })

  it("still works for numeric ladders", () => {
    const words = [word("one", { hsk: 1 }), word("two", { hsk: 2 })]
    expect(starterVocabulary(words, "hsk").map((w) => w.id)).toEqual(["one"])
  })

  it("matches the ladder case-insensitively", () => {
    // Ladders are upper-cased; content mappings are not guaranteed to be.
    const words = [word("abend", { goethe: "a1" })]
    expect(starterVocabulary(words, "goethe").map((w) => w.id)).toEqual([
      "abend",
    ])
  })

  it("returns nothing when no word carries the exam mapping", () => {
    const words = [word("abend", { hsk: 1 })]
    expect(starterVocabulary(words, "goethe")).toEqual([])
  })

  it("returns nothing when the word has no mapping at all", () => {
    expect(starterVocabulary([word("x", {})], "goethe")).toEqual([])
  })

  it("caps the deck", () => {
    const words = Array.from({ length: 20 }, (_, i) =>
      word(`w${i}`, { goethe: "A1" })
    )
    expect(starterVocabulary(words, "goethe")).toHaveLength(8)
    expect(starterVocabulary(words, "goethe", 3)).toHaveLength(3)
  })
})
