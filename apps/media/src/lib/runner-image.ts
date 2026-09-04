import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { createHash } from "node:crypto"
import {
  resolveMediaConfig,
  storageConfigured,
  type MediaConfig,
} from "./config"
import { buildImagePrompt, closeDeepaiBrowser } from "./image"
import { compressImage } from "./image-compress"
import { generateImageWithRotation } from "./image-keys"
import { DATA_DIR, JSON_DIR, OUTPUT_IMAGE_DIR } from "./manifest"
import { createStorageClient, listKeys, uploadBuffer } from "./storage"

export interface VocabEntry {
  id: string
  translation: string
  translationId?: string
  /** Headword in the source language (hanzi / kana / native script). */
  word?: string
  /** Raw JSON fields (hanzi for zh, text for de/en/ja) — read directly from content. */
  hanzi?: string
  text?: string
  /** Raw JSON snake_case field, mapped to `translationId`. */
  translation_id?: string
  /** Contributor-authored per-item prompt override (data-driven, not code). */
  imagePrompt?: string
  meanings?: string[]
  pos?: string
  level?: number
  language?: string
}

interface ImageRecord {
  hash: string
  prompt: string
  translation: string
  translationId?: string
  language: string
  generatedAt: string
  /** Detected image format (png/jpg/webp). Missing on pre-format records → re-generate. */
  ext?: string
}

const RECORDS_PATH = join(OUTPUT_IMAGE_DIR, ".generate-image-records.json")
const IMAGES_MANIFEST_PATH = join(DATA_DIR, "images", "images-manifest.json")
const LANGUAGES = ["zh", "de", "en", "ja"] as const

export interface ImageBatchResult {
  generated: number
  skipped: number
  errors: number
  total: number
  upload: boolean
}

function contentHash(text: string): string {
  return createHash("md5")
    .update(text.toLowerCase().trim())
    .digest("hex")
    .slice(0, 12)
}

/**
 * Detect the actual image format from magic bytes (not the extension).
 * DeepAI returns JPEG but files were historically saved as `.png` → this fixes
 * the stored extension + upload content-type so the CDN serves correct mime.
 */
function detectImageFormat(buf: Buffer): { ext: string; mime: string } {
  if (
    buf.length >= 8 &&
    buf
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { ext: "png", mime: "image/png" }
  }
  if (
    buf.length >= 3 &&
    buf[0] === 0xff &&
    buf[1] === 0xd8 &&
    buf[2] === 0xff
  ) {
    return { ext: "jpg", mime: "image/jpeg" }
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { ext: "webp", mime: "image/webp" }
  }
  return { ext: "png", mime: "image/png" }
}

async function loadJSON<T>(file: string): Promise<T[]> {
  return JSON.parse(await readFile(file, "utf-8")) as T[]
}

async function loadRecords(): Promise<ImageRecord[]> {
  try {
    const raw = await readFile(RECORDS_PATH, "utf-8")
    return JSON.parse(raw) as ImageRecord[]
  } catch {
    return []
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function walkJson(dir: string): Promise<string[]> {
  const out: string[] = []
  const entries = await readdir(dir, { withFileTypes: true }).catch(
    () => [] as { name: string; isDirectory(): boolean }[]
  )
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walkJson(p)))
    else if (e.name.endsWith(".json")) out.push(p)
  }
  return out
}

/**
 * Canonical "concept" key for an item — based on the Indonesian translation
 * (`translation_id`), which is far more consistent across the 4 languages than
 * the English `translation` (e.g. ja uses "hello / good afternoon", de/en "hello").
 * Two items with the same concept share ONE generated image (no re-generation).
 */
function conceptKey(
  item: Pick<VocabEntry, "translation" | "translationId">
): string {
  return (item.translationId || item.translation).toLowerCase().trim()
}

export { conceptKey }

/**
 * Collect beginner (A-band, CEFR A1-A2) vocabulary items across ALL languages.
 * Beginner boundary is derived per item via `level <= 2` (consistent across the
 * 4 languages: hsk1=1, hsk2=2, a1=1, a2=2, n5=1, tocfl Band A=1-2).
 * HSK 3 / Goethe B1 / JLPT N3 etc. (CEFR B-band) are excluded — images serve only
 * the A-band where the image-stimulus exam questions exist.
 */
export async function collectVocabItems(): Promise<VocabEntry[]> {
  const items: VocabEntry[] = []
  for (const lang of LANGUAGES) {
    const vocabDir = join(JSON_DIR, lang, "vocabulary")
    const files = await walkJson(vocabDir)
    for (const f of files) {
      const arr = await loadJSON<VocabEntry>(f).catch(() => [] as VocabEntry[])
      for (const it of arr) {
        if (typeof it.level === "number" && it.level <= 2 && it.translation) {
          items.push({
            id: it.id,
            translation: it.translation,
            translationId: it.translationId ?? it.translation_id,
            word: it.word ?? it.hanzi ?? it.text,
            meanings: it.meanings,
            pos: it.pos,
            imagePrompt: it.imagePrompt,
            level: it.level,
            language: lang,
          })
        }
      }
    }
  }
  return items
}

/**
 * Check if a local image file exists on disk.
 * Used to skip storage LIST calls when the file is already present locally.
 */
async function localImageExists(hash: string, ext: string): Promise<boolean> {
  if (!ext) return false
  try {
    await stat(join(OUTPUT_IMAGE_DIR, `${hash}.${ext}`))
    return true
  } catch {
    return false
  }
}

/**
 * Build a Set of all image object keys already in storage under the images prefix.
 * Single LIST call instead of per-hash HEAD requests.
 */
async function existingImageKeys(
  cfg: MediaConfig,
  client: ReturnType<typeof createStorageClient>
): Promise<Set<string>> {
  const keys = await listKeys(cfg, client, "images/")
  return new Set(keys)
}

/** Persist the image manifest (mirror of audio-manifest) so web can resolve translation → image URL. */
async function writeImageManifest(records: ImageRecord[]): Promise<void> {
  const seen = new Set<string>()
  const manifest: {
    hash: string
    ext: string
    translation: string
    language: string
  }[] = []
  for (const r of records) {
    if (!r.ext) continue // dry-run records have no file
    // Dedup by TRANSLATION (not hash): a single concept image may back several
    // translations across languages (e.g. "hello" + "hello / good afternoon").
    const tkey = r.translation.toLowerCase().trim()
    if (seen.has(tkey)) continue
    seen.add(tkey)
    manifest.push({
      hash: r.hash,
      ext: r.ext,
      translation: r.translation,
      language: r.language,
    })
  }
  await mkdir(join(DATA_DIR, "images"), { recursive: true })
  await writeFile(
    IMAGES_MANIFEST_PATH,
    JSON.stringify(manifest, null, 2),
    "utf-8"
  )
}

/**
 * Canonical "concept" identity of a record, used for cross-language reuse.
 * Indexes BOTH the Indonesian translation_id (primary) and the English
 * translation (fallback for legacy records that predate `translationId`).
 */
function recordConceptKeys(r: ImageRecord): string[] {
  const keys = new Set<string>()
  if (r.translationId) keys.add(r.translationId.toLowerCase().trim())
  keys.add(r.translation.toLowerCase().trim())
  return [...keys]
}

function lookupConceptRecord(
  item: VocabEntry,
  index: Map<string, ImageRecord>
): ImageRecord | undefined {
  const byId = item.translationId
    ? index.get(item.translationId.toLowerCase().trim())
    : undefined
  if (byId) return byId
  return item.translation
    ? index.get(item.translation.toLowerCase().trim())
    : undefined
}

export async function generateImageBatch(
  opts: { limit?: number; dryRun?: boolean } = {}
): Promise<ImageBatchResult> {
  const cfg = await resolveMediaConfig()
  const records = await loadRecords()
  const upload = storageConfigured(cfg)
  const client = upload ? createStorageClient(cfg) : null
  await mkdir(OUTPUT_IMAGE_DIR, { recursive: true })

  // Pre-fetch all existing image keys in one LIST call.
  const storageKeys = client
    ? await existingImageKeys(cfg, client)
    : new Set<string>()
  // Index by content hash (extension lives in the key, and a stale/absent
  // checkpoint may not know it) so dedup works without any local record.
  const storageKeyByHash = new Map<string, string>()
  for (const k of storageKeys) {
    const m = /^images\/([0-9a-f]+)\.[a-z0-9]+$/i.exec(k)
    if (m) storageKeyByHash.set(m[1], k)
  }

  // Index records by hash (exact translation) and by concept (cross-language).
  const recordsByHash = new Map<string, ImageRecord>()
  const recordsByConcept = new Map<string, ImageRecord>()
  for (const r of records) {
    if (!recordsByHash.has(r.hash)) recordsByHash.set(r.hash, r)
    for (const k of recordConceptKeys(r)) {
      if (!recordsByConcept.has(k)) recordsByConcept.set(k, r)
    }
  }

  const items = await collectVocabItems()

  let generated = 0
  let skipped = 0
  let errors = 0
  const newRecords: ImageRecord[] = []

  for (const item of items) {
    if (!item.translation) continue
    const prompt = buildImagePrompt(item)
    // Include imagePrompt in hash so editing a custom prompt triggers
    // regeneration (L1 fix). Items without imagePrompt hash identically to the
    // old translation-only hash, preserving backward-compatibility with existing
    // records.
    const hash = contentHash(item.translation + "|" + (item.imagePrompt ?? ""))
    const rec = recordsByHash.get(hash)

    // 1) Exact translation already generated (file present locally or in storage).
    if (rec) {
      const ext = rec.ext ?? ""
      if (
        (await localImageExists(hash, ext)) ||
        (ext && storageKeys.has(`images/${hash}.${ext}`))
      ) {
        skipped++
        newRecords.push(rec)
        continue
      }
      // Fall through to re-generate if the file is missing.
    }

    // 1b) Unconditional R2 dedup — NOT gated on checkpoint state. Ephemeral
    // runners (GitHub Actions) start with no records file; without this a
    // cold run would regenerate everything and silently overwrite existing
    // objects at their immutable-cached keys. Also self-heals a record whose
    // stored extension drifted (e.g. legacy png vs actual jpg).
    const storedKey = storageKeyByHash.get(hash)
    if (storedKey) {
      skipped++
      const storedExt = storedKey.split(".").pop() ?? ""
      newRecords.push(
        rec
          ? { ...rec, ext: rec.ext || storedExt }
          : {
              hash,
              prompt,
              translation: item.translation,
              translationId: item.translationId,
              language: item.language ?? "zh",
              ext: storedExt,
              generatedAt: new Date().toISOString(),
            }
      )
      continue
    }

    // 2) Same concept already generated under a different translation → reuse
    //    that image (e.g. de/en "hello" + ja "hello / good afternoon" → one image).
    const conceptRec = lookupConceptRecord(item, recordsByConcept)
    if (conceptRec && conceptRec.ext && conceptRec.hash !== hash) {
      skipped++
      newRecords.push({
        ...conceptRec,
        prompt,
        translation: item.translation,
        translationId: item.translationId,
        language: item.language ?? "zh",
        generatedAt: conceptRec.generatedAt,
      })
      continue
    }

    if (opts.limit !== undefined && generated >= opts.limit) break

    try {
      let ext = ""
      let mime = "image/png"
      if (!opts.dryRun) {
        const image = await generateImageWithRotation(cfg, prompt)
        // Layer 2: universal post-compress → WebP 512 (displayed at ~192px).
        const compressed = await compressImage(image)
        const detected = compressed ?? detectImageFormat(image)
        ext = detected.ext
        mime = detected.mime
        const toStore = compressed?.buf ?? image
        const localPath = join(OUTPUT_IMAGE_DIR, `${hash}.${ext}`)
        await writeFile(localPath, toStore)
        if (client) {
          await uploadBuffer(
            cfg,
            client,
            `images/${hash}.${ext}`,
            toStore,
            mime
          )
        }
      }
      const record: ImageRecord = {
        hash,
        prompt,
        translation: item.translation,
        translationId: item.translationId,
        language: item.language ?? "zh",
        ext,
        generatedAt: new Date().toISOString(),
      }
      newRecords.push(record)
      // Register the new image under its concept so later items in this batch reuse it.
      if (item.translationId)
        recordsByConcept.set(item.translationId.toLowerCase().trim(), record)
      if (item.translation)
        recordsByConcept.set(item.translation.toLowerCase().trim(), record)
      generated++
    } catch (err) {
      errors++
      console.error(
        `  ✗ ${item.id}: ${err instanceof Error ? err.message : err}`
      )
    }
    // Sleep between EVERY attempt (success or error) — a 429/401 rate limit
    // must also be paced, otherwise the error loop hammers the API.
    if (!opts.dryRun) await sleep(cfg.imageRateLimitMs)
  }

  await writeFile(RECORDS_PATH, JSON.stringify(newRecords, null, 2), "utf-8")
  if (!opts.dryRun) await writeImageManifest(newRecords)
  await closeDeepaiBrowser()
  return { generated, skipped, errors, total: items.length, upload }
}
