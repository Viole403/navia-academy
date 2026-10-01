import { describe, expect, it } from "vitest"
import { translate } from "../src/i18n"

/**
 * The catalogue is written with named placeholders ("{n}"), which reached the
 * screen verbatim because interpolation only filled positional "%d" ones —
 * so Tasks showed "Review {n} due words" and "{n} of them are overdue".
 */
describe("translate interpolation", () => {
  it("fills a named placeholder", () => {
    expect(translate("en", "tasks.gen.reviewTitle", { n: 7 })).toBe(
      "Review 7 due words"
    )
  })

  it("fills a named placeholder in Indonesian", () => {
    expect(translate("id", "tasks.gen.reviewTitle", { n: 7 })).not.toContain(
      "{n}"
    )
  })

  it("fills two different values in one string", () => {
    expect(translate("en", "gram.showing", { n: 20, total: 56 })).toBe(
      "Showing 20 of 56"
    )
  })

  it("still fills positional placeholders", () => {
    expect(translate("en", "ob.kTheme", { n: "03" })).toBe(
      "Step 03 — Atmosphere"
    )
  })

  it("leaves an unknown placeholder visible rather than printing undefined", () => {
    const out = translate("en", "tasks.minutes", {})
    expect(out).not.toContain("undefined")
  })

  it("leaves no catalogue placeholder unsubstituted", () => {
    for (const [locale, key, params] of [
      ["en", "tasks.gen.reviewTitle", { n: 1 }],
      ["id", "tasks.gen.reviewTitle", { n: 1 }],
      ["en", "tasks.minutes", { n: 5 }],
      ["id", "tasks.minutes", { n: 5 }],
      ["en", "gram.showing", { n: 1, total: 2 }],
      ["id", "gram.showing", { n: 1, total: 2 }],
    ] as const) {
      const out = translate(locale, key, params as never)
      expect(out, `${locale} ${key}`).not.toMatch(/[{}]/)
    }
  })
})
