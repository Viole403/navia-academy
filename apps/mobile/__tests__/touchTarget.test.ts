import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, it, expect } from "vitest"

/**
 * The back affordance is one component, and this keeps it that way.
 *
 * The app had four back affordances and three were wrong in ways no tool
 * reported. `DetailShell` — the frame for every pushed detail screen — carried a
 * raw "←" in a Text: about 12 by 18dp, no accessibility role, no label, so
 * TalkBack announced a bare arrow. `reading.tsx` was a third copy of the same
 * thing. `apply.tsx` was a fourth, and its `router.back()` was unguarded, which
 * is inert on a cold deep link — the exact failure DetailShell's own doc comment
 * warns about, three files away.
 *
 * The first attempt at this guard asserted that every Pressable in the app
 * declared a 44dp frame and an accessibility label, and it failed on twenty
 * screens at once, most of them legitimately: a text button is named by its own
 * text, and Pressable already carries an implicit button role. A guard that cries
 * wolf on day one gets deleted by Friday, so this one asserts only the three
 * things that are actually true and actually broke.
 */
const ROOTS = ["app", "src"]
const SOURCES = /\.tsx?$/
const BACK_LINK = "src/components/ui/BackLink.tsx"
const GUARDED_BACK = "src/hooks/useGuardedBack.ts"

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (entry === "node_modules" || entry.startsWith(".")) continue
    if (statSync(full).isDirectory()) walk(full, out)
    else if (SOURCES.test(entry)) out.push(full)
  }
  return out
}

/** Comments explain these arrows; only rendered code counts. */
function code(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/^\s*\*.*$/gm, "")
}

const files = ROOTS.flatMap((r) => walk(r))
const read = (f: string) => code(readFileSync(f, "utf8"))

describe("the back affordance is one component with one target", () => {
  it("draws no arrow as a typed glyph", () => {
    // .tsx only: a "←" in a .ts file cannot be a rendered affordance, since
    // there is no JSX there. That is what separates this from the axios debug
    // line in src/api/client.ts, which is a log and not a control.
    const typed: string[] = []
    for (const f of files.filter((f) => f.endsWith(".tsx"))) {
      read(f)
        .split("\n")
        .forEach((line, i) => {
          if (/[←‹]/.test(line)) typed.push(`${f}:${i + 1}`)
        })
    }
    expect(typed).toEqual([])
  })

  it("keeps the canGoBack guard in useGuardedBack alone", () => {
    // Six screens had each written their own copy of these four lines, and
    // three of the six were never called — duplication that nobody was
    // following. Now the rule has exactly one home, so a second copy is a bug
    // rather than a matter of taste.
    const elsewhere = files
      .filter((f) => f !== GUARDED_BACK && /\bcanGoBack\b/.test(read(f)))
      .sort()
    expect(elsewhere).toEqual([])
  })

  it("gives BackLink a 44dp frame rather than hitSlop", () => {
    const source = read(BACK_LINK)
    expect(source).toMatch(/minHeight:\s*44/)
    // hitSlop widens native hit-testing but not the accessibility node, so a
    // screen-reader user was handed the unpadded 18dp box a sighted finger
    // never got.
    expect(source).not.toMatch(/hitSlop/)
  })

  it("actually scans the app", () => {
    // A scan that silently read nothing would pass the tests above forever.
    expect(files.length).toBeGreaterThan(50)
    expect(files).toContain(BACK_LINK)
    expect(files).toContain(GUARDED_BACK)
  })
})
