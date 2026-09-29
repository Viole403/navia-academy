import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { languageForExam, scriptForExam } from "@/lib/languages"

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((e) => {
    const p = join(dir, e)
    if (e === "node_modules" || e === "__tests__") return []
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".tsx") ? [p] : []
  })
}

/** A screen that picks an exam must move both copies, or the tabs disagree. */
describe("exam type is stored in two places", () => {
  it("every screen that writes active_exam_type also writes the onboarding store", () => {
    const offenders: string[] = []
    for (const f of walk("app")) {
      const s = readFileSync(f, "utf8")
      if (!s.includes("active_exam_type")) continue
      // Reading the value to display it is not a write.
      const writes =
        /(\.set\(\s*\{[^}]*active_exam_type|updateSettingsM\.mutate\(\s*\{[^}]*active_exam_type|settings\.update\(\s*\{[^}]*active_exam_type)/
      if (!writes.test(s)) continue
      // A call site, not the identifier: the destructure line alone is not a write.
      if (!/\bset(Exam|StoredExam)Type\(/.test(s)) offenders.push(f)
    }
    expect(offenders).toEqual([])
  })

  it("maps each exam to one language", () => {
    expect(languageForExam("hsk")).toBe("zh")
    expect(languageForExam("tocfl")).toBe("zh")
    expect(languageForExam("goethe")).toBe("de")
    expect(languageForExam("jlpt")).toBe("ja")
    expect(languageForExam("toefl")).toBe("en")
  })

  it("gives a script only to the two Chinese tracks", () => {
    expect(scriptForExam("hsk")).toBe("simplified")
    expect(scriptForExam("tocfl")).toBe("traditional")
    expect(scriptForExam("goethe")).toBeNull()
    expect(scriptForExam("jlpt")).toBeNull()
    expect(scriptForExam("toefl")).toBeNull()
  })
})
