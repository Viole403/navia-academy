import { useCallback, useEffect, useRef, useState } from "react"
import { Audio } from "expo-av"
import { File, Directory, Paths } from "expo-file-system"
import { tts } from "@/api/endpoints"
import { resolveMediaUrl } from "@/utils/env"
import audioManifest from "@/data/audio/audio-manifest.json"
import {
  detectLocale,
  localeForExam,
  type VoiceGender,
  type VoiceLocale,
} from "@/data/audio"

const CDN_PUBLIC_URL = process.env.EXPO_PUBLIC_AUDIO_CDN_URL ?? ""
const AUDIO_EXT = ".mp3"
const MAX_CACHE_SIZE = 50 * 1024 * 1024 // 50 MB

interface ManifestEntry {
  key: string
  text: string
  locale: string
  examSource?: string
  audioPath?: string
}

const manifestEntries = audioManifest as ManifestEntry[]
const textByKey = new Map<string, string>()
const keysByText = new Map<string, string[]>()
const localeByKey = new Map<string, string>()
for (const entry of manifestEntries) {
  textByKey.set(entry.key, entry.text)
  localeByKey.set(entry.key, entry.locale)
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
  const soundRef = useRef<Audio.Sound | null>(null)
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => {})

    return () => {
      soundRef.current?.unloadAsync().catch(() => {})
    }
  }, [])

  const play = useCallback(async (text: string) => {
    if (!text) return
    try {
      setError(null)
      setLoading(true)
      soundRef.current?.unloadAsync().catch(() => {})

      await ensureCacheDir()

      const locale = localeForExam("hsk")
      const genderKey: VoiceGender = "female"
      const canonicalKey = resolveCanonicalKey(text)
      const manifestText = textByKey.get(canonicalKey)
      const isManifestBacked = manifestText !== undefined

      // Step 1: local file cache
      const localFile = cacheFile(canonicalKey, locale, genderKey)
      if (localFile.exists) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: localFile.uri },
          { shouldPlay: true }
        )
        soundRef.current = sound
        setPlaying(true)
        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) {
            if ("error" in status && status.error) {
              setPlaying(false)
              setError(String(status.error))
            }
            return
          }
          if (status.didJustFinish) setPlaying(false)
        })
        setLoading(false)
        return
      }

      // Step 2: CDN direct URL (manifest-backed keys only)
      if (isManifestBacked && CDN_PUBLIC_URL) {
        const cdnUrl = cdnAudioUrl(canonicalKey, locale, genderKey)
        try {
          const { sound } = await Audio.Sound.createAsync(
            { uri: cdnUrl },
            { shouldPlay: true }
          )
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
          sound.setOnPlaybackStatusUpdate((status) => {
            if (!status.isLoaded) {
              if ("error" in status && status.error) {
                setPlaying(false)
                setError(String(status.error))
              }
              return
            }
            if (status.didJustFinish) setPlaying(false)
          })
          setLoading(false)
          return
        } catch {
          // CDN failed, fall through to backend
        }
      }

      // Step 3: backend TTS (fallback for dynamic content or CDN failure)
      const audio = await tts.say(text)
      const url = resolveMediaUrl(audio.url)
      if (!url) throw new Error("empty audio url")

      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }
      )
      soundRef.current = sound
      setPlaying(true)
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) {
          if ("error" in status && status.error) {
            setPlaying(false)
            setError(String(status.error))
          }
          return
        }
        if (status.didJustFinish) setPlaying(false)
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "playback failed")
      setPlaying(false)
    } finally {
      setLoading(false)
    }
  }, [])

  const stop = useCallback(async () => {
    await soundRef.current?.stopAsync().catch(() => {})
    setPlaying(false)
  }, [])

  return { play, stop, loading, playing, error }
}
