import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

/**
 * This shipped a bug that read as "the session is lost on every restart".
 *
 * Onboarding finished by setting hasCompleted on the onboarding store. The
 * launch gate checked hasOnboarded on a second, separate store. Nothing called
 * its setter, so the gate could never be satisfied: completing onboarding wrote
 * a flag nobody read, and every cold start bounced back to step one. Split
 * state is invisible to the type checker and to every test that exercises one
 * side of it, so the contract is asserted here instead.
 */
const ROOTS = ["app", "src"]
const SOURCES = /\.tsx?$/
const STORE = /src\/store\/[a-zA-Z]+\.ts$/

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (entry === "node_modules" || entry.startsWith(".")) continue
    if (statSync(full).isDirectory()) walk(full, out)
    else if (SOURCES.test(entry)) out.push(full)
  }
  return out
}

const sources = ROOTS.flatMap((r) => walk(r)).map((file) => ({
  file,
  source: readFileSync(file, "utf8"),
}))

// Only the boolean fields of the store's own state interface qualify. A flag is
// something persisted state can be true or false about, not a helper or a count.
function declaredFlags(source: string): string[] {
  const match = /interface\s+\w+\s*\{([\s\S]*?)\n\}/.exec(source)
  if (!match) return []
  return [...match[1].matchAll(/^ {2}([a-zA-Z]\w*)\??:[ \t]*boolean/gm)].map(
    (m) => m[1]
  )
}

interface Flag {
  name: string
  declaredIn: string
  written: string[]
  read: string[]
}

const flags: Flag[] = sources
  .filter(({ file }) => STORE.test(file))
  .flatMap(({ file, source }) =>
    declaredFlags(source).map((name): Flag => ({
      name,
      declaredIn: file,
      written: [],
      read: [],
    }))
  )

for (const flag of flags) {
  for (const { file, source } of sources) {
    // A setter writes it: `complete: () => set({ hasCompleted: true })`. The
    // setters live in the store's own file, so this search includes it.
    const writes = new RegExp(
      `set\\(\\{[^}]*\\b${flag.name}\\b[^}]*\\}\\)`,
      "s"
    ).test(source)
    if (writes) {
      flag.written.push(file)
      continue
    }
    // The interface declaration is not a read, so only other files count.
    if (
      file !== flag.declaredIn &&
      new RegExp(`\\b${flag.name}\\b`).test(source)
    ) {
      flag.read.push(file)
    }
  }
}

describe("no store flag is orphaned", () => {
  it("actually finds the persisted boolean flags", () => {
    expect(flags.map((f) => f.name)).toContain("hasCompleted")
  })

  it("every flag is written outside its own store", () => {
    // A flag nothing writes is a gate that can never open.
    const unwritten = flags
      .filter((f) => f.written.length === 0)
      .map((f) => f.name)
    expect(unwritten).toEqual([])
  })

  it("every flag is read somewhere", () => {
    // A flag nothing reads is a write the product can never act on.
    const unread = flags.filter((f) => f.read.length === 0).map((f) => f.name)
    expect(unread).toEqual([])
  })
})
