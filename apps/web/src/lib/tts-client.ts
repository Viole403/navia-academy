const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080"
).replace(/\/+$/, "");

export interface TtsResolveResult {
  url: string;
  provider?: string;
}

export interface TtsResolveError extends Error {
  status?: number;
}

/**
 * Resolve an audio URL for the given text from the Go/Fiber backend.
 *
 * The backend checks the Postgres `audio_cache` table for existing audio, or
 * synthesizes on-demand (engine: edge/google/azure) and uploads it to storage.
 * Repeated calls for the same text are cheap (cached).
 * `audio.ts` falls back to CDN/static files when this rejects.
 */
export async function resolveTtsUrl(
  text: string,
  locale?: string,
  gender?: string,
): Promise<TtsResolveResult> {
  const res = await fetch(`${API_BASE_URL}/api/v1/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      locale: locale ?? "zh-CN",
      gender: gender ?? "female",
    }),
  });

  if (!res.ok) {
    const err = new Error(`TTS resolve failed: ${res.status}`) as TtsResolveError;
    err.status = res.status;
    throw err;
  }

  // Backend response format: { url, text, locale, gender, provider }
  const raw = (await res.json()) as {
    url: string;
    text: string;
    locale: string;
    gender: string;
    provider: string;
  };

  if (!raw.url) {
    const err = new Error(
      `TTS resolve failed: no URL returned (${res.status})`,
    ) as TtsResolveError;
    err.status = res.status;
    throw err;
  }

  return { url: raw.url, provider: raw.provider };
}
