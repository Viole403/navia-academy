import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

export interface ManifestEntry {
  key: string
  text: string
  locale: "zh-CN" | "zh-TW" | "zh-HK" | "de-DE" | "ja-JP" | "en-US"
  examSource?: string
  audioPath?: string
  language?: string
}

const ROOT = join(process.cwd())
export const DATA_DIR = join(ROOT, "data")
export const JSON_DIR = join(DATA_DIR, "json")
export const MANIFEST_PATH = join(DATA_DIR, "audio", "audio-manifest.json")
export const OUTPUT_AUDIO_DIR = join(ROOT, ".output", "audio")
export const OUTPUT_IMAGE_DIR = join(ROOT, ".output", "images")

export async function loadManifest(): Promise<ManifestEntry[]> {
  const raw = await readFile(MANIFEST_PATH, "utf-8")
  return JSON.parse(raw) as ManifestEntry[]
}

export function contentHash(
  text: string,
  locale: string,
  gender: string
): string {
  return createHash("md5")
    .update(`${text}::${locale}::${gender}`)
    .digest("hex")
    .slice(0, 12)
}

/** Static/upload object key, e.g. `audio/grammar:g-shi:ex0__zh-CN__female.mp3`. */
export function audioObjectKey(entry: ManifestEntry, gender: string): string {
  return `audio/${entry.key}__${entry.locale}__${gender}.mp3`
}

/** Local filename for the same object. */
export function audioLocalName(entry: ManifestEntry, gender: string): string {
  return `${entry.key}__${entry.locale}__${gender}.mp3`
}
