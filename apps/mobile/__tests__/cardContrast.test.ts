import { describe, it, expect } from "vitest"
import { BASE_THEMES } from "@/theme/colors"
import { paperFor } from "@/theme/paper"
import type { ResolvedMode } from "@/theme/colors"

/**
 * The review, challenges and week cards tint their fill with an accent, and the
 * body copy on them is paper.inkSoft. One dark-theme branch of that tint mixed
 * the accent itself toward white rather than laying the accent over the page,
 * which put near-white text on saturated coral at 1.01:1 — the same luminance
 * as its own background, on all five dark themes. Nothing warned: it looked
 * like a design choice until the words were read.
 *
 * These assertions call paperFor directly, so they measure the shipped palette
 * rather than a re-derivation that could drift from it.
 */
const MODES: ResolvedMode[] = ["light", "dark", "amoled"]

// WCAG 2.2 relative luminance and contrast.
function channel(value: number): number {
  const v = value / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}
function luminance(hex: string): number {
  const n = parseInt(hex.replace("#", ""), 16)
  const r = channel((n >> 16) & 255)
  const g = channel((n >> 8) & 255)
  const b = channel(n & 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

const TINTED: {
  key: keyof ReturnType<typeof paperFor>["surface"]
  label: string
}[] = [
  { key: "review", label: "review" },
  { key: "challenge", label: "challenge" },
  { key: "week", label: "week" },
]

// Body copy needs AA at 4.5:1; the card title is large enough for 3:1.
const BODY_MIN = 4.5
const TITLE_MIN = 3

interface Failure {
  where: string
  label: string
  body: number
  title: number
}

const failures: Failure[] = []
const measured: string[] = []

for (const theme of BASE_THEMES) {
  for (const mode of MODES) {
    // A definition carries both modes; paperFor takes the one in play.
    const paper = paperFor(mode === "light" ? theme.light : theme.dark, mode)
    for (const { key, label } of TINTED) {
      const fill = paper.surface[key].fill
      const body = contrast(fill, paper.inkSoft)
      const title = contrast(fill, paper.ink)
      measured.push(`${theme.id}/${mode}/${label}`)
      if (body < BODY_MIN || title < TITLE_MIN) {
        failures.push({
          where: `${theme.id}/${mode}`,
          label,
          body: Number(body.toFixed(2)),
          title: Number(title.toFixed(2)),
        })
      }
    }
  }
}

describe("tinted card fills stay legible", () => {
  it("covers every base theme in every mode", () => {
    expect(measured.length).toBe(
      BASE_THEMES.length * MODES.length * TINTED.length
    )
  })

  it("holds AA for the body copy and the card title", () => {
    expect(failures).toEqual([])
  })
})
