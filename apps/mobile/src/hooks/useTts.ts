import { useCallback, useEffect, useRef, useState } from "react";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { tts } from "@/api/endpoints";
import { resolveMediaUrl } from "@/utils/env";
import audioManifest from "@/data/audio/audio-manifest.json";
import { detectLocale, localeForExam, type VoiceGender, type VoiceLocale } from "@/data/audio";

const CDN_PUBLIC_URL = process.env.EXPO_PUBLIC_AUDIO_CDN_URL ?? "";
const AUDIO_EXT = ".mp3";
const CACHE_DIR = FileSystem.documentDirectory + "audio-cache/";
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50 MB

interface ManifestEntry {
  key: string;
  text: string;
  locale: string;
  examSource?: string;
  audioPath?: string;
}

const manifestEntries = audioManifest as ManifestEntry[];
const textByKey = new Map<string, string>();
const keysByText = new Map<string, string[]>();
const localeByKey = new Map<string, string>();
for (const entry of manifestEntries) {
  textByKey.set(entry.key, entry.text);
  localeByKey.set(entry.key, entry.locale);
  const existing = keysByText.get(entry.text);
  if (existing) {
    existing.push(entry.key);
  } else {
    keysByText.set(entry.text, [entry.key]);
  }
}

function resolveCanonicalKey(key: string): string {
  if (keysByText.has(key)) {
    const sameTextKeys = keysByText.get(key)!;
    const canonical = sameTextKeys.find((k) => !textByKey.get(k)!.startsWith("vocab:"));
    return canonical ?? sameTextKeys[0];
  }
  return key;
}

function cdnAudioUrl(key: string, locale: VoiceLocale, gender: VoiceGender): string {
  const base = CDN_PUBLIC_URL.replace(/\/+$/, "");
  return `${base}/audio/${key}__${locale}__${gender}${AUDIO_EXT}`;
}

function cacheFilePath(key: string, locale: VoiceLocale, gender: VoiceGender): string {
  return CACHE_DIR + `${key}__${locale}__${gender}${AUDIO_EXT}`;
}

async function ensureCacheDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

async function evictCacheIfNeeded(): Promise<void> {
  try {
    const dir = await FileSystem.readDirectoryAsync(CACHE_DIR);
    if (dir.length === 0) return;
    let totalSize = 0;
    const files: { name: string; size: number; uri: string }[] = [];
    for (const name of dir) {
      const info = await FileSystem.getInfoAsync(CACHE_DIR + name);
      if (info.exists && "size" in info) {
        totalSize += info.size as number;
        files.push({ name, size: info.size as number, uri: CACHE_DIR + name });
      }
    }
    if (totalSize <= MAX_CACHE_SIZE) return;
    files.sort((a, b) => a.size - b.size);
    let freed = 0;
    for (const file of files) {
      if (totalSize - freed <= MAX_CACHE_SIZE * 0.8) break;
      await FileSystem.deleteAsync(file.uri, { idempotent: true });
      freed += file.size;
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
  const soundRef = useRef<Audio.Sound | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => {});

    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const play = useCallback(async (text: string) => {
    if (!text) return;
    try {
      setError(null);
      setLoading(true);
      soundRef.current?.unloadAsync().catch(() => {});

      await ensureCacheDir();

      const locale = localeForExam("hsk");
      const genderKey: VoiceGender = "female";
      const canonicalKey = resolveCanonicalKey(text);
      const manifestText = textByKey.get(canonicalKey);
      const isManifestBacked = manifestText !== undefined;

      // Step 1: local file cache
      const localPath = cacheFilePath(canonicalKey, locale, genderKey);
      const localInfo = await FileSystem.getInfoAsync(localPath);
      if (localInfo.exists) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: localPath },
          { shouldPlay: true },
        );
        soundRef.current = sound;
        setPlaying(true);
        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) {
            if ("error" in status && status.error) {
              setPlaying(false);
              setError(String(status.error));
            }
            return;
          }
          if (status.didJustFinish) setPlaying(false);
        });
        setLoading(false);
        return;
      }

      // Step 2: CDN direct URL (manifest-backed keys only)
      if (isManifestBacked && CDN_PUBLIC_URL) {
        const cdnUrl = cdnAudioUrl(canonicalKey, locale, genderKey);
        try {
          const { sound } = await Audio.Sound.createAsync(
            { uri: cdnUrl },
            { shouldPlay: true },
          );
          soundRef.current = sound;
          setPlaying(true);
          // Cache the file locally for offline use
          try {
            const downloadRes = await FileSystem.downloadAsync(cdnUrl, localPath);
            if (downloadRes.status === 200) {
              await evictCacheIfNeeded();
            }
          } catch {
            // caching is best-effort, don't block playback
          }
          sound.setOnPlaybackStatusUpdate((status) => {
            if (!status.isLoaded) {
              if ("error" in status && status.error) {
                setPlaying(false);
                setError(String(status.error));
              }
              return;
            }
            if (status.didJustFinish) setPlaying(false);
          });
          setLoading(false);
          return;
        } catch {
          // CDN failed, fall through to backend
        }
      }

      // Step 3: backend TTS (fallback for dynamic content or CDN failure)
      const audio = await tts.say(text);
      const url = resolveMediaUrl(audio.url);
      if (!url) throw new Error("empty audio url");

      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
      );
      soundRef.current = sound;
      setPlaying(true);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) {
          if ("error" in status && status.error) {
            setPlaying(false);
            setError(String(status.error));
          }
          return;
        }
        if (status.didJustFinish) setPlaying(false);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "playback failed");
      setPlaying(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const stop = useCallback(async () => {
    await soundRef.current?.stopAsync().catch(() => {});
    setPlaying(false);
  }, []);

  return { play, stop, loading, playing, error };
}
