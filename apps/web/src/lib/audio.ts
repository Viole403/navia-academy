"use client"

import {
  detectLocale,
  localeForExam,
  type VoiceGender,
  type VoiceLocale,
} from "@navia/utils"
import { loadBundle } from "@/lib/data-client"
import { resolveTtsUrl } from "@/lib/tts-client"
import { useSettings } from "@/stores/settings"

type AudioOpts = {
  rate?: number
  lang?: string
  onEnd?: () => void
  onError?: () => void
  onLoadingChange?: (loading: boolean) => void
}

type ManifestEntry = {
  key: string
  text: string
  locale: string
  examSource?: string
  audioPath?: string
}

const textByKey = new Map<string, string>()
const audioPathByKey = new Map<string, string>()
const keysByText = new Map<string, string[]>()
const localeByKey = new Map<string, string>()

let manifestPromise: Promise<void> | null = null
/** Populate the lookup maps from manifest entries (shared by full + seeded loads). */
function ingestAudioManifest(entries: ManifestEntry[]) {
  for (const entry of entries) {
    textByKey.set(entry.key, entry.text)
    localeByKey.set(entry.key, entry.locale)
    if (entry.audioPath && entry.audioPath !== entry.key) {
      audioPathByKey.set(entry.key, entry.audioPath)
    }
    const existing = keysByText.get(entry.text)
    if (existing) {
      existing.push(entry.key)
    } else {
      keysByText.set(entry.text, [entry.key])
    }
  }
}
/**
 * Seed playback lookups from a small bundled subset (landing demo) instead of
 * the full ~14 MB audio manifest. Idempotent; a later full ensureAudioManifest
 * is a no-op once a seed has been applied.
 */
export function seedAudioManifest(entries: ManifestEntry[]) {
  ingestAudioManifest(entries)
  if (!manifestPromise) manifestPromise = Promise.resolve()
}
/**
 * Load the audio manifest from the data CDN (cache-first) and populate the
 * lookup maps. Called lazily by the first preload/play; the 14 MB manifest
 * therefore never enters the JS bundle.
 */
function ensureAudioManifest(): Promise<void> {
  if (!manifestPromise) {
    manifestPromise =
      loadBundle<ManifestEntry[]>("audio/manifest").then(ingestAudioManifest)
  }
  return manifestPromise
}

const CDN_PUBLIC_URL = process.env.NEXT_PUBLIC_AUDIO_CDN_URL ?? ""
const DEFAULT_BASE = process.env.NEXT_PUBLIC_AUDIO_BASE_URL ?? "/audio"
const AUDIO_EXT = ".mp3"

const cache = new Map<string, HTMLAudioElement>()
const loadingCallbacks = new Map<string, Set<(loading: boolean) => void>>()
const preloadLocks = new Map<string, Promise<HTMLAudioElement>>()
const urlCache = new Map<string, string>() // `${text}::${locale}::${gender}` -> resolved URL
const persistentCache = new Map<string, string>() // localStorage-backed URL cache
const currentAudio = {
  el: null as HTMLAudioElement | null,
  key: "" as string | null,
  locale: null as VoiceLocale | null,
  gender: null as VoiceGender | null,
}

const PERSISTENT_CACHE_KEY = "navia-audio-cache"

function loadPersistentCache(): void {
  try {
    const raw = localStorage.getItem(PERSISTENT_CACHE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, string>
      for (const [k, v] of Object.entries(parsed)) {
        persistentCache.set(k, v)
      }
    }
  } catch {
    // ignore
  }
}

function savePersistentCache(): void {
  try {
    const obj: Record<string, string> = {}
    persistentCache.forEach((v, k) => {
      obj[k] = v
    })
    localStorage.setItem(PERSISTENT_CACHE_KEY, JSON.stringify(obj))
  } catch {
    // ignore quota errors
  }
}

// Load persistent cache on module init
loadPersistentCache()

/**
 * Whether CDN URL is configured (production).
 * When set, manifest-backed keys resolve directly to CDN first,
 * bypassing the backend TTS endpoint entirely.
 */
function isCdnConfigured(): boolean {
  return CDN_PUBLIC_URL.length > 0
}

/** True when manifest-backed audio can be fetched (public CDN). */
function hasManifestMedia(): boolean {
  return isCdnConfigured()
}

/**
 * Build a CDN URL for a manifest-backed key.
 * Uses the deterministic key-based naming: `<key>__<locale>__<gender>.mp3`
 */
function cdnAudioUrl(
  key: string,
  locale: VoiceLocale,
  gender: VoiceGender
): string {
  const base = CDN_PUBLIC_URL.replace(/\/+$/, "")
  return `${base}/audio/${key}__${locale}__${gender}${AUDIO_EXT}`
}

export function audioUrl(
  key: string,
  locale?: VoiceLocale,
  gender?: VoiceGender
): string {
  const manifestLocale = localeByKey.get(key) as VoiceLocale | undefined
  const l = locale ?? manifestLocale ?? "zh-CN"
  const g = gender ?? useSettings.getState().voiceGender ?? "female"

  if (isCdnConfigured()) {
    return cdnAudioUrl(key, l, g)
  }

  const base = DEFAULT_BASE.replace(/\/+$/, "")
  return `${base}/${key}__${l}__${g}${AUDIO_EXT}`
}

export function audioUrlWithGender(
  key: string,
  locale: VoiceLocale,
  gender: VoiceGender
): string {
  return audioUrl(key, locale, gender)
}

function emitKeyLoading(key: string, loading: boolean) {
  loadingCallbacks.get(key)?.forEach((fn) => fn(loading))
}

export function subscribeLoading(
  key: string,
  fn: (loading: boolean) => void
): () => void {
  if (!loadingCallbacks.has(key)) loadingCallbacks.set(key, new Set())
  loadingCallbacks.get(key)!.add(fn)
  return () => loadingCallbacks.get(key)?.delete(fn)
}

export function audioAvailable(): boolean {
  return typeof window !== "undefined"
}

/** The locale the manifest assigned to a key (its natural curriculum). */
function contentLocale(
  key: string,
  canonicalKey: string
): VoiceLocale | undefined {
  return (localeByKey.get(key) ?? localeByKey.get(canonicalKey)) as
    VoiceLocale | undefined
}

/**
 * The voice locale follows the active Exam Program (settings.activeExamType):
 *   hsk → zh-CN, tocfl → zh-TW.
 * This guarantees a single, consistent voice per exam — no more mismatches
 * where the same word sounded Taiwanese on one page and Mainland on another.
 *
 * - Manifest-backed keys: the Exam Program drives the locale.
 * - Raw text (no key): follow the exam, but traditional script still needs a
 *   Taiwanese voice.
 */
function effectiveLocale(
  key: string,
  canonicalKey: string,
  text: string
): VoiceLocale {
  const examLocale = localeForExam(useSettings.getState().activeExamType)
  if (contentLocale(key, canonicalKey)) return examLocale
  if (detectLocale(text) === "zh-TW") return "zh-TW"
  return examLocale
}

function resolveCanonicalKey(key: string): string {
  if (audioPathByKey.has(key)) return audioPathByKey.get(key)!
  if (textByKey.has(key)) return key
  const sameTextKeys = keysByText.get(key)
  if (sameTextKeys && sameTextKeys.length > 0) {
    const canonical = sameTextKeys.find((k) => !audioPathByKey.has(k))
    return canonical ?? sameTextKeys[0]
  }
  return key
}

export async function preloadAudio(
  key: string,
  locale?: VoiceLocale,
  gender?: VoiceGender
): Promise<HTMLAudioElement> {
  await ensureAudioManifest()
  const canonicalKey = resolveCanonicalKey(key)
  const text = textByKey.get(canonicalKey) ?? canonicalKey
  const resolvedLocale = effectiveLocale(key, canonicalKey, text)
  const genderKey = gender ?? useSettings.getState().voiceGender ?? "female"
  const cacheKey = `${canonicalKey}__${resolvedLocale}__${genderKey}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)!

  const lockKey = cacheKey
  const existingLock = preloadLocks.get(lockKey)
  if (existingLock) return existingLock

  const promise = (async () => {
    emitKeyLoading(key, true)

    const urlCacheKey = `${text}::${resolvedLocale}::${genderKey}`
    let lastError: Error | null = null

    // Step a: use a previously resolved URL (from backend, CDN, or persistent cache)
    const cachedUrl =
      urlCache.get(urlCacheKey) ?? persistentCache.get(urlCacheKey)
    if (cachedUrl) {
      try {
        const audio = await loadAudio(cachedUrl, cacheKey)
        urlCache.set(urlCacheKey, cachedUrl)
        emitKeyLoading(key, false)
        return audio
      } catch (err) {
        urlCache.delete(urlCacheKey)
        persistentCache.delete(urlCacheKey)
        savePersistentCache()
        lastError = err as Error
      }
    }

    // Step b: manifest-backed keys → try storage directly (no backend TTS synth).
    // This is the primary path for curriculum content in production.
    if (hasManifestMedia() && textByKey.has(canonicalKey)) {
      const locales = new Set<VoiceLocale>([resolvedLocale])
      const natural = contentLocale(key, canonicalKey)
      if (natural && natural !== resolvedLocale) locales.add(natural)
      for (const l of locales) {
        try {
          const url = cdnAudioUrl(canonicalKey, l, genderKey)
          const audio = await loadAudio(url, cacheKey)
          urlCache.set(urlCacheKey, url)
          persistentCache.set(urlCacheKey, url)
          savePersistentCache()
          emitKeyLoading(key, false)
          return audio
        } catch (err) {
          lastError = err as Error
        }
      }
    }

    // Step c: resolve on-demand via Go backend, then verify the URL loads.
    // Only cache the URL after a successful load so invalid dev URLs (no R2)
    // fall through to static instead of being reused.
    try {
      const { url } = await resolveTtsUrl(text, resolvedLocale, genderKey)
      try {
        const audio = await loadAudio(url, cacheKey)
        urlCache.set(urlCacheKey, url)
        persistentCache.set(urlCacheKey, url)
        savePersistentCache()
        emitKeyLoading(key, false)
        return audio
      } catch (err) {
        lastError = err as Error
      }
    } catch (err) {
      lastError = err as Error
    }

    // Step d: static fallback (only for manifest-backed keys — raw text such
    // as "马" never has a static file). The Exam Program drives the primary
    // locale; the content's natural manifest locale is tried second, so
    // TOCFL-only material still reads Taiwanese while studying HSK (and the
    // reverse). No other cross-locale fallback.
    if (textByKey.has(canonicalKey)) {
      const locales = new Set<VoiceLocale>([resolvedLocale])
      const natural = contentLocale(key, canonicalKey)
      if (natural && natural !== resolvedLocale) locales.add(natural)
      for (const l of locales) {
        try {
          const url = audioUrl(canonicalKey, l, genderKey)
          const audio = await loadAudio(url, cacheKey)
          urlCache.set(urlCacheKey, url)
          persistentCache.set(urlCacheKey, url)
          savePersistentCache()
          emitKeyLoading(key, false)
          return audio
        } catch (err) {
          lastError = err as Error
        }
      }
    }

    emitKeyLoading(key, false)
    throw lastError ?? new Error(`Audio not found: ${canonicalKey}`)
  })()

  preloadLocks.set(lockKey, promise)
  // The `finally`-derived promise inherits the rejection, so it needs its own
  // catch to avoid an unhandledRejection when audio cannot be loaded.
  promise.finally(() => preloadLocks.delete(lockKey)).catch(() => {})
  // Defensive: ignore the rejection if a caller never awaits preloadAudio.
  promise.catch(() => {})
  return promise
}

function loadAudio(url: string, cacheKey: string): Promise<HTMLAudioElement> {
  const audio = new Audio()
  return new Promise((resolve, reject) => {
    const onCanPlay = () => {
      audio.removeEventListener("canplaythrough", onCanPlay)
      audio.removeEventListener("error", onError)
      cache.set(cacheKey, audio)
      resolve(audio)
    }
    const onError = () => {
      audio.removeEventListener("canplaythrough", onCanPlay)
      audio.removeEventListener("error", onError)
      reject(new Error(`Audio not found: ${url}`))
    }
    audio.addEventListener("canplaythrough", onCanPlay, { once: true })
    audio.addEventListener("error", onError, { once: true })
    audio.preload = "auto"
    audio.src = url
    audio.load()
  })
}

export async function play(
  key: string,
  opts: AudioOpts = {},
  locale?: VoiceLocale,
  gender?: VoiceGender
) {
  if (!audioAvailable()) {
    opts.onError?.()
    return
  }

  const genderKey = gender ?? useSettings.getState().voiceGender ?? "female"
  const rate = opts.rate ?? 1

  // Same audio still loaded: apply the (possibly new) rate and replay.
  if (
    currentAudio.el &&
    currentAudio.key === key &&
    currentAudio.locale === locale &&
    currentAudio.gender === genderKey
  ) {
    currentAudio.el.playbackRate = rate
    currentAudio.el.currentTime = 0
    currentAudio.el.play().catch(() => opts.onError?.())
    return
  }

  stop()

  opts.onLoadingChange?.(true)

  try {
    const audio = await preloadAudio(key, locale, genderKey)
    audio.playbackRate = rate
    currentAudio.el = audio
    currentAudio.key = key
    currentAudio.locale = locale ?? null
    currentAudio.gender = genderKey

    audio.onended = () => {
      currentAudio.el = null
      currentAudio.key = null
      currentAudio.locale = null
      currentAudio.gender = null
      opts.onEnd?.()
    }

    audio.onerror = () => {
      currentAudio.el = null
      currentAudio.key = null
      currentAudio.locale = null
      currentAudio.gender = null
      opts.onLoadingChange?.(false)
      opts.onError?.()
    }

    await audio.play()
    opts.onLoadingChange?.(false)
  } catch {
    currentAudio.el = null
    currentAudio.key = null
    currentAudio.locale = null
    currentAudio.gender = null
    opts.onLoadingChange?.(false)
    opts.onError?.()
  }
}

export function stop() {
  if (currentAudio.el) {
    currentAudio.el.pause()
    currentAudio.el.currentTime = 0
    currentAudio.el.onended = null
    currentAudio.el.onerror = null
    currentAudio.el = null
    currentAudio.key = null
  }
}

export function speechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window
}

export function speak(text: string, opts: AudioOpts = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return

  window.speechSynthesis.cancel()

  const utter = new SpeechSynthesisUtterance(text)
  const lang = opts.lang ?? "zh-CN"
  utter.lang = lang

  const cached = (
    globalThis as unknown as { __cachedVoice?: SpeechSynthesisVoice }
  ).__cachedVoice

  if (cached) {
    utter.voice = cached
  } else {
    const voices = window.speechSynthesis.getVoices()
    const picked =
      voices.find((v) => v.lang === lang && v.localService) ??
      voices.find((v) => v.lang === lang) ??
      voices.find((v) => v.lang.startsWith("zh")) ??
      null
    if (picked) {
      utter.voice = picked
      ;(
        globalThis as unknown as { __cachedVoice?: SpeechSynthesisVoice }
      ).__cachedVoice = picked
    }
  }

  utter.rate = opts.rate ?? 0.85
  utter.onend = opts.onEnd ?? null
  window.speechSynthesis.speak(utter)
}
