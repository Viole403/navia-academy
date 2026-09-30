import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it, expect } from "vitest"

/**
 * A hook below a conditional `return` is a render-time crash, not a type error:
 * tsc is silent, and every test that does not mount the screen is silent too.
 *
 * The six screens under app/settings/ share one shape — fetch the settings,
 * render a loading state, return early — and one of them grew a `useState` for
 * its time-picker sheet *after* that return. It rendered four hooks while
 * loading and five afterwards, so React rejected it and the Reminders screen
 * never came up at all. The failure named no file and no line.
 *
 * The rule is pinned where the shape lives rather than app-wide: a general
 * "hook after a return" scan needs to know where a component ends, and guessing
 * that is how a guard starts crying wolf and gets deleted.
 *
 * The window stops at the next top-level declaration, because several of these
 * files declare a second component below the first (`AboutSection`,
 * `ThemeSwatch`) and its hooks are the first thing in *that* function, not a
 * stray one.
 */
const DIR = "app/settings"
const GUARD = /s\.isLoading/
const HOOK = /\buse[A-Z][A-Za-z0-9_]*\s*\(/
const TOP_LEVEL = /^\}|^((export )?(function|const|class)\s)/

describe("settings screens declare every hook above their loading return", () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".tsx"))
  const offenders: string[] = []

  for (const file of files) {
    const lines = readFileSync(join(DIR, file), "utf8").split("\n")
    const guard = lines.findIndex((l) => GUARD.test(l))
    if (guard === -1) continue
    for (let i = guard + 1; i < lines.length; i++) {
      if (TOP_LEVEL.test(lines[i])) break
      if (HOOK.test(lines[i])) offenders.push(`${DIR}/${file}:${i + 1}`)
    }
  }

  it("finds no hook below a loading early-return", () => {
    expect(offenders).toEqual([])
  })

  it("actually scans the settings screens", () => {
    // A scan that silently read nothing would pass the test above forever.
    expect(files.length).toBeGreaterThanOrEqual(5)
    expect(files).toContain("reminders.tsx")
  })
})
