import { readFile, writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"
import {
  parseApkg,
  normalizeNote,
  type AnkiFieldMap,
  type AnkiSource,
  type NormalizedNote,
} from "../src/lib/anki"

/**
 * Import Anki .apkg decks into a normalized shape.
 *
 * Usage:
 *   npm run import-anki -- path/to/deck.apkg                 # parse one file
 *   npm run import-anki -- path/to/deck.apkg --fields hanzi=0,pinyin=1,translation=2 --dump out.json
 *   npm run import-anki -- --source <id>                     # import one configured source (data/anki-sources.json)
 *   npm run import-anki -- --all                             # import all configured sources
 *
 * Karena format tiap deck berbeda, tentukan pemetaan kolom lewat `--fields`
 * atau di `apps/media/data/anki-sources.json` (field `fields` per sumber).
 */

const ROOT = join(__dirname, "..")
const SOURCES_PATH = join(ROOT, "data", "anki-sources.json")

function parseFieldMap(arg?: string): AnkiFieldMap | null {
  if (!arg) return null
  const map: AnkiFieldMap = { hanzi: -1 }
  for (const part of arg.split(",")) {
    const [k, v] = part.split("=")
    const i = Number(v)
    if (!k || Number.isNaN(i))
      throw new Error(`invalid field map part: ${part}`)
    if (k === "hanzi") map.hanzi = i
    else if (k === "pinyin") map.pinyin = i
    else if (k === "translation") map.translation = i
    else if (k === "zhuyin") map.zhuyin = i
    else {
      map.extras ??= {}
      map.extras[k] = i
    }
  }
  if (map.hanzi < 0) throw new Error("field map requires hanzi=<index>")
  return map
}

async function loadSources(): Promise<AnkiSource[]> {
  try {
    return JSON.parse(await readFile(SOURCES_PATH, "utf-8")) as AnkiSource[]
  } catch {
    return []
  }
}

async function fetchSourceBuffer(src: AnkiSource): Promise<Buffer> {
  if (src.url) {
    const res = await fetch(src.url)
    if (!res.ok) throw new Error(`download ${src.url} → HTTP ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
  }
  if (src.file) {
    return readFile(join(ROOT, src.file))
  }
  throw new Error(`source "${src.id}" needs a url or file`)
}

function reportSource(
  src: AnkiSource,
  decks: Awaited<ReturnType<typeof parseApkg>>,
  map: AnkiFieldMap,
  matched: NormalizedNote[]
) {
  console.log(`\n[${src.id}] ${src.name} (${src.target ?? "?"})`)
  console.log(
    `  decks: ${decks.map((d) => `${d.name}(${d.notes.length})`).join(", ") || "—"}`
  )
  console.log(`  normalized notes: ${matched.length}`)
  const sample = matched.find((n) => n.hanzi)
  if (sample)
    console.log(
      `  sample: ${sample.hanzi} | ${sample.pinyin ?? "?"} | ${sample.translation ?? "?"} | ${sample.zhuyin ?? "?"}`
    )
}

async function importSource(src: AnkiSource) {
  const buffer = await fetchSourceBuffer(src)
  const decks = await parseApkg(buffer)
  const map = src.fields
  const notes = decks.flatMap((d) => d.notes)
  const matched = notes
    .map((n) => normalizeNote(n, map))
    .filter((n): n is NonNullable<typeof n> => !!n)
  reportSource(src, decks, map, matched)
  return { src, decks, matched }
}

async function main() {
  const args = process.argv.slice(2)
  const sourceIdIdx = args.indexOf("--source")
  const allFlag = args.includes("--all")
  const dumpIdx = args.indexOf("--dump")
  const fieldsIdx = args.indexOf("--fields")
  const dumpPath = dumpIdx > -1 ? args[dumpIdx + 1] : undefined
  const fieldMapArg = fieldsIdx > -1 ? args[fieldsIdx + 1] : undefined

  const sources = await loadSources()

  if (sourceIdIdx > -1) {
    const id = args[sourceIdIdx + 1]
    const src = sources.find((s) => s.id === id)
    if (!src) {
      console.error(`Source "${id}" not found in ${SOURCES_PATH}`)
      console.error(
        "Available:",
        sources.map((s) => s.id).join(", ") || "(none)"
      )
      process.exit(1)
    }
    const { matched } = await importSource(src)
    if (dumpPath) {
      const out = join(ROOT, dumpPath)
      await mkdir(join(out, ".."), { recursive: true })
      await writeFile(out, JSON.stringify(matched, null, 2), "utf-8")
      console.log(`Dumped ${matched.length} normalized notes → ${out}`)
    }
    return
  }

  if (allFlag) {
    for (const src of sources) {
      const { matched } = await importSource(src)
      if (dumpPath) {
        const out = join(ROOT, dumpPath, `${src.id}.json`)
        await mkdir(join(out, ".."), { recursive: true })
        await writeFile(out, JSON.stringify(matched, null, 2), "utf-8")
        console.log(`Dumped → ${out}`)
      }
    }
    return
  }

  // Direct file import
  const file = args.find((a) => !a.startsWith("--"))
  if (!file) {
    console.error(
      "Usage: import-anki <file.apkg> [--fields hanzi=0,...] [--dump out.json] | --source <id> | --all"
    )
    process.exit(1)
  }
  const buffer = await readFile(file)
  const decks = await parseApkg(buffer)
  const map = parseFieldMap(fieldMapArg) ?? { hanzi: 0 }
  const matched = decks
    .flatMap((d) => d.notes)
    .map((n) => normalizeNote(n, map))
    .filter((n): n is NonNullable<typeof n> => !!n)
  console.log(
    `Decks: ${decks.map((d) => `${d.name}(${d.notes.length})`).join(", ")}`
  )
  console.log(
    `Normalized notes (field map ${JSON.stringify(map)}): ${matched.length}`
  )
  if (matched[0])
    console.log(
      `sample: ${matched[0].hanzi} | ${matched[0].pinyin ?? "?"} | ${matched[0].translation ?? "?"} | ${matched[0].zhuyin ?? "?"}`
    )
  if (dumpPath) {
    const out = join(ROOT, dumpPath)
    await mkdir(join(out, ".."), { recursive: true })
    await writeFile(out, JSON.stringify(matched, null, 2), "utf-8")
    console.log(`Dumped → ${out}`)
  }
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
