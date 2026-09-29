import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { RADIUS } from "@/theme/paper"

/** Roles that must never carry a hand-invented radius. */
const PILL_ROLES = /paddingVertical|paddingHorizontal/
const INVENTED = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 999]

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((e) => {
    const p = join(dir, e)
    if (e === "node_modules" || e === "__tests__") return []
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".tsx") ? [p] : []
  })
}

describe("radius scale", () => {
  it("exposes exactly the four documented roles", () => {
    expect(RADIUS).toEqual({ card: 20, inner: 14, pill: 24, tag: 12 })
  })

  it("no pill-role control hardcodes an invented radius", () => {
    const offenders: string[] = []
    for (const f of [...walk("app"), ...walk("src")]) {
      const lines = readFileSync(f, "utf8").split("\n")
      lines.forEach((line, i) => {
        const m = line.match(/borderRadius:\s*(\d+)/)
        if (!m) return
        const n = Number(m[1])
        if (!INVENTED.includes(n)) return
        // Padding can sit a few lines either side in a multi-line style object.
        const near = lines.slice(Math.max(0, i - 6), i + 7).join("\n")
        const w = near.match(/(?:^|\s)width:\s*(\d+)/)
        const h = near.match(/(?:^|\s)height:\s*(\d+)/)
        // A square with a known size is a circle: its radius is half that size.
        const isCircle = !!w && !!h && w[1] === h[1] && Number(w[1]) / 2 === n
        if (isCircle || !PILL_ROLES.test(near)) return
        offenders.push(`${f}:${i + 1} r=${n}`)
      })
    }
    expect(offenders).toEqual([])
  })

  it("keeps a full-round cap for circles out of the pill vocabulary", () => {
    const offenders: string[] = []
    for (const f of [...walk("app"), ...walk("src")]) {
      readFileSync(f, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (/borderRadius:\s*999\b/.test(line))
            offenders.push(`${f}:${i + 1}`)
        })
    }
    expect(offenders).toEqual([])
  })
})
