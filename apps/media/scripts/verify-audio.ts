import { readdir, readFile, rm } from "node:fs/promises"
import { join } from "node:path"
import { OUTPUT_AUDIO_DIR, loadManifest } from "../src/lib/manifest"
import {
  audioFingerprint,
  entryGender,
  looksLikeMp3,
} from "../src/lib/runner-audio"

/**
 * Verify local audio against manifest + records.
 *
 *   verify-audio                # report only
 *   verify-audio --fix          # delete invalid files so the next
 *                               # generate-audio run recreates them
 *   verify-audio --lang zh      # scope to one language
 *
 * Checks per manifest entry:
 *   - file present locally (missing = to generate, not an error)
 *   - structurally valid mp3 (frame sync / ID3 + minimum size)
 *   - byte fingerprint matches the record (when the record has one)
 * Exit code 1 when any file is invalid.
 */

const RECORDS_PATH = join(OUTPUT_AUDIO_DIR, ".generate-records.json")

interface Record {
  key: string
  audioHash?: string
  audioSize?: number
}

async function main() {
  const fix = process.argv.includes("--fix")
  const langIdx = process.argv.indexOf("--lang")
  const lang = langIdx > -1 ? process.argv[langIdx + 1] : undefined

  const manifest = await loadManifest()
  let records = new Map<string, Record>()
  try {
    const list = JSON.parse(await readFile(RECORDS_PATH, "utf-8")) as Record[]
    records = new Map(list.map((r) => [r.key, r]))
  } catch {
    console.log("no records file — everything counts as unverified")
  }

  const local = new Set(await readdir(OUTPUT_AUDIO_DIR).catch(() => []))
  let checked = 0
  let missing = 0
  let invalid = 0
  let mismatched = 0
  const badKeys: string[] = []

  for (const entry of manifest) {
    if (lang && entry.language !== lang) continue
    const gender = entryGender(entry)
    const file = `${entry.key}__${entry.locale}__${gender}.mp3`
    if (!local.has(file)) {
      missing++
      continue
    }
    checked++
    const buf = await readFile(join(OUTPUT_AUDIO_DIR, file))
    const rec = records.get(`${entry.key}__${entry.locale}__${gender}`)
    if (!looksLikeMp3(buf)) {
      invalid++
      badKeys.push(file)
      console.log(`  INVALID ${file} (${buf.length} bytes)`)
      if (fix) await rm(join(OUTPUT_AUDIO_DIR, file))
      continue
    }
    if (rec?.audioHash && rec.audioHash !== audioFingerprint(buf)) {
      mismatched++
      badKeys.push(file)
      console.log(`  MISMATCH ${file} (bytes differ from record)`)
      if (fix) await rm(join(OUTPUT_AUDIO_DIR, file))
    }
  }

  // Orphaned local files (no manifest entry) — listed, never auto-deleted.
  const manifestFiles = new Set(
    manifest
      .filter((e) => !lang || e.language === lang)
      .map((e) => {
        const g = entryGender(e)
        return `${e.key}__${e.locale}__${g}.mp3`
      })
  )
  const orphaned = [...local].filter(
    (f) => f.endsWith(".mp3") && !manifestFiles.has(f)
  )

  console.log(
    `\nchecked=${checked} missing=${missing} invalid=${invalid} ` +
      `mismatched=${mismatched} orphaned=${orphaned.length}` +
      (fix ? " (invalid files deleted)" : "")
  )
  if (orphaned.length > 0 && orphaned.length <= 20) {
    for (const f of orphaned) console.log(`  orphan: ${f}`)
  } else if (orphaned.length > 20) {
    console.log(`  (first 20 of ${orphaned.length} orphans shown)`)
    for (const f of orphaned.slice(0, 20)) console.log(`  orphan: ${f}`)
  }
  if (invalid + mismatched > 0) process.exit(1)
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(2)
})
