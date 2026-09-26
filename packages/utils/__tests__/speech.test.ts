import { describe, it, expect } from "vitest"

import {
  matchTranscript,
  normalizeTranscript,
  sttLocale,
  transcriptSimilarity,
} from "../speech"

/**
 * These decide whether a learner's answer counts, so the tests pin the two
 * things that actually go wrong in practice: a recogniser disagreeing about
 * form or spacing, and a target that is simply not in the transcript.
 */

describe("sttLocale", () => {
  it("maps each learning language to a recogniser locale", () => {
    expect(sttLocale("zh")).toBe("zh-CN")
    expect(sttLocale("ja")).toBe("ja-JP")
    expect(sttLocale("de")).toBe("de-DE")
    expect(sttLocale("en")).toBe("en-US")
  })

  it("falls back rather than returning an unusable locale", () => {
    expect(sttLocale("klingon")).toBe("en-US")
  })
})

describe("normalizeTranscript", () => {
  it("drops case and spacing", () => {
    expect(normalizeTranscript("Hello World")).toBe("helloworld")
  })

  it("folds full-width forms a recogniser and a typed phrase disagree about", () => {
    expect(normalizeTranscript("你好，")).toBe("你好")
    expect(normalizeTranscript("Ｈｅｌｌｏ")).toBe("hello")
  })

  it("keeps letters from every script", () => {
    expect(normalizeTranscript("grüßen")).toBe("grüßen")
    expect(normalizeTranscript("こんにちは")).toBe("こんにちは")
  })

  it("drops punctuation entirely", () => {
    expect(normalizeTranscript("¿Qué tal? ¡Bien!")).toBe("quétalbien")
  })
})

describe("matchTranscript", () => {
  it("matches a short phrase despite the recogniser's spacing", () => {
    // A zh recogniser returns characters with spaces; the target has none.
    expect(matchTranscript("你 好", "你好")).toBe(true)
  })

  it("survives punctuation differences", () => {
    expect(matchTranscript("hello, world.", "Hello world")).toBe(true)
  })

  it("does not match a different phrase", () => {
    expect(matchTranscript("再见", "你好")).toBe(false)
  })

  it("is not fooled by an empty side", () => {
    expect(matchTranscript("", "你好")).toBe(false)
    expect(matchTranscript("你好", "")).toBe(false)
  })

  it("is exact, so a longer phrase is brittle by design", () => {
    // Documented behaviour: a near miss is not a match. This is why the
    // similarity score exists — the gap between the two is the learner's
    // signal, and collapsing it to a boolean would throw that away.
    expect(matchTranscript("我很好", "我很好啊")).toBe(false)
  })
})

describe("transcriptSimilarity", () => {
  it("is 1 for an exact match", () => {
    expect(transcriptSimilarity("hello world", "hello world", "en")).toBe(1)
  })

  it("is 0 for nothing recognised of the target", () => {
    expect(transcriptSimilarity("", "hello world", "en")).toBe(0)
  })

  it("rises with the amount of the target actually said", () => {
    const none = transcriptSimilarity("zzz", "hello world", "en")
    const half = transcriptSimilarity("hello", "hello world", "en")
    const most = transcriptSimilarity("hello there", "hello world", "en")
    const all = transcriptSimilarity("hello world", "hello world", "en")
    expect(none).toBeLessThan(half)
    expect(half).toBeLessThan(most)
    expect(most).toBeLessThan(all)
  })

  it("gives a wholly wrong short transcript only a little credit", () => {
    // A consequence of charging half for a substitution: a one-word guess at a
    // two-word target still earns something. Asserted so the generosity is
    // visible rather than discovered by a learner being marked up on nonsense.
    const wrong = transcriptSimilarity("zzz", "hello world", "en")
    expect(wrong).toBeGreaterThan(0)
    expect(wrong).toBeLessThan(0.5)
  })

  it("charges half for a substitution rather than a whole miss", () => {
    // "hello" vs "hallo": one substituted word out of one target word.
    expect(transcriptSimilarity("hallo", "hello", "en")).toBeCloseTo(0.5, 5)
  })

  it("compares Chinese per character, not as one blob", () => {
    const partial = transcriptSimilarity("我很好", "我很好啊", "zh")
    expect(partial).toBeGreaterThan(0.5)
    expect(partial).toBeLessThan(1)
  })

  it("does not reward a reordering as a perfect score", () => {
    // Order carries meaning, so swapped words are a real error.
    const swapped = transcriptSimilarity("world hello", "hello world", "en")
    expect(swapped).toBeLessThan(1)
  })

  it("charges for words the recogniser invented but not fatally", () => {
    // An insertion costs one edit, so hearing extra words is penalised without
    // wiping out the words that were right.
    const withExtra = transcriptSimilarity("hello there world", "hello world", "en")
    const exact = transcriptSimilarity("hello world", "hello world", "en")
    expect(withExtra).toBeLessThan(exact)
    expect(withExtra).toBeGreaterThan(0.4)
  })

  it("is bounded at 0 and 1 for nonsense input", () => {
    for (const [a, b] of [
      ["", "x"],
      ["x", ""],
      ["aaa", "bbb"],
    ] as const) {
      const score = transcriptSimilarity(a, b, "en")
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(1)
    }
  })
})
