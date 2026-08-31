/**
 * Content-levels whitelist generator — single source of truth.
 *
 * Scans data/json/<lang>/<domain>/ recursively and derives every valid
 * target level ("ref") from the actual folder structure:
 *
 *   data/json/zh/vocabulary/hsk/hsk1.json → ref "hsk/hsk1"
 *   data/json/de/vocabulary/a1.json       → ref "a1"
 *
 * This is the EXACT inverse of scripts/lib/sync-content.ts's
 * `join(JSON_DIR, lang, domain, `${ref}.json`)` routing, so a ref produced
 * here always routes back to the same file on merge.
 *
 * Published to the CDN as data/content-levels.json by publish-data;
 * apps/backend and apps/web fetch it over HTTP — no cross-app filesystem
 * access anywhere.
 *
 * Roadmap levels (not yet seeded) participate automatically: drop an empty
 * `[]` placeholder file at the expected path (e.g. ja/vocabulary/n4.json)
 * and it shows up on the next generate/publish. `contributor.json` is
 * excluded on purpose — it is the fallback bucket for ref-less submissions,
 * not a selectable level.
 */

import { readdir, writeFile } from "node:fs/promises"
import { join, relative } from "node:path"
import { JSON_DIR, ROOT } from "./content"

export const CONTENT_LEVELS_PATH = join(ROOT, "data", "content-levels.json")

const LANGUAGES = ["zh", "de", "en", "ja"] as const
const DOMAINS = [
  "vocabulary",
  "grammar",
  "readings",
  "conversations",
  "characters",
] as const

/** The fallback bucket is never a selectable level. */
const SKIP_FILES = new Set(["contributor.json"])

export type ContentLevels = Record<string, Record<string, string[]>>

async function collectRefs(domainDir: string): Promise<string[]> {
  const refs: string[] = []
  const walk = async (dir: string): Promise<void> => {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    for (const e of entries) {
      if (e.isDirectory()) {
        await walk(join(dir, e.name))
      } else if (e.name.endsWith(".json") && !SKIP_FILES.has(e.name)) {
        // Inverse of sync-content's join(JSON_DIR, lang, domain, `${ref}.json`)
        refs.push(relative(domainDir, join(dir, e.name)).replace(/\.json$/, ""))
      }
    }
  }
  await walk(domainDir)
  return refs.sort()
}

/** Scan the tree and build the nested whitelist. Only existing folders appear. */
export async function buildContentLevels(): Promise<ContentLevels> {
  const out: ContentLevels = {}
  for (const lang of LANGUAGES) {
    for (const domain of DOMAINS) {
      const refs = await collectRefs(join(JSON_DIR, lang, domain))
      if (refs.length === 0) continue
      ;(out[lang] ??= {})[domain] = refs
    }
  }
  return out
}

/** Build + write data/content-levels.json (pretty-printed, trailing newline). */
export async function writeContentLevelsFile(): Promise<ContentLevels> {
  const levels = await buildContentLevels()
  const body = JSON.stringify(levels, null, 2) + "\n"
  await writeFile(CONTENT_LEVELS_PATH, body, "utf-8")
  return levels
}
