import type {
  VocabWord,
  GrammarPoint,
  Reading,
  HanziChar,
  ConversationScenario,
  Course,
  Level,
  Unit,
  Lesson,
  LanguageCode,
  ExamType,
} from "@/types";
export type { VocabWord } from "@/types";
import { DEFAULT_LANGUAGE, langBundle } from "@/lib/languages";
import { getLearningLanguage } from "@/lib/language-context";

export const EXAM_LANGS: Record<string, string> = { hsk: "zh", tocfl: "zh", goethe: "de", jlpt: "ja", toefl: "en" };

/**
 * Cache-first JSON data client.
 *
 * Mirrors the audio layer (`NEXT_PUBLIC_AUDIO_CDN_URL`): content JSON bundles
 * are published to R2/CDN with content-hashed (immutable) URLs and fetched at
 * runtime instead of being embedded into the client bundle at build time.
 *
 * Bundle resolution:
 *   1. `data-manifest.json` (short TTL) maps logical bundle names to hashed
 *      object URLs, e.g. `"zh/vocabulary/index" → "data/zh/vocabulary/<sha>.json"`.
 *   2. Hashed bundle URLs are immutable → cached forever (cache-first,
 *      offline/PWA via Service Worker).
 *
 * Content is language-scoped: `data/json/<lang>/...`. Logical bundle names are
 * `<lang>/<domain>/index` (e.g. `zh/vocabulary/index`). App-level config
 * (achievements, exam-definitions, …) is published as `<name>/index`.
 *
 * Env:
 *   NEXT_PUBLIC_DATA_CDN_URL — public CDN/R2 base (e.g. https://cdn.navia.academy)
 */

const CDN_URL = process.env.NEXT_PUBLIC_DATA_CDN_URL ?? "";

export const DATA_CDN_PREFIX = "data";
const MANIFEST_PATH = "data-manifest.json";
const MANIFEST_REVALIDATE = 300; // seconds; short so releases propagate quickly

type DataManifest = Record<string, string>;

const memoryCache = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();
let manifestCache: DataManifest | null = null;
let manifestCacheAt = 0; // ms epoch; manifest revalidated after MANIFEST_REVALIDATE
let manifestInflight: Promise<DataManifest> | null = null;

const isServer = typeof window === "undefined";

/** Resolve an absolute fetch URL for a CDN object. The `data` prefix belongs to the CDN base. */
export function dataUrl(path: string): string {
  let base = `${CDN_URL.replace(/\/+$/, "")}/${DATA_CDN_PREFIX}`;
  if (base.startsWith("/") && isServer) {
    base = `${(process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "")}${base}`;
  }
  return `${base}/${path}`;
}

async function fromCacheStorage<T>(path: string): Promise<T | undefined> {
  if (typeof caches === "undefined") return undefined;
  try {
    const cache = await caches.open("navia-v1");
    const res = await cache.match(dataUrl(path));
    if (res?.ok) return (await res.json()) as T;
  } catch {
    // ignore SW cache errors
  }
  return undefined;
}

async function putCacheStorage(path: string, data: unknown): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    const cache = await caches.open("navia-v1");
    await cache.put(
      dataUrl(path),
      new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      }),
    );
  } catch {
    // ignore
  }
}

/** Load the bundle version manifest (cache-first with short TTL). */
export async function loadManifest(): Promise<DataManifest> {
  if (manifestCache && Date.now() - manifestCacheAt < MANIFEST_REVALIDATE * 1000) return manifestCache;
  if (manifestInflight) return manifestInflight;

  const promise = withRetry(async (): Promise<DataManifest> => {
    const res = await fetch(dataUrl(MANIFEST_PATH), {
      // Allow edge cache to serve the manifest within MANIFEST_REVALIDATE —
      // the object is uploaded with Cache-Control: public, max-age=86400 (1
      // day, set by publish-data), so repeat loads share edge hits instead of
      // one origin request per user.
      cache: "default",
      next: { revalidate: MANIFEST_REVALIDATE },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`Failed to load data manifest (${res.status})`);
    manifestCache = (await res.json()) as DataManifest;
    manifestCacheAt = Date.now();
    return manifestCache;
  });

  manifestInflight = promise;
  try {
    return await promise;
  } finally {
    manifestInflight = null;
  }
}

/** Load a raw JSON object path (hashed or dev fallback), cache-first. */
async function loadJson<T>(path: string): Promise<T> {
  const cached = memoryCache.get(path);
  if (cached !== undefined) return cached as T;

  const existing = inflight.get(path);
  if (existing) return existing as Promise<T>;

  const promise = withRetry(async (): Promise<T> => {
    const sw = await fromCacheStorage<T>(path);
    if (sw !== undefined) {
      memoryCache.set(path, sw);
      return sw;
    }

    const res = await fetch(dataUrl(path), { cache: "default", signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error(`Failed to load data bundle: ${path} (${res.status})`);

    const json = (await res.json()) as T;
    memoryCache.set(path, json);
    void putCacheStorage(path, json);
    return json;
  });

  inflight.set(path, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(path);
  }
}

/** Retry a fetch-ish task with short backoff. Gives up after 3 attempts. */
async function withRetry<T>(task: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await task();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastErr;
}

/**
 * Load a logical data bundle (manifest-resolved), cache-first.
 * Safe to call from both client and server; concurrent client calls dedupe.
 */
export async function loadBundle<T>(name: string): Promise<T> {
  const cacheKey = `bundle:${name}`;
  const cached = memoryCache.get(cacheKey);
  if (cached !== undefined) return cached as T;

  const manifest = await loadManifest();
  const objectPath = manifest[name] ?? name;
  const data = await loadJson<T>(objectPath);
  memoryCache.set(cacheKey, data);
  return data;
}

export function clearDataCache(): void {
  memoryCache.clear();
  manifestCache = null;
}

// ─── Typed bundle loaders ───────────────────────────────────────────────
// Content bundles are language-scoped (`<lang>/<domain>/index`). App-level
// config (achievements, exam-definitions, …) is language-agnostic.

export interface CurriculumBundle {
  course: Course;
  levels: Level[];
  units: Unit[];
  lessons: Lesson[];
}

export function loadVocabulary(lang: LanguageCode = DEFAULT_LANGUAGE): Promise<VocabWord[]> {
  return loadBundle<VocabWord[]>(langBundle(lang, "vocabulary/index"));
}

/**
 * Landing demo bundle: single small fetch carrying the whole marketing demo
 * (preview vocab per language, lesson counts, exam config, preview audio
 * entries). Loaded via the version manifest; intentionally no full-vocabulary
 * fallback — missing demo must never cascade into a 36 MB index download.
 */
export type LandingDemo = {
  preview: Record<string, VocabWord[]>;
  stats: Record<string, number>;
  exams: ExamConfigBundle;
  audio?: LandingAudioSeed[];
  /** Real placement-question total across languages (computed at publish). */
  placementTotal?: number;
};

/** Audio-manifest entries (subset) bundled — seeds playback without the ~14 MB audio manifest. */
export interface LandingAudioSeed {
  key: string;
  text: string;
  locale: string;
  audioPath?: string;
}

export function loadLandingDemo(): Promise<LandingDemo> {
  return loadBundle<LandingDemo>("landing/demo");
}

/** Tiny landing-preview bundle (first few words, published by the media pipeline). */
export function loadLandingPreview(lang: LanguageCode = DEFAULT_LANGUAGE): Promise<VocabWord[]> {
  return loadBundle<VocabWord[]>(`landing/preview/${lang}`).catch(() => []);
}

/** Precomputed landing stats (lesson counts per language) — avoids fetching full curricula on the landing page. */
export type LandingStats = Partial<Record<LanguageCode, number>>;

export function loadLandingStats(): Promise<LandingStats> {
  return loadBundle<LandingStats>("landing/stats").catch(() => ({}));
}

/** SSR data bundled into the marketing landing HTML (avoids post-hydration data fetch). */
export interface LandingInitial {
  examConfig: ExamConfigBundle | null;
  vocab: VocabWord[];
  stats: LandingStats;
  /** Real placement-question total across languages (from the landing bundle). */
  placementTotal?: number;
  audio?: LandingAudioSeed[];
  /** Preview vocab for every language — lets exam chips switch instantly, no extra fetches. */
  preview?: Record<string, VocabWord[]>;
}

export function loadGrammar(lang: LanguageCode = DEFAULT_LANGUAGE): Promise<GrammarPoint[]> {
  return loadBundle<GrammarPoint[]>(langBundle(lang, "grammar/index"));
}

export function loadReadings(lang: LanguageCode = DEFAULT_LANGUAGE): Promise<Reading[]> {
  return loadBundle<Reading[]>(langBundle(lang, "readings/index"));
}

export function loadCharacters(lang: LanguageCode = DEFAULT_LANGUAGE): Promise<HanziChar[]> {
  return loadBundle<HanziChar[]>(langBundle(lang, "characters/index"));
}

export function loadConversations(lang: LanguageCode = DEFAULT_LANGUAGE): Promise<ConversationScenario[]> {
  return loadBundle<ConversationScenario[]>(langBundle(lang, "conversations/index"));
}

export function loadCurriculum(lang: LanguageCode = DEFAULT_LANGUAGE): Promise<CurriculumBundle> {
  return loadBundle<CurriculumBundle>(langBundle(lang, "curriculum/index"));
}

/**
 * Load vocabulary for the given language or auto-detect from language context.
 */
export function loadVocabularyFor(lang: LanguageCode): Promise<VocabWord[]> {
  return loadBundle<VocabWord[]>(langBundle(lang, "vocabulary/index"));
}

/**
 * Load data for the currently active language (from settings).
 * Convenience wrapper for pages that want to load data for the user's selected language.
 */
export function loadVocabularyActive(): Promise<VocabWord[]> {
  const lang = getLearningLanguage();
  return loadVocabularyFor(lang);
}

export function loadGrammarActive(): Promise<GrammarPoint[]> {
  const lang = getLearningLanguage();
  return loadBundle<GrammarPoint[]>(langBundle(lang, "grammar/index"));
}

export function loadCharactersActive(): Promise<HanziChar[]> {
  const lang = getLearningLanguage();
  return loadBundle<HanziChar[]>(langBundle(lang, "characters/index"));
}

// ─── App-level config (not language-scoped) ─────────────────────────────

export interface ExamDefinitionConfig {
  type: string;
  name: string;
  nameCN: string;
  name_en: string;
  name_de: string;
  name_ja: string;
  region: string;
  script: string;
  levels: string[];
  wordCountPerLevel: Record<string, number>;
  focus: string[];
  description?: string;
  website?: string;
}

/** Per-language field on ExamDefinitionConfig holding the localized name. */
const NAME_FIELD_BY_LANG: Record<string, keyof ExamDefinitionConfig> = {
  zh: "nameCN",
  de: "name_de",
  ja: "name_ja",
  en: "name_en",
};

/**
 * Exam display name for the user's learning language. Data-driven (no switch):
 * each language maps to a field on the definition; falls back to the English
 * canonical `name` when the field is missing.
 */
export function examNameForLang(def: ExamDefinitionConfig, lang: string): string {
  const field = NAME_FIELD_BY_LANG[lang];
  const localized = field ? (def[field] as string | undefined) : undefined;
  return localized || def.name;
}

export interface ExamConfigBundle {
  definitions: Record<string, ExamDefinitionConfig>;
  displayNames: Record<string, string>;
  abbreviations: Record<string, string>;
  types: string[];
  badgeColors: Record<string, string>;
  /**
   * Actual seeded vocabulary totals per exam type, computed at publish time
   * from the source JSON (see VOCAB_ROOTS in apps/media). Optional so bundles
   * without it fall back to summing wordCountPerLevel.
   */
  wordTotals?: Record<string, number>;
}

export function loadExamConfig(): Promise<ExamConfigBundle> {
  return Promise.all([
    loadBundle<Record<string, ExamDefinitionConfig>>("exam-definitions/index"),
    loadBundle<Record<string, string>>("exam-display-names/index"),
    loadBundle<Record<string, string>>("exam-abbreviations/index"),
    loadBundle<string[]>("exam-types/index"),
    loadBundle<Record<string, string>>("exam-badge-colors/index"),
  ]).then(([definitions, displayNames, abbreviations, types, badgeColors]) => ({
    definitions,
    displayNames,
    abbreviations,
    types,
    badgeColors,
  }));
}
export interface ExamCardDef {
  id: string;
  name: string;
  description: string;
  examType: ExamType;
  level: string;
  questions: number;
  duration: number;
  passingScore: number;
  href: string;
  available: boolean;
}

export function loadExamCards(): Promise<ExamCardDef[]> {
  return loadBundle<ExamCardDef[]>("exam-cards/index");
}

export function loadAchievements<T = unknown>(): Promise<T[]> {
  return loadBundle<T[]>("achievements/index");
}

export function loadPlacement<T = unknown>(lang: LanguageCode = DEFAULT_LANGUAGE): Promise<T[]> {
  return loadBundle<T[]>(langBundle(lang, "placement/index"));
}
