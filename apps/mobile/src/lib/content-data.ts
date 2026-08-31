import { env } from "@/utils/env"
import type { VocabWord } from "@/types/api"

/**
 * Cache-first JSON data client (mobile), mirrors apps/web/src/lib/data-client.ts.
 *
 * Content bundles are published to R2/RustFS with content-hashed (immutable)
 * URLs and fetched at runtime instead of hitting the backend:
 *
 *   1. `data-manifest.json` (short TTL) maps logical names → hashed object URLs,
 *      e.g. `"zh/vocabulary/index" → "data/zh/vocabulary/<sha>.json"`.
 *   2. Hashed bundles are immutable → cached forever.
 *   3. Base URL = `env.mediaBaseUrl` (CDN/R2 prefix) + `/data`.
 *
 * Env: EXPO_PUBLIC_DATA_CDN_URL overrides the base (per-bucket CDN); default =
 * env.mediaBaseUrl (RustFS dev / R2 public URL).
 */

const CDN_BASE = (
  (process.env.EXPO_PUBLIC_DATA_CDN_URL ?? env.mediaBaseUrl) ||
  ""
).replace(/\/+$/, "")

const DATA_PREFIX = "data"
const MANIFEST_PATH = "data-manifest.json"

const memoryCache = new Map<string, unknown>()
const inflight = new Map<string, Promise<unknown>>()
let manifestCache: Record<string, string> | null = null
let manifestInflight: Promise<Record<string, string>> | null = null

type DataManifest = Record<string, string>

function dataUrl(path: string): string {
  return `${CDN_BASE}/${DATA_PREFIX}/${path}`
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(dataUrl(path), { cache: "default" })
  if (!res.ok)
    throw new Error(`Failed to load data bundle: ${path} (${res.status})`)
  return (await res.json()) as T
}

/** Load the bundle version manifest (cache-first). */
export async function loadManifest(): Promise<DataManifest> {
  if (manifestCache) return manifestCache
  if (manifestInflight) return manifestInflight

  const promise = (async (): Promise<DataManifest> => {
    manifestCache = await fetchJson<DataManifest>(MANIFEST_PATH)
    return manifestCache
  })()

  manifestInflight = promise
  try {
    return await promise
  } finally {
    manifestInflight = null
  }
}

/** Load a logical data bundle (manifest-resolved), cache-first + deduped. */
export async function loadBundle<T>(name: string): Promise<T> {
  const cacheKey = `bundle:${name}`
  const cached = memoryCache.get(cacheKey)
  if (cached !== undefined) return cached as T

  const existing = inflight.get(cacheKey)
  if (existing) return existing as Promise<T>

  const promise = (async (): Promise<T> => {
    const manifest = await loadManifest()
    const objectPath = manifest[name] ?? `${name}.json`
    const data = await fetchJson<T>(objectPath)
    memoryCache.set(cacheKey, data)
    return data
  })()

  inflight.set(cacheKey, promise)
  try {
    return await promise
  } finally {
    inflight.delete(cacheKey)
  }
}

export function clearDataCache(): void {
  memoryCache.clear()
  manifestCache = null
}

/** Language-scoped vocabulary bundle (`<lang>/vocabulary/index`). */
export function loadVocabulary(lang = "zh"): Promise<VocabWord[]> {
  return loadBundle<VocabWord[]>(`${lang}/vocabulary/index`)
}
