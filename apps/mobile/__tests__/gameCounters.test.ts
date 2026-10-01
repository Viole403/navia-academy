import { describe, expect, it } from "vitest"
import { translate } from "../src/i18n"

/**
 * The Word Match masthead interpolated the count next to a fixed noun, so a
 * finished run read "1 moves" and "1 pairs".
 */
describe("word match counters", () => {
  it("uses the singular noun for exactly one in English", () => {
    const counted = (n: number) =>
      `${n} ${translate("en", n === 1 ? "game.move" : "game.moves")}`
    expect(counted(1)).toBe("1 move")
    expect(counted(0)).toBe("0 moves")
    expect(counted(2)).toBe("2 moves")
  })

  it("keeps Indonesian as one form", () => {
    const counted = (n: number) =>
      `${n} ${translate("id", n === 1 ? "game.move" : "game.moves")}`
    expect(translate("id", "game.move")).toBe(translate("id", "game.moves"))
    expect(counted(1)).toBe("1 langkah")
    expect(counted(2)).toBe("2 langkah")
  })

  it("never renders a count with a mismatched noun", () => {
    for (const locale of ["en", "id"] as const) {
      for (const n of [0, 1, 2, 17]) {
        const label = translate(locale, n === 1 ? "game.move" : "game.moves")
        expect(label, `${locale} ${n}`).not.toBe(n === 1 ? "moves" : "move")
      }
    }
  })
})
