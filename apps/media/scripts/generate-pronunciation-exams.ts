import { readFile, writeFile, mkdir } from "node:fs/promises"
import { readdir } from "node:fs/promises"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

/**
 * Pronunciation exercises, generated from the published vocabulary.
 *
 * Every item that carries a headword, a pinyin reading and a zhuyin reading is
 * already a pronunciation question — the answer is in the content. Nothing here
 * is authored, and nothing can drift from the vocabulary because it is derived
 * from it. 7,584 Mandarin items qualify, against the 44 hand-written exercises
 * the whole exam bank held.
 *
 * The question asks which reading belongs to the character, with the other
 * options drawn from the same level so the distractor is a real confusion rather
 * than an obviously wrong string. It is deliberately not a recording exercise:
 * nothing can score a recording yet, and a question type no client can render is
 * a question type nobody sees. This one renders through the existing
 * multiple-choice path, so it works on both clients today, and the audio for
 * each character already exists in the manifest.
 *
 * Selection is seeded from the item id, so the same content always produces the
 * same questions — a content pipeline that reshuffles on every run would churn
 * the published bundles for no reason.
 */

/** Questions per HSK level. Enough to sit an exam section, small enough to review. */
const PER_LEVEL = 24
const OPTIONS = 4

const __filename = fileURLToPath(import.meta.url)
const ROOT = join(dirname(__filename), "..")
const VOCAB_DIR = join(ROOT, "data", "json", "zh", "vocabulary")
const OUT_DIR = join(ROOT, "data", "json", "zh", "assessments", "hsk")

interface VocabItem {
  id?: string
  hanzi?: string
  text?: string
  pinyin?: string
  zhuyin?: string
  translation?: string
  level?: number
  hsk?: number
  examMappings?: Record<string, string>
}

interface Exercise {
  id: string
  type: "multiple-choice"
  prompt: string
  options: { id: string; label: string }[]
  correct: string
  skill: "pronunciation"
  target: string
  pinyin: string
  zhuyin: string
  audioText: string
  explanation: string
}

/**
 * FNV-1a over the item id. Small, stable across runs and platforms, and good
 * enough to shuffle by — this is picking a sample, not generating keys.
 */
function seedOf(id: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

/** Sort by a seeded key, so the sample depends on the id and nothing else. */
function seededOrder<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const d = seedOf(a.id) - seedOf(b.id)
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

/** A pronunciation question needs all three readings present. */
function isEligible(w: VocabItem): w is VocabItem & { id: string } {
  const head = w.hanzi ?? w.text
  return Boolean(w.id && head && w.pinyin && w.zhuyin)
}

/**
 * Distractors come from the same level and must not share the answer's pinyin.
 * Two characters that read alike are the confusion worth drilling, so the pool
 * is filtered rather than sampled blind.
 */
function buildExercise(
  item: VocabItem & { id: string },
  pool: (VocabItem & { id: string })[],
  index: number,
  level: number
): Exercise | null {
  const head = item.hanzi ?? item.text ?? ""
  const answer = item.pinyin as string

  const candidates = pool.filter((p) => p.id !== item.id && p.pinyin !== answer)
  if (candidates.length < OPTIONS - 1) return null

  // Take the first few from the seeded order rather than a random draw, so the
  // option set is as reproducible as the selection was.
  const picks = seededOrder(candidates).slice(0, OPTIONS - 1)

  const labels = [answer, ...picks.map((p) => p.pinyin as string)]
  // Deterministic rotation so the answer is not always first.
  const shift = seedOf(item.id) % labels.length
  const rotated = [...labels.slice(shift), ...labels.slice(0, shift)]

  const optIds = rotated.map((_, i) => `o${i}`)
  const correctIndex = rotated.indexOf(answer)

  return {
    id: `ap${level}-${index}`,
    type: "multiple-choice",
    prompt: `How is «${head}» read?`,
    options: optIds.map((id, i) => ({ id, label: rotated[i] })),
    correct: optIds[correctIndex],
    skill: "pronunciation",
    target: head,
    pinyin: answer,
    zhuyin: item.zhuyin as string,
    audioText: head,
    explanation: `${head} — ${answer} (${item.zhuyin})${
      item.translation ? ` · ${item.translation}` : ""
    }`,
  }
}

async function main() {
  const vocab = await collectJson(VOCAB_DIR)
  const eligible = vocab.filter(isEligible)

  const byLevel = new Map<number, (VocabItem & { id: string })[]>()
  for (const w of eligible) {
    const level = w.level ?? w.hsk
    if (!level) continue
    const list = byLevel.get(level) ?? []
    list.push(w)
    byLevel.set(level, list)
  }

  console.log(
    `vocabulary items: ${vocab.length} · pronunciation-ready: ${eligible.length}`
  )

  const levels = [...byLevel.keys()].sort((a, b) => a - b)
  let written = 0

  for (const level of levels) {
    const pool = byLevel.get(level) as (VocabItem & { id: string })[]
    const chosen = seededOrder(pool).slice(0, PER_LEVEL)

    const exercises: Exercise[] = []
    for (const [i, item] of chosen.entries()) {
      const ex = buildExercise(item, pool, i + 1, level)
      if (ex) exercises.push(ex)
    }
    if (exercises.length === 0) continue

    const doc = [
      {
        id: `a-pron-hsk${level}`,
        title: `Pronunciation · HSK ${level}`,
        description: `Match each character to its reading. ${exercises.length} questions.`,
        description_en: `Match each character to its reading. ${exercises.length} questions.`,
        kind: "vocabulary",
        level: String(level),
        examMappings: { hsk: String(level) },
        durationMin: Math.max(5, Math.round(exercises.length * 0.5)),
        passScore: 70,
        exercises,
      },
    ]

    const outFile = join(OUT_DIR, `pronunciation-hsk${level}.json`)
    await mkdir(dirname(outFile), { recursive: true })
    await writeFile(outFile, JSON.stringify(doc, null, 2) + "\n", "utf-8")
    written += exercises.length
    console.log(
      `  HSK ${level}: ${exercises.length} questions from ${pool.length} eligible items`
    )
  }

  console.log(
    `\n✓ ${written} pronunciation questions across ${levels.length} levels`
  )
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
