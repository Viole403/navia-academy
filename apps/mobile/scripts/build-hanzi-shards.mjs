#!/usr/bin/env node
/**
 * Build stroke-order shards for the Chinese character set Navia actually
 * teaches.
 *
 * Two decisions are worth stating up front, both forced by this repo's content:
 *
 *  - The character inventory is **derived from our own content** under
 *    `apps/media/data/json/zh/**` rather than from a hand-curated list, so the
 *    shards cover exactly the characters the vocabulary, characters, readings,
 *    conversations and curriculum bundles can put in front of a learner.
 *  - Output is **shards, not one JSON**. Metro inlines an imported .json into
 *    the module graph; a single multi-megabyte dataset became the majority of
 *    the Hermes bundle and every launch paid to construct thousands of nested
 *    [x,y] arrays before one character was drawn. Shards are plain files read on
 *    demand (see src/lib/hanziStrokeData.ts) and keep stroke order offline.
 *
 * Deterministic and idempotent: rerun after any content change.
 *
 *   node scripts/build-hanzi-shards.mjs
 */
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises"
import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const MOBILE_ROOT = join(__dirname, "..")
const MONOREPO = join(MOBILE_ROOT, "..", "..")
const JSON_ROOT = join(MONOREPO, "apps", "media", "data", "json")

/**
 * Languages whose content can put a Han character in front of a learner.
 *
 * Chinese is obvious. Japanese is not, and leaving it out is a silent hole:
 * Japanese is written with kanji, and this app teaches 8,355 Japanese words
 * across 2,091 distinct kanji — every one of them renders, and not one of them
 * would have had stroke data, so writing practice would simply never appear on a
 * Japanese word. Kana carry no stroke order, which is correct and is why the
 * scanner filters to ideographs rather than to "characters".
 */
const HAN_LANGUAGES = ["zh", "ja"]
const OUT_DIR = join(MOBILE_ROOT, "assets", "hanzi")
const SHARD_COUNT = 64

/** Han ideograph blocks only — punctuation and latin never get stroke data. */
function isHanzi(ch) {
  const cp = ch.codePointAt(0)
  return (
    (cp >= 0x3400 && cp <= 0x4dbf) || // CJK ext A
    (cp >= 0x4e00 && cp <= 0x9fff) || // CJK unified
    (cp >= 0xf900 && cp <= 0xfaff) || // compatibility
    (cp >= 0x20000 && cp <= 0x2a6df) // ext B
  )
}

async function walk(dir) {
  const out = []
  if (!existsSync(dir)) return out
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(p)))
    else if (entry.name.endsWith(".json") && !entry.name.startsWith("."))
      out.push(p)
  }
  return out
}

/** Every Han character that can reach a learner's screen. */
async function collectCharacters() {
  const chars = new Set()
  const files = (await Promise.all(
    HAN_LANGUAGES.map((lang) => walk(join(JSON_ROOT, lang)))
  )).flat()
  let traditionalPairs = 0

  for (const file of files) {
    if (file.includes(`${"placement"}`)) continue
    let text
    try {
      text = await readFile(file, "utf8")
    } catch {
      continue
    }
    // Scanning the raw JSON is both faster and more complete than walking the
    // parsed tree: it catches ideographs in fields we don't model (examples,
    // dialogue turns, lesson bodies) as well as ones we do.
    for (const ch of text) if (isHanzi(ch)) chars.add(ch)
    if (text.includes("traditional")) traditionalPairs++
  }

  return {
    chars: [...chars].sort(),
    scannedFiles: files.length,
    traditionalPairs,
  }
}

async function main() {
  console.log(`Collecting characters from ${HAN_LANGUAGES.join(" + ")} content…`)
  const { chars, scannedFiles } = await collectCharacters()
  console.log(`  ${scannedFiles} content files → ${chars.length} unique hanzi`)

  // hanzi-writer-data ships one JSON per codepoint at the package root.
  const strokesDir = dirname(require.resolve("hanzi-writer-data/package.json"))
  if (!existsSync(strokesDir)) {
    console.error(`hanzi-writer-data/data not found at ${strokesDir}`)
    process.exit(1)
  }

  const shards = Array.from({ length: SHARD_COUNT }, () => ({}))
  let covered = 0
  let missing = 0
  const missingSample = []

  for (const ch of chars) {
    const cp = ch.codePointAt(0)
    // hanzi-writer-data names each file after the character itself.
    const file = join(strokesDir, `${ch}.json`)
    if (!existsSync(file)) {
      missing++
      if (missingSample.length < 20) missingSample.push(ch)
      continue
    }
    const data = JSON.parse(await readFile(file, "utf8"))
    shards[cp % SHARD_COUNT][ch] = data
    covered++
  }

  await mkdir(OUT_DIR, { recursive: true })
  let totalBytes = 0
  for (let i = 0; i < SHARD_COUNT; i++) {
    const body = JSON.stringify(shards[i])
    totalBytes += body.length
    await writeFile(
      join(OUT_DIR, `shard-${String(i).padStart(2, "0")}.json`),
      body
    )
  }

  // Static requires — Metro resolves these at build time; a computed require
  // path resolves to nothing. They are relative because this file sits next to
  // the shards it names, and a path alias inside require() only works when a
  // babel module-resolver happens to be configured.
  const requires = Array.from(
    { length: SHARD_COUNT },
    (_, i) => `  () => require("./shard-${String(i).padStart(2, "0")}.json"),`
  ).join("\n")
  await writeFile(
    join(OUT_DIR, "shards.ts"),
    `/* AUTO-GENERATED by scripts/build-hanzi-shards.mjs — do not edit. */\n\n` +
      `export const SHARD_COUNT = ${SHARD_COUNT}\n\n` +
      `export const HANZI_SHARDS: (() => unknown)[] = [\n${requires}\n]\n`
  )

  console.log(
    `  covered ${covered} characters (${missing} with no stroke data)`
  )
  if (missingSample.length)
    console.log(`  no data for e.g. ${missingSample.join(" ")}`)
  console.log(
    `  wrote ${SHARD_COUNT} shards, ${(totalBytes / 1024 / 1024).toFixed(1)}MB total`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
