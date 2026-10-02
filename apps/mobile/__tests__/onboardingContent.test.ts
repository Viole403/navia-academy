import { describe, it, expect } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

/**
 * `data/json/<lang>/onboarding/introduction.json` — the contract the closing
 * onboarding step reads.
 *
 * CI only checks that a JSON file parses, so nothing else stops an entry from
 * naming a retired exam, losing one of the two glosses, or being filed under a
 * language it is not written in. Each of those is a blank card at the exact
 * moment the learner is deciding whether the course is worth starting, and the
 * card is allowed to render nothing when the entry is missing — so it would fail
 * silently on the device rather than loudly here.
 *
 * Lives in the mobile suite because that is where the TypeScript runner is; it
 * is the only package that tests, and this is content the mobile app reads.
 */

const LANGS = ["zh", "de", "en", "ja"] as const
const EXAMS = ["hsk", "tocfl", "goethe", "jlpt", "toefl"] as const

/** Mainland-only forms. A TOCFL learner reads Traditional, so these are defects there. */
const MAINLAND_ONLY = "词语听读写华灯笼径宝级"
/** Traditional-only forms. Same argument the other way for an HSK learner. */
const TRADITIONAL_ONLY = "詞語聽讀寫華燈籠徑寶級"

interface Intro {
  examType: string
  language: string
  title: string
  intro_id: string
  intro_en: string
  focus: { label: string; label_id: string; label_en: string }[]
}

function load(lang: string): Intro[] {
  const path = join(
    __dirname,
    "..",
    "..",
    "media",
    "data",
    "json",
    lang,
    "onboarding",
    "introduction.json"
  )
  return JSON.parse(readFileSync(path, "utf-8")) as Intro[]
}

const all = LANGS.map((l) => ({ lang: l, rows: load(l) }))

describe("onboarding introduction", () => {
  it("is a flat array for every language", () => {
    // combineJsonGroup concatenates arrays, so an object here publishes as
    // an object and the client finds nothing.
    for (const { lang, rows } of all) {
      expect(Array.isArray(rows), lang).toBe(true)
      expect(rows.length, lang).toBeGreaterThan(0)
    }
  })

  it("covers exactly the five exams, once each", () => {
    const seen = all.flatMap(({ rows }) => rows.map((r) => r.examType))
    expect([...seen].sort()).toEqual([...EXAMS].sort())
  })

  it("files each entry under the language it is written in", () => {
    for (const { lang, rows } of all) {
      for (const row of rows) expect(row.language, row.examType).toBe(lang)
    }
  })

  it("carries both reader glosses on every string it shows", () => {
    for (const { rows } of all) {
      for (const row of rows) {
        const where = `${row.language}/${row.examType}`
        expect(row.title.trim(), where).not.toBe("")
        expect(row.intro_id.trim(), where).not.toBe("")
        expect(row.intro_en.trim(), where).not.toBe("")
        expect(row.focus.length, where).toBeGreaterThan(0)
        for (const f of row.focus) {
          expect(f.label.trim(), where).not.toBe("")
          expect(f.label_id.trim(), where).not.toBe("")
          expect(f.label_en.trim(), where).not.toBe("")
        }
      }
    }
  })

  it("writes the two Chinese entries in the script their exam teaches", () => {
    // HSK teaches Simplified, TOCFL Traditional. Noto Serif SC and TC draw many
    // shared codepoints differently, so an entry in the wrong face is not a
    // style question — it is a different set of characters to learn.
    const zh = load("zh")
    const text = (r: Intro) =>
      [r.title, ...r.focus.map((f) => f.label)].join("")
    const hsk = zh.find((r) => r.examType === "hsk")
    const tocfl = zh.find((r) => r.examType === "tocfl")
    expect(hsk).toBeDefined()
    expect(tocfl).toBeDefined()
    expect(text(hsk!)).not.toMatch(new RegExp(`[${TRADITIONAL_ONLY}]`))
    expect(text(tocfl!)).not.toMatch(new RegExp(`[${MAINLAND_ONLY}]`))
  })

  it("publishes nothing Spanish", () => {
    // Spanish is forbidden in content and UI across the project.
    const spanish = /\b(el|la|los|las|una|uno|con|para|porque)\b/i
    for (const { rows } of all) {
      for (const row of rows) {
        for (const text of [row.intro_id, row.intro_en, row.title]) {
          expect(text, `${row.language}/${row.examType}`).not.toMatch(spanish)
        }
        for (const f of row.focus) {
          for (const text of [f.label, f.label_id, f.label_en]) {
            expect(text, `${row.language}/${row.examType}`).not.toMatch(spanish)
          }
        }
      }
    }
  })
})

describe("onboarding bundle path", () => {
  it("exists where the mobile client asks for it", () => {
    // The client resolves `<lang>/onboarding/index`; the publisher derives that
    // from LIST_GROUPS in apps/media/scripts/lib/content.ts. If either side is
    // renamed the card silently renders nothing.
    for (const lang of LANGS) {
      const dir = join(
        __dirname,
        "..",
        "..",
        "media",
        "data",
        "json",
        lang,
        "onboarding"
      )
      expect(existsSync(dir), lang).toBe(true)
    }
    const groups = readFileSync(
      join(__dirname, "..", "..", "media", "scripts", "lib", "content.ts"),
      "utf-8"
    )
    expect(groups).toMatch(/LIST_GROUPS[\s\S]{0,200}"onboarding"/)
  })
})
