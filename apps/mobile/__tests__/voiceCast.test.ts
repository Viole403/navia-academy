import { createHash } from "node:crypto"
import { describe, expect, it, vi } from "vitest"

// expo-crypto is native, so back it with node's md5 to test the real rule.
vi.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { MD5: "MD5" },
  digestStringAsync: async (_algo: string, data: string) =>
    createHash("md5").update(data).digest("hex"),
}))

import {
  deriveLocale,
  hashGender,
  castKeyOf,
  isHashCasted,
} from "@/lib/voiceCast"

/** The publisher's own rule, from apps/media/src/lib/voice-casting.ts. */
const publisherGender = (key: string): "female" | "male" =>
  createHash("md5").update(key).digest()[0] % 2 === 0 ? "female" : "male"

describe("castKeyOf", () => {
  it("strips the example index", () => {
    expect(castKeyOf("vocab:de_abend:ex0")).toBe("vocab:de_abend")
    expect(castKeyOf("vocab:de_abend:ex12")).toBe("vocab:de_abend")
  })

  it("keeps the traditional marker, which casts on its own key", () => {
    expect(castKeyOf("vocab:ai4:trad")).toBe("vocab:ai4:trad")
  })

  it("keeps a grammar example, which also casts on its own key", () => {
    expect(castKeyOf("grammar:g-hen:ex0")).toBe("grammar:g-hen:ex0")
  })

  it("leaves a plain headword alone", () => {
    expect(castKeyOf("vocab:de_abend")).toBe("vocab:de_abend")
    expect(castKeyOf("char:c-bian4")).toBe("char:c-bian4")
  })
})

describe("isHashCasted", () => {
  it("covers the domains the publisher casts by hash", () => {
    for (const key of [
      "vocab:de_abend",
      "vocab:de_abend:ex0",
      "char:c-bian4",
      "grammar:g1:ex0",
      "placement:p1",
      "assessment:a1:ex0",
    ]) {
      expect(isHashCasted(key)).toBe(true)
    }
  })

  it("excludes passage narration, which is cast per passage", () => {
    for (const key of [
      "reading:zh-r1:p3",
      "conv:de-conv-014:t0",
      "curriculum:zh-u1:s2:d1",
    ]) {
      expect(isHashCasted(key)).toBe(false)
    }
  })
})

describe("hashGender", () => {
  // A sample of real published keys and the gender the manifest recorded for
  // them. If the derivation drifts, the CDN URL 404s and audio silently drops
  // to backend TTS, so this is the regression that matters.
  const groundTruth: [string, "female" | "male"][] = [
    ["vocab:de_abend", "female"],
    ["vocab:de_abend:ex0", "female"],
    ["vocab:ba1:ex0", "male"],
    ["vocab:bai3:ex0", "female"],
    ["vocab:ai4:trad", "male"],
    ["char:c-bian4", "female"],
    ["vocab:dui4:ex0", "female"],
  ]

  it.each(groundTruth)("derives %s as %s", async (key, expected) => {
    await expect(hashGender(key)).resolves.toBe(expected)
  })

  it("matches the publisher rule exactly for a broad sample", async () => {
    const keys: string[] = []
    for (let i = 0; i < 40; i++) keys.push(`vocab:sample${i}`)
    for (let i = 0; i < 40; i++) keys.push(`vocab:sample${i}:ex0`)
    for (let i = 0; i < 20; i++) keys.push(`grammar:g${i}:ex0`)
    for (let i = 0; i < 20; i++) keys.push(`vocab:t${i}:trad`)
    for (const key of keys) {
      // Vocabulary examples cast on the headword; everything else on itself.
      await expect(hashGender(key)).resolves.toBe(
        publisherGender(castKeyOf(key))
      )
    }
  })

  it("gives an example its headword's voice", async () => {
    const head = await hashGender("vocab:de_abend")
    await expect(hashGender("vocab:de_abend:ex0")).resolves.toBe(head)
    await expect(hashGender("vocab:de_abend:ex3")).resolves.toBe(head)
  })
})

describe("deriveLocale", () => {
  it("is fixed per non-Chinese language", () => {
    expect(deriveLocale("vocab:de_abend", "de")).toBe("de-DE")
    expect(deriveLocale("vocab:ba1", "ja")).toBe("ja-JP")
    expect(deriveLocale("vocab:ba1", "en")).toBe("en-US")
  })

  it("splits Chinese on the key, HSK vs TOCFL", () => {
    expect(deriveLocale("vocab:ba1", "zh")).toBe("zh-CN")
    expect(deriveLocale("vocab:tocfl-n1-ba", "zh")).toBe("zh-TW")
    expect(deriveLocale("vocab:ai4:trad", "zh")).toBe("zh-TW")
    expect(deriveLocale("vocab:ai4", "zh")).toBe("zh-CN")
  })
})
