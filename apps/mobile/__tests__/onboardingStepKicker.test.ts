import { describe, expect, it } from "vitest"
import en from "../src/i18n/en"
import id from "../src/i18n/id"
import { translate } from "../src/i18n"

/**
 * The onboarding kicker used to hardcode "Step 01", "Step 03", "Step 06" … in
 * the translation strings, while the step order is derived at runtime: the
 * `script` step is filtered out for Latin-script languages. A German learner saw
 * the six steps numbered 1, 1, 3, 4, 6, 5. The number is now passed in.
 */
const KICKERS = [
  "ob.kWelcome",
  "ob.kLanguage",
  "ob.kScript",
  "ob.kTheme",
  "ob.kGoal",
  "ob.kReminders",
  "ob.kReady",
] as const

describe("onboarding step kicker", () => {
  it("leaves the step number to the caller in both locales", () => {
    for (const key of KICKERS) {
      expect(en[key], key).toContain("%d")
      expect(id[key], key).toContain("%d")
      expect(en[key], key).not.toMatch(/\d{2}/)
      expect(id[key], key).not.toMatch(/\d{2}/)
    }
  })

  it("fills a zero-padded position into the English string", () => {
    expect(translate("en", "ob.kTheme", { n: "03" })).toBe(
      "Step 03 — Atmosphere"
    )
  })

  it("keeps the Indonesian word order around the number", () => {
    expect(translate("id", "ob.kTheme", { n: "03" })).toBe(
      "Langkah 03 — Suasana"
    )
  })

  it("renders consecutive positions without a gap or repeat", () => {
    const rendered = KICKERS.map((_, i) =>
      translate("en", KICKERS[i], { n: String(i + 1).padStart(2, "0") })
    )
    expect(rendered.map((s) => s.slice(0, 8))).toEqual([
      "Step 01 ",
      "Step 02 ",
      "Step 03 ",
      "Step 04 ",
      "Step 05 ",
      "Step 06 ",
      "Step 07 ",
    ])
  })
})
