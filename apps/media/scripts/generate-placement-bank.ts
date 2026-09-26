import { readFile, writeFile } from "node:fs/promises"
import { readdir } from "node:fs/promises"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

/**
 * Placement questions, generated from the published vocabulary.
 *
 * The hand-written bank was twenty-four questions for Mandarin and twenty for
 * everything else, spread across six bands — which means the upper bands were
 * decided by two or three questions apiece. A placement test decides where a
 * learner starts, so it is the one screen where being two questions short is
 * felt rather than noticed.
 *
 * This tops each band up to a target from the vocabulary at that level, asking
 * for a meaning and drawing the distractors from the same band, so a wrong
 * answer means the band was misjudged rather than that one option was odd.
 *
 * Existing questions are kept. The file is written as whatever is already there
 * plus the generated ones, and the generated ones carry a `gen-` id, so
 * re-running is idempotent and a hand-written question is never replaced.
 *
 * English is deliberately skipped. Its published vocabulary is thirty items and
 * all of them sit at level 1, so there is nothing above band 1 to draw from —
 * a bank generated from it would measure the same thing six times and report it
 * as a graded result. That gap is in the content, not in this script.
 */

const PER_BAND = 12
const OPTIONS = 4
const GEN_PREFIX = "gen-"

/** Languages whose vocabulary actually spans the bands a placement needs. */
const LANGUAGES = ["zh", "ja", "de"] as const

const __filename = fileURLToPath(import.meta.url)
const ROOT = join(dirname(__filename), "..")

interface VocabItem {
  id?: string
  hanzi?: string
  text?: string
  translation?: string
  level?: number
  hsk?: number
  examMappings?: Record<string, string | number>
}

interface PlacementQuestion {
  id: string
  band: number
  type: string
  prompt: string
  options: { id: string; label: string }[]
  correct: string
  skill?: string
  hsk?: number
  language?: string
  [k: string]: unknown
}

function hashId(id: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

function seededOrder<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const d = hashId(a.id) - hashId(b.id)
    return d !== 0 ? d : a.id.localeCompare(b.id)
  })
}

async function collectJson(dir: string): Promise<VocabItem[]> {
  const out: VocabItem[] = []
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      out.push(...(await collectJson(full)))
    } else if (e.name.endsWith(".json")) {
      const parsed = JSON.parse(await readFile(full, "utf-8")) as unknown
      if (Array.isArray(parsed)) out.push(...(parsed as VocabItem[]))
    }
  }
  return out
}

/** A vocabulary item that can carry a meaning question. */
interface Seedable {
  id: string
  head: string
  translation: string
  level: number
}

/**
 * Normalises a raw item into the shape the question builder needs, or returns
 * null when it cannot be used.
 *
 * This maps rather than type-guards on purpose: an earlier version of this
 * script asserted a `head` property it had only computed into a local, and
 * every generated prompt came out as "What does undefined mean?" — a type
 * predicate is a promise, and `tsc` cannot check whether it was kept.
 */
function toSeedable(w: VocabItem): Seedable | null {
  const head = w.hanzi ?? w.text
  const translation = w.translation
  const level = w.level ?? w.hsk
  if (!w.id || !head || !translation || !level) return null
  return { id: w.id, head, translation, level }
}

async function main() {
  for (const lang of LANGUAGES) {
    const vocab = await collectJson(
      join(ROOT, "data", "json", lang, "vocabulary")
    )
    const eligible = vocab
      .map(toSeedable)
      .filter((w): w is Seedable => w !== null)
    if (eligible.length === 0) {
      console.log(`\n${lang}: no usable vocabulary — skipped`)
      continue
    }

    const byBand = new Map<number, Seedable[]>()
    for (const w of eligible) {
      const list = byBand.get(w.level) ?? []
      list.push(w)
      byBand.set(w.level, list)
    }
    const bands = [...byBand.keys()].sort((a, b) => a - b)

    const file = join(ROOT, "data", "json", lang, "placement.json")
    const existing = JSON.parse(
      await readFile(file, "utf-8")
    ) as unknown as PlacementQuestion[]
    const handWritten = existing.filter((q) => !q.id.startsWith(GEN_PREFIX))
    const stale = existing.filter((q) => q.id.startsWith(GEN_PREFIX))

    const perBandNow = new Map<number, number>()
    for (const q of handWritten) {
      perBandNow.set(q.band, (perBandNow.get(q.band) ?? 0) + 1)
    }

    const generated: PlacementQuestion[] = []
    for (const band of bands) {
      const have = perBandNow.get(band) ?? 0
      const need = PER_BAND - have
      if (need <= 0) continue

      const pool = byBand.get(band) as Seedable[]
      const chosen = seededOrder(pool).slice(0, need)

      for (const [i, item] of chosen.entries()) {
        const distractors = seededOrder(
          pool.filter(
            (p) => p.id !== item.id && p.translation !== item.translation
          )
        )
          .slice(0, OPTIONS - 1)
          .map((p) => p.translation)
        if (distractors.length < OPTIONS - 1) continue

        const labels = [item.translation, ...distractors]
        const shift = hashId(item.id) % labels.length
        const rotated = [...labels.slice(shift), ...labels.slice(0, shift)]
        const optIds = rotated.map((_, k) => `o${k}`)
        const correctIndex = rotated.indexOf(item.translation)

        generated.push({
          id: `${GEN_PREFIX}${lang}-${band}-${i + 1}`,
          band,
          type: "multiple-choice",
          prompt: `What does «${item.head}» mean?`,
          options: optIds.map((id, k) => ({ id, label: rotated[k] })),
          correct: optIds[correctIndex],
          skill: "vocabulary",
          language: lang,
        })
      }
    }

    const merged = [...handWritten, ...generated]
    await writeFile(file, JSON.stringify(merged, null, 2) + "\n", "utf-8")

    const dist: string[] = []
    for (const band of bands) {
      const n = merged.filter((q) => q.band === band).length
      dist.push(`${band}:${n}`)
    }
    console.log(
      `\n${lang}: ${handWritten.length} hand-written (${stale.length} stale generated dropped)` +
        ` + ${generated.length} generated = ${merged.length}` +
        `\n  per band — ${dist.join("  ")}`
    )
  }
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
