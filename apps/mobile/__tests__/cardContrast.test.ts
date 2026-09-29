import { describe, it, expect } from "vitest"
import { BASE_THEMES } from "@/theme/colors"
import type { ResolvedMode } from "@/theme/colors"
import { contrastRatio, paperFor, readableOn } from "@/theme/paper"

/**
 * Contrast is a number, and these were wrong without anything objecting: the
 * review card's body copy sat at 1.01:1 against its own background on all five
 * dark themes, and the card tags sat at 1.2:1 in every mode because their text
 * and their chip were drawn from the same tint pair with the roles swapped.
 *
 * Every base theme in all three modes is measured through paperFor, so the
 * assertion is on the palette that ships rather than a re-derivation that could
 * quietly agree with a broken one. Bars are WCAG 2.2 AA: 4.5:1 for body copy
 * and for the 10.5px tag, 3:1 for large text.
 */
const MODES: ResolvedMode[] = ["light", "dark", "amoled"]
const BODY = 4.5

interface Failure {
  where: string
  pair: string
  got: number
  min: number
}

const failures: Failure[] = []
let checks = 0

function expectContrast(
  where: string,
  pair: string,
  fg: string,
  bg: string,
  min: number
) {
  checks++
  const got = Number(contrastRatio(fg, bg).toFixed(2))
  if (got < min) failures.push({ where, pair, got, min })
}

for (const theme of BASE_THEMES) {
  for (const mode of MODES) {
    const p = paperFor(mode === "light" ? theme.light : theme.dark, mode)
    const s = p.surface
    const where = `${theme.id}/${mode}`
    const grounds: Record<string, string> = {
      paper: p.paper,
      card: p.card,
      cardAlt: p.cardAlt,
      review: s.review.fill,
      word: s.word.fill,
      challenge: s.challenge.fill,
      challengeStats: s.challengeStats.fill,
      week: s.week.fill,
      greenSoft: p.greenSoft,
      coralSoft: p.coralSoft,
      lavenderSoft: p.lavenderSoft,
      goldSoft: p.goldSoft,
    }

    for (const [name, bg] of Object.entries(grounds)) {
      expectContrast(where, `ink on ${name}`, p.ink, bg, BODY)
      expectContrast(where, `inkSoft on ${name}`, p.inkSoft, bg, BODY)
      // Carries body copy on the radical and word-list screens, so not large-text.
      expectContrast(where, `inkMuted on ${name}`, p.inkMuted, bg, BODY)
    }

    // Accents are stats, links and button faces at once.
    for (const [name, colour] of Object.entries({
      coral: p.coral,
      green: p.green,
      gold: p.gold,
      lavender: p.lavender,
      greenDark: p.greenDark,
    })) {
      for (const bg of [p.paper, p.card, p.cardAlt]) {
        expectContrast(where, `${name} on ${bg}`, colour, bg, BODY)
      }
      const label = readableOn(colour) ? "#0B1020" : "#FFFFFF"
      expectContrast(where, `${label} on face ${name}`, label, colour, BODY)
    }

    // The tag chip and QuietPill are ink on a surface fill, not one tint member
    // used against the other. SegmentedControl's selected label is the same.
    for (const name of ["review", "word", "challenge", "week"] as const) {
      expectContrast(where, `tag ${name}`, p.ink, s[name].fill, BODY)
    }
    expectContrast(where, "segmented selected", p.ink, p.coralSoft, BODY)
  }
}

describe("the palette is legible in every theme and mode", () => {
  it("measures every theme in every mode", () => {
    // 12 grounds x 3 inks, 5 accents x (3 grounds + a face), 4 tags, 1 segmented.
    expect(checks).toBe(
      BASE_THEMES.length * MODES.length * (12 * 3 + 5 * 4 + 4 + 1)
    )
  })

  it("holds AA everywhere", () => {
    expect(failures).toEqual([])
  })
})
