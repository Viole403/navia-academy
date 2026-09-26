/**
 * Reading-comprehension banks from the Belebele benchmark.
 *
 * Belebele (Meta) is 900 four-option reading questions per language variant,
 * 488 distinct passages, with answer keys. It is the only source found that is
 * licensed for commercial reuse *and* already shaped like graded
 * multiple-choice reading. The passages come from FLORES-200, itself CC-BY-SA,
 * so the licence chain is clean end to end.
 *
 * What this does not do is pretend Belebele is levelled. It is a benchmark, and
 * Meta describes it as a test set that is meant to be hard — there is no CEFR,
 * JLPT or HSK label anywhere in it. The only signal available is how long the
 * passage is, which correlates with difficulty loosely and is used here purely
 * to spread the questions across an exam's upper levels. That is a length proxy,
 * not a proficiency judgement, and the files say so. Anything below the middle
 * tier of each exam still has no comprehension material, and that gap cannot be
 * closed by borrowing a benchmark.
 *
 * Licence: CC-BY-SA 4.0. Share-alike means an adapted passage has to be
 * published under the same licence, so every exercise carries a source line and
 * `CREDITS.md` records the obligation. The NC-licensed assembled training set in
 * the same repository is not touched — only the main dataset is read.
 *
 * Deterministic: tiers come from percentile cut-offs on passage length, not from
 * a shuffle, so re-running produces identical files.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..")
const JSON_DIR = join(ROOT, "data", "json")
const CACHE = join(ROOT, "..", "..", "tmp", "belebele-cache")

const SOURCE_URL =
  "https://huggingface.co/datasets/facebook/belebele/resolve/main/data"
const CREDIT = "Belebele (Meta AI) · CC-BY-SA 4.0 · via FLORES-200 / Wikivoyage"

interface BelebeleRow {
  link: string
  question_number: number
  flores_passage: string
  question: string
  mc_answer1: string
  mc_answer2: string
  mc_answer3: string
  mc_answer4: string
  correct_answer_num: number
}

/** One learning language to one Belebele variant and one exam. */
const LANGS = [
  { lang: "zh", variant: "zho_Hans", exam: "hsk", tiers: ["5", "6", "7"] },
  {
    lang: "de",
    variant: "deu_Latn",
    exam: "goethe",
    tiers: ["B1", "B2", "C1"],
  },
  { lang: "ja", variant: "jpn_Jpan", exam: "jlpt", tiers: ["N3", "N2", "N1"] },
  { lang: "en", variant: "eng_Latn", exam: "toefl", tiers: ["2", "3", "4"] },
] as const

/**
 * Percentiles at which the three tiers divide, on passage length.
 *
 * Measured from the data rather than guessed, and expressed as character counts
 * so they mean the same thing in languages that do not separate words with
 * spaces. Roughly a third of the questions land in each tier.
 */
const CUTS: Record<string, [number, number]> = {
  zho_Hans: [125, 175],
  jpn_Jpan: [165, 225],
  deu_Latn: [430, 600],
  eng_Latn: [390, 530],
}

function readRows(variant: string): BelebeleRow[] {
  const path = join(CACHE, `${variant}.jsonl`)
  const raw = readFileSync(path, "utf8")
  return raw
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as BelebeleRow)
}

function tierOf(length: number, cuts: [number, number]): 0 | 1 | 2 {
  if (length < cuts[0]) return 0
  if (length < cuts[1]) return 1
  return 2
}

for (const { lang, variant, exam, tiers } of LANGS) {
  const rows = readRows(variant)
  const cuts = CUTS[variant]
  const buckets: BelebeleRow[][] = [[], [], []]
  for (const r of rows) buckets[tierOf(r.flores_passage.length, cuts)].push(r)

  for (let t = 0; t < 3; t++) {
    const level = tiers[t]
    const out = join(
      JSON_DIR,
      lang,
      "assessments",
      exam,
      `comprehension-${String(level).toLowerCase()}.json`
    )
    const bank = {
      id: `comprehension-${exam}-${String(level).toLowerCase()}`,
      title: `Reading comprehension · ${level}`,
      description: `Belebele-derived reading questions, placed at ${level} by passage length.`,
      description_en: `Belebele-derived reading questions, placed at ${level} by passage length.`,
      kind: "reading",
      level: String(level),
      examMappings: { [exam]: String(level) },
      durationMin: Math.max(5, Math.round(buckets[t].length * 0.75)),
      passScore: 60,
      exercises: buckets[t].map((r, i) => {
        const answers = [r.mc_answer1, r.mc_answer2, r.mc_answer3, r.mc_answer4]
        const idx = r.correct_answer_num - 1
        if (idx < 0 || idx > 3) {
          throw new Error(
            `${lang} ${level} row ${i}: correct_answer_num out of range`
          )
        }
        return {
          id: `rc${String(level).toLowerCase()}-${String(i + 1).padStart(4, "0")}`,
          type: "multiple-choice",
          prompt: r.question,
          passage: r.flores_passage,
          passageSource: `${CREDIT} · ${r.link}`,
          options: answers.map((label, oi) => ({ id: `o${oi}`, label })),
          correct: `o${idx}`,
          skill: "reading",
          explanation: answers[idx],
        }
      }),
    }
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, JSON.stringify(bank, null, 2) + "\n")
    console.log(
      `  ${lang}/${exam} ${String(level).padEnd(3)} → ${String(bank.exercises.length).padStart(3)} soal`
    )
  }
}

console.log(
  "\n  Banding by passage length only — a proxy, not a validated level."
)
console.log(`  Source: ${SOURCE_URL}`)
console.log(
  `  Licence: CC-BY-SA 4.0 (main dataset only, not the NC training set)`
)
