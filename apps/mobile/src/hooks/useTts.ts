import { useCallback, useEffect, useRef, useState } from "react"
import { File, Directory, Paths } from "expo-file-system"
import {
  configureAudioSession,
  createPlayer,
  removePlayer,
  stopPlayer,
  type AudioStatus,
} from "@/lib/audio"
import { tts } from "@/api/endpoints"
import { resolveMediaUrl } from "@/utils/env"
import { ttsLocaleFor } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import audioManifest from "@/data/audio/audio-manifest.json"
import { type VoiceGender, type VoiceLocale } from "@/data/audio"
import { deriveVoice } from "@/lib/voiceCast"

const CDN_PUBLIC_URL = process.env.EXPO_PUBLIC_AUDIO_CDN_URL ?? ""
const AUDIO_EXT = ".mp3"
const MAX_CACHE_SIZE = 50 * 1024 * 1024 // 50 MB

interface ManifestEntry {
  key: string
  text: string
  locale: string
  examSource?: string
  audioPath?: string
  gender?: VoiceGender
}

const manifestEntries = audioManifest as ManifestEntry[]
const textByKey = new Map<string, string>()
const keysByText = new Map<string, string[]>()
const localeByKey = new Map<string, string>()
const genderByKey = new Map<string, VoiceGender>()
for (const entry of manifestEntries) {
  textByKey.set(entry.key, entry.text)
  localeByKey.set(entry.key, entry.locale)
  if (entry.gender === "female" || entry.gender === "male") {
    genderByKey.set(entry.key, entry.gender)
  }
  const existing = keysByText.get(entry.text)
  if (existing) {
    existing.push(entry.key)
  } else {
    keysByText.set(entry.text, [entry.key])
  }
}

function resolveCanonicalKey(key: string): string {
  if (keysByText.has(key)) {
    const sameTextKeys = keysByText.get(key)!
    const canonical = sameTextKeys.find(
      (k) => !textByKey.get(k)!.startsWith("vocab:")
    )
    return canonical ?? sameTextKeys[0]
  }
  return key
}

function cacheDir(): Directory {
  return new Directory(Paths.document, "audio-cache")
}

function cacheFile(
  key: string,
  locale: VoiceLocale,
  gender: VoiceGender
): File {
  return new File(cacheDir(), `${key}__${locale}__${gender}${AUDIO_EXT}`)
}

function cdnAudioUrl(
  key: string,
  locale: VoiceLocale,
  gender: VoiceGender
): string {
  const base = CDN_PUBLIC_URL.replace(/\/+$/, "")
  return `${base}/audio/${key}__${locale}__${gender}${AUDIO_EXT}`
}

async function ensureCacheDir(): Promise<void> {
  const dir = cacheDir()
  if (!dir.exists) {
    dir.create({ intermediates: true })
  }
}

async function evictCacheIfNeeded(): Promise<void> {
  try {
    const dir = cacheDir()
    if (!dir.exists) return
    const items = dir.list()
    if (items.length === 0) return
    let totalSize = 0
    const files: { file: File; size: number }[] = []
    for (const item of items) {
      if (item instanceof File) {
        totalSize += item.size
        files.push({ file: item, size: item.size })
      }
    }
    if (totalSize <= MAX_CACHE_SIZE) return
    files.sort((a, b) => a.size - b.size)
    let freed = 0
    for (const { file } of files) {
      if (totalSize - freed <= MAX_CACHE_SIZE * 0.8) break
      file.delete()
      freed += file.size
    }
  } catch {
    // ignore eviction errors
  }
}

/**
 * TTS hook with CDN-first fallback chain for mobile.
 *
 * Resolution order:
 *   1. Local file cache (expo-file-system)
 *   2. CDN direct URL (for manifest-backed keys)
 *   3. Backend TTS endpoint (POST /tts) — fallback for dynamic content
 */
export function useTts() {
  const soundRef = useRef<any>(null)
  const playIdRef = useRef(0) // increments on each play() call to discard stale status updates
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const language = useOnboardingStore((s) => s.language)

  useEffect(() => {
    configureAudioSession()

    return () => {
      if (soundRef.current) removePlayer(soundRef.current)
    }
  }, [])

  /**
   * Try one CDN object, then cache it for offline use. Returns false when the
   * object is absent so the caller can fall through — the derived gender is
   * wrong for passage narration, which the publisher casts per passage.
   */
  const playFromCdn = useCallback(
    async (
      key: string,
      locale: VoiceLocale,
      gender: VoiceGender,
      playId: number
    ): Promise<boolean> => {
      if (!CDN_PUBLIC_URL) return false
      const localFile = cacheFile(key, locale, gender)
      if (localFile.exists) {
        return await streamFile(localFile.uri, playId, true)
      }
      const url = cdnAudioUrl(key, locale, gender)
      const ok = await streamFile(url, playId, false)
      if (!ok) return false
      try {
        await File.downloadFileAsync(url, localFile, { idempotent: true })
        await evictCacheIfNeeded()
      } catch {
        // caching is best-effort, don't block playback
      }
      return true
    },
    [playIdRef]
  )

  const streamFile = useCallback(
    async (uri: string, playId: number, cached: boolean): Promise<boolean> => {
      return await new Promise<boolean>((resolve) => {
        let settled = false
        const sound = createPlayer({ uri }, (status) => {
          if (playId !== playIdRef.current) {
            removePlayer(sound)
            return
          }
          if (!status.isLoaded) {
            if (!settled) {
              settled = true
              resolve(false)
            }
            if (cached && status.error) {
              removePlayer(sound)
              setPlaying(false)
              setError(String(status.error))
            }
            return
          }
          if (!settled) {
            settled = true
            soundRef.current = sound
            setPlaying(true)
            setLoading(false)
            resolve(true)
          }
          if (status.didJustFinish) setPlaying(false)
        })
      })
    },
    []
  )

  const play = useCallback(
    async (text: string, key?: string) => {
      if (!text) return
      const playId = ++playIdRef.current // tag this call
      try {
        setError(null)
        setLoading(true)
        if (soundRef.current) removePlayer(soundRef.current)

        await ensureCacheDir()

        // Voice follows the manifest: fixed gender + natural locale per entry.
        // Raw/dynamic text falls back to the current learning language locale.
        const canonicalKey = resolveCanonicalKey(text)
        const locale = (localeByKey.get(canonicalKey) ??
          ttsLocaleFor(language)) as VoiceLocale
        const genderKey: VoiceGender = genderByKey.get(canonicalKey) ?? "female"
        const manifestText = textByKey.get(canonicalKey)
        const isManifestBacked = manifestText !== undefined

        // Step 0: the publisher's casting is a pure function of the key, so a
        // caller that knows the key can build the CDN URL without the manifest.
        // The bundled manifest covers 0.22% of entries and none of de/ja/en, so
        // this is the only path that reaches the CDN for those languages.
        if (key) {
          const derived = await deriveVoice(key, language)
          if (derived) {
            const dKey = `${key}__${derived.locale}__${derived.gender}`
            const played = await playFromCdn(
              dKey,
              derived.locale as VoiceLocale,
              derived.gender,
              playId
            )
            if (played) return
          }
        }

        // Step 1: local file cache
        const localFile = cacheFile(canonicalKey, locale, genderKey)
        if (localFile.exists) {
          const sound = createPlayer({ uri: localFile.uri }, (status) => {
            if (playId !== playIdRef.current) return
            if (!status.isLoaded) {
              if (status.error) {
                setPlaying(false)
                setError(String(status.error))
              }
              return
            }
            if (status.didJustFinish) setPlaying(false)
          })
          if (playId !== playIdRef.current) {
            removePlayer(sound)
            return
          }
          soundRef.current = sound
          setPlaying(true)
          setLoading(false)
          return
        }

        // Step 2: CDN direct URL (manifest-backed keys only)
        if (isManifestBacked && CDN_PUBLIC_URL) {
          const cdnUrl = cdnAudioUrl(canonicalKey, locale, genderKey)
          try {
            const sound = createPlayer({ uri: cdnUrl }, (status) => {
              if (playId !== playIdRef.current) return
              if (!status.isLoaded) {
                if (status.error) {
                  setPlaying(false)
                  setError(String(status.error))
                }
                return
              }
              if (status.didJustFinish) setPlaying(false)
            })
            if (playId !== playIdRef.current) {
              removePlayer(sound)
              return
            }
            soundRef.current = sound
            setPlaying(true)
            // Cache the file locally for offline use
            try {
              await File.downloadFileAsync(cdnUrl, localFile, {
                idempotent: true,
              })
              await evictCacheIfNeeded()
            } catch {
              // caching is best-effort, don't block playback
            }
            setLoading(false)
            return
          } catch {
            // CDN failed, fall through to backend
          }
        }

        // Step 3: backend TTS (fallback for dynamic content or CDN failure)
        const audio = await tts.say(text, locale, genderKey)
        const url = resolveMediaUrl(audio.url)
        if (!url) throw new Error("empty audio url")

        const sound = createPlayer({ uri: url }, (status) => {
          if (playId !== playIdRef.current) return
          if (!status.isLoaded) {
            if (status.error) {
              setPlaying(false)
              setError(String(status.error))
            }
            return
          }
          if (status.didJustFinish) setPlaying(false)
        })
        if (playId !== playIdRef.current) {
          removePlayer(sound)
          return
        }
        soundRef.current = sound
        setPlaying(true)
      } catch (e) {
        setError(e instanceof Error ? e.message : "playback failed")
        setPlaying(false)
      } finally {
        setLoading(false)
      }
    },
    [language]
  )

  const stop = useCallback(() => {
    if (soundRef.current) stopPlayer(soundRef.current)
    setPlaying(false)
  }, [])

  return { play, stop, loading, playing, error }
}
