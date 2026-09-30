import { describe, expect, it } from "vitest"
import { CATEGORIES, categoryGlyph, categoryOf } from "@/lib/wordCategories"
import type { VocabWord } from "@/types/api"

const word = (pos?: string, tags: string[] = []): VocabWord =>
  ({ id: "w", hanzi: "w", translation: "w", pos, tags }) as VocabWord

describe("categoryGlyph", () => {
  // The tiles carried hardcoded hanzi, so a German or English learner was shown
  // 動 名 形 法 for categories that mean nothing outside a Chinese track.
  it("keeps the hanzi mark on a character-script track", () => {
    const verbs = CATEGORIES.find((c) => c.id === "verbs")!
    expect(categoryGlyph(verbs, true)).toBe("動")
  })

  it("uses the category initial everywhere else", () => {
    const letters = CATEGORIES.map((c) => categoryGlyph(c, false))
    expect(letters).toEqual(["V", "N", "D", "G", "T", "O"])
  })

  it("never emits hanzi for a non-CJK track", () => {
    for (const c of CATEGORIES) {
      expect(categoryGlyph(c, false)).toMatch(/^[A-Z]$/)
    }
  })

  it("gives every category a distinct initial", () => {
    const initials = CATEGORIES.map((c) => c.letter)
    expect(new Set(initials).size).toBe(CATEGORIES.length)
  })
})

describe("categoryOf", () => {
  it("prefers a tag theme over the part of speech", () => {
    expect(categoryOf(word("noun", ["time"]))).toBe("timePlace")
    expect(categoryOf(word("verb", ["food"]))).toBe("nouns")
  })

  it("falls back to the part of speech", () => {
    expect(categoryOf(word("verb"))).toBe("verbs")
    expect(categoryOf(word("adjective"))).toBe("descriptors")
  })

  it("falls back to other for anything unmapped", () => {
    expect(categoryOf(word(""))).toBe("other")
    expect(categoryOf(word())).toBe("other")
  })
})
