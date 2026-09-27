import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

/**
 * A plain <View> hands its style straight to the shadow tree, so an
 * Animated.Value lands in processTransform untouched and throws
 * "Transform with key of translateX must be number or a percentage". It is a
 * render-time invariant with no component stack, and it reached eight call sites
 * across four files before anything caught it, so it is worth a source scan.
 */
const ROOTS = ["app", "src"]
const SOURCES = /\.tsx?$/

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (entry === "node_modules" || entry.startsWith(".")) continue
    if (statSync(full).isDirectory()) walk(full, out)
    else if (SOURCES.test(entry)) out.push(full)
  }
  return out
}

// One opening tag, up to its own `>`, so a child's style is never read as the
// parent's — the naive scan reports false positives on wrapper Views.
const OPENING_TAG = /<View\b(?:[^<>]|<[A-Za-z/][^<>]*?)*?>/g
const ANIMATED_STYLE =
  /translate[XY]:\s*\w+\.(translate|opacity)\b|opacity:\s*\w+\.opacity\b/

describe("animated styles reach a real animated host", () => {
  const files = ROOTS.flatMap((r) => walk(r))
  const offenders: string[] = []

  for (const file of files) {
    const source = readFileSync(file, "utf8")
    for (const match of source.matchAll(OPENING_TAG)) {
      if (!ANIMATED_STYLE.test(match[0])) continue
      if (
        source
          .slice(Math.max(0, match.index! - 12), match.index)
          .includes("Animated.")
      )
        continue
      const line = source.slice(0, match.index!).split("\n").length
      offenders.push(`${file}:${line}`)
    }
  }

  it("finds no plain <View> fed an Animated.Value", () => {
    expect(offenders).toEqual([])
  })

  it("actually scans source files", () => {
    // A scan that silently reads nothing would pass the test above forever.
    expect(files.length).toBeGreaterThan(20)
  })
})
