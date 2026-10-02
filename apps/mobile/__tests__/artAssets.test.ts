import { describe, it, expect } from "vitest"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

/**
 * Every asset the source names has to exist on disk.
 *
 * Metro fails the **whole bundle** on one unresolvable `require`, so a rename
 * that moves a PNG without moving the line that names it is a build break, not a
 * missing picture. That is exactly what happened: the town slots were renamed to
 * say what they are rather than what they are in one culture, the PNGs were
 * renamed to match, and the seven zh paths in the art registry kept the old
 * filenames — typecheck, lint and the whole suite stayed green while the app
 * could not be built at all.
 *
 * So the check is filesystem-level rather than import-level: no alias, no React
 * Native, nothing that would stop a rename from being checked.
 */

function packageRoot(): string {
  let dir = process.cwd()
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(dir, "assets", "study-art"))) return dir
    const up = dirname(dir)
    if (up === dir) break
    dir = up
  }
  throw new Error(
    "apps/mobile/assets/study-art not found from " + process.cwd()
  )
}

function sources(root: string): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry)
      if (statSync(p).isDirectory()) walk(p)
      else if (/\.tsx?$/.test(entry)) out.push(p)
    }
  }
  walk(join(root, "src"))
  return out
}

const root = packageRoot()

describe("study art", () => {
  it("names assets that exist", () => {
    const missing: string[] = []
    let checked = 0
    for (const file of sources(root)) {
      const text = readFileSync(file, "utf8")
      for (const m of text.matchAll(/["'`]@assets\/([^"'`]+)["'`]/g)) {
        checked++
        const target = resolve(root, "assets", m[1])
        if (!existsSync(target)) missing.push(`${file}: @assets/${m[1]}`)
      }
    }
    // Guards against the check silently matching nothing after an alias rename.
    expect(checked).toBeGreaterThan(20)
    expect(missing).toEqual([])
  })

  it("gives every learning language the same town slots", () => {
    const dir = join(root, "assets", "study-art", "buildings")
    const sets = Object.fromEntries(
      readdirSync(dir).map((lang) => [
        lang,
        readdirSync(join(dir, lang))
          .filter((f) => f.endsWith(".png"))
          .sort(),
      ])
    )
    expect(Object.keys(sets).sort()).toEqual(["de", "en", "ja", "zh"])
    // One language missing a slot shows a blank row in an otherwise identical
    // town, which no type error can catch: Record only knows the keys exist.
    for (const [lang, files] of Object.entries(sets)) {
      expect(files, `${lang} buildings`).toEqual(sets.zh)
    }
  })

  it("keeps every town building on the same square canvas", () => {
    const dir = join(root, "assets", "study-art", "buildings")
    const seen = new Set<string>()
    for (const lang of readdirSync(dir)) {
      for (const file of readdirSync(join(dir, lang))) {
        if (!file.endsWith(".png")) continue
        const b = readFileSync(join(dir, lang, file))
        seen.add(`${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`)
      }
    }
    // The row is laid out in equal cells; a source that is not square renders
    // `contain` at a different size and the town stops reading as one place.
    expect([...seen]).toEqual(["384x384"])
  })
})
