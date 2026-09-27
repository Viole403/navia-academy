import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

/**
 * useFocusEffect re-subscribes whenever the callback identity changes, and an
 * inline arrow is a new function on every render. That turns the focus handler
 * into a render loop: it fires, sets state, re-renders, and re-subscribes until
 * React aborts with "maximum update depth exceeded". React's own
 * exhaustive-deps rule does not see it, because the hook is not in its list.
 */
const ROOTS = ["app", "src"]
const SOURCES = /\.(t|j)sx$/

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (entry === "node_modules" || entry.startsWith(".")) continue
    if (statSync(full).isDirectory()) walk(full, out)
    else if (SOURCES.test(entry)) out.push(full)
  }
  return out
}

const CALL = /useFocusEffect\s*\(/g

describe("useFocusEffect is given a stable callback", () => {
  const files = ROOTS.flatMap((r) => walk(r))
  const offenders: string[] = []

  for (const file of files) {
    const source = readFileSync(file, "utf8")
    for (const match of source.matchAll(CALL)) {
      // Skip to the argument: the wrapped form reads `useFocusEffect(\n useCallback(`.
      const after = source.slice(
        match.index + match[0].length,
        match.index + match[0].length + 40
      )
      if (/^\s*useCallback\s*\(/.test(after)) continue
      const line = source.slice(0, match.index).split("\n").length
      offenders.push(`${file}:${line}`)
    }
  }

  it("finds no useFocusEffect with an inline callback", () => {
    expect(offenders).toEqual([])
  })

  it("actually scans source files", () => {
    expect(files.length).toBeGreaterThan(20)
  })
})
