import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { BASE_THEMES } from "@/theme/colors"
import { contrastRatio, paperFor } from "@/theme/paper"

const BODY = 4.5

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((e) => {
    const p = join(dir, e)
    if (e === "node_modules" || e === "__tests__") return []
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".tsx") ? [p] : []
  })
}

const TREE = [
  ...walk("app/settings"),
  "src/components/settings/SettingsGroup.tsx",
]

describe("settings legibility", () => {
  it("inkMuted is readable on every card surface in every theme", () => {
    for (const t of BASE_THEMES) {
      for (const mode of ["light", "dark", "amoled"] as const) {
        const p = paperFor(mode === "light" ? t.light : t.dark, mode)
        for (const ground of [p.paper, p.cardAlt, p.card] as const) {
          const ratio = contrastRatio(p.inkMuted, ground)
          expect(`${mode}/${t.id}/${ratio.toFixed(2)}`).toMatch(
            new RegExp(`/(4\\.5|[5-9]\\.\\d\\d|1\\d\\.\\d\\d)$`)
          )
        }
      }
    }
  })

  it("no settings screen paints a label with the unreadable dim token", () => {
    const offenders = TREE.flatMap((f) =>
      readFileSync(f, "utf8")
        .split("\n")
        .flatMap((line, i) =>
          /theme\.textDim\b/.test(line) ? [`${f}:${i + 1}`] : []
        )
    )
    expect(offenders).toEqual([])
  })

  it("no settings screen derives a fill from a raw token plus an alpha suffix", () => {
    // theme.accent + "18" is the bug: a raw token under an alpha suffix is not a
    // contrast-corrected surface. paper.* carries its own correction instead.
    const offenders = TREE.flatMap((f) =>
      readFileSync(f, "utf8")
        .split("\n")
        .flatMap((line, i) =>
          /theme\.[a-zA-Z0-9]+\s*\+\s*["'][0-9A-Fa-f]{2}["']/.test(line)
            ? [`${f}:${i + 1} ${line.trim()}`]
            : []
        )
    )
    expect(offenders).toEqual([])
  })
})
