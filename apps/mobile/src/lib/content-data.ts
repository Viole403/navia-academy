import { env } from "@/utils/env"
import type {
  ConversationScenario,
  CurriculumBundle,
  GrammarPoint,
  HanziChar,
  PlacementItem,
  Reading,
  VocabWord,
} from "@/types/api"
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  langBundle,
  type LanguageCode,
} from "@/lib/languages"

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
export function loadVocabulary(
  lang: LanguageCode = DEFAULT_LANGUAGE
): Promise<VocabWord[]> {
  return loadBundle<VocabWord[]>(langBundle(lang, "vocabulary/index"))
}

/** Language-scoped grammar bundle (`<lang>/grammar/index`). */
export function loadGrammar(
  lang: LanguageCode = DEFAULT_LANGUAGE
): Promise<GrammarPoint[]> {
  return loadBundle<GrammarPoint[]>(langBundle(lang, "grammar/index"))
}

/** Language-scoped readings bundle (`<lang>/readings/index`). */
export function loadReadings(
  lang: LanguageCode = DEFAULT_LANGUAGE
): Promise<Reading[]> {
  return loadBundle<Reading[]>(langBundle(lang, "readings/index"))
}

/** Language-scoped conversations bundle (`<lang>/conversations/index`). */
export function loadConversations(
  lang: LanguageCode = DEFAULT_LANGUAGE
): Promise<ConversationScenario[]> {
  return loadBundle<ConversationScenario[]>(
    langBundle(lang, "conversations/index")
  )
}

/** Language-scoped characters bundle (`<lang>/characters/index`). */
export function loadCharacters(
  lang: LanguageCode = DEFAULT_LANGUAGE
): Promise<HanziChar[]> {
  return loadBundle<HanziChar[]>(langBundle(lang, "characters/index"))
}

/** Language-scoped curriculum bundle (`<lang>/curriculum/index`). */
export function loadCurriculum(
  lang: LanguageCode = DEFAULT_LANGUAGE
): Promise<CurriculumBundle> {
  return loadBundle<CurriculumBundle>(langBundle(lang, "curriculum/index"))
}

/** Language-scoped placement bank (`<lang>/placement/index`). Flat array. */
export function loadPlacement(
  lang: LanguageCode = DEFAULT_LANGUAGE
): Promise<PlacementItem[]> {
  return loadBundle<PlacementItem[]>(langBundle(lang, "placement/index"))
}

/**
 * Find a word by id, searching the preferred language first then the rest.
 * Ids are only unique per language bundle, so cross-language lookup tries
 * each bundle in turn.
 */
export async function findWord(
  id: string,
  preferred: LanguageCode = DEFAULT_LANGUAGE
): Promise<{ word: VocabWord | null; lang: LanguageCode }> {
  const langs: LanguageCode[] = [
    preferred,
    ...LANGUAGES.filter((l) => l.code !== preferred).map((l) => l.code),
  ]
  for (const lang of langs) {
    const all = await loadVocabulary(lang).catch(() => [] as VocabWord[])
    const word = all.find((w) => w.id === id) ?? null
    if (word) return { word, lang }
  }
  return { word: null, lang: preferred }
}
