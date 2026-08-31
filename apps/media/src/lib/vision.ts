/**
 * Vision check (image-vs-concept validation) key pool.
 *
 * Uses the SAME pool mechanism as image generation (`image_api_keys` table,
 * see image-keys.ts): keys edited in the dashboard /keys tab, rotated
 * round-robin, per-key cooldown on rate-limit errors, multi-provider.
 *
 * The vision provider is chosen independently of the generation provider
 * (`MEDIA_VISION_PROVIDER`, default `gemini`) — validation keys live in the
 * same table under their own provider, so a cloudflare generation pool does
 * not collide with a gemini vision key.
 *
 * Supported vision providers:
 *  - `gemini`  — native generateContent (default, free vision)
 *  - `openai`  — OpenAI-compatible chat completions with image_url
 *  - `cloudflare` — Workers AI vision model (e.g. llama vision-instruct)
 *
 * Fallback: `GEMINI_API_KEY` / `MEDIA_IMAGE_API_KEY` env when the DB has no
 * key for the vision provider.
 */

import type { MediaConfig } from "./config"
import type { ImageKeySpec } from "./image"
import { readMediaSettings } from "./settings"
import {
  dbConfigured,
  fetchPoolRows,
  patchPoolRowByProviderName,
  isRateLimitError,
  errMessage,
  cooldownMs,
  type PooledRow,
} from "./key-pool"

export interface VisionVerdict {
  match: boolean
  reason: string
}

export interface VisionPoolRow extends PooledRow {
  api_base_url?: string | null
  model?: string | null
  cf_account_id?: string | null
}

const POOL_TABLE = "image_api_keys"
const COOLDOWN_ENV = process.env.MEDIA_VISION_KEY_COOLDOWN_MS
const DEFAULT_PROVIDER = "gemini"

let poolCache: { keys: VisionPoolRow[]; fetchedAt: number } | null = null
const roundRobin: Record<string, number> = {}

export async function visionProvider(): Promise<string> {
  const envVal = process.env.MEDIA_VISION_PROVIDER
  if (envVal) return envVal
  try {
    const overrides = await readMediaSettings()
    return overrides.visionProvider || DEFAULT_PROVIDER
  } catch {
    return DEFAULT_PROVIDER
  }
}

function toSpec(k: VisionPoolRow): ImageKeySpec {
  return {
    provider: k.provider,
    name: k.name,
    apiKey: k.api_key,
    apiBaseUrl: k.api_base_url || undefined,
    model: k.model || undefined,
    cfAccountId: k.cf_account_id || undefined,
  }
}

/** Enabled keys for the vision provider, minus any currently in cooldown. */
export async function getVisionPool(provider: string): Promise<ImageKeySpec[]> {
  if (dbConfigured()) {
    try {
      if (!poolCache || Date.now() - poolCache.fetchedAt > 60_000) {
        poolCache = {
          keys: await fetchPoolRows<VisionPoolRow>(POOL_TABLE),
          fetchedAt: Date.now(),
        }
      }
      const now = new Date().toISOString()
      const active = poolCache.keys
        .filter((k) => k.enabled && k.provider === provider)
        .filter((k) => !k.cooldown_until || k.cooldown_until <= now)
      if (active.length > 0) return active.map(toSpec)
      console.warn(
        `  ⚠ No enabled ${provider} vision keys in the pool — falling back to env`
      )
    } catch (err) {
      console.warn(
        `  ⚠ image_api_keys fetch failed (${errMessage(err)}) — falling back to env`
      )
    }
  }
  return [
    {
      provider: "gemini",
      name: "env",
      apiKey:
        process.env.GEMINI_API_KEY || process.env.MEDIA_IMAGE_API_KEY || "",
    },
  ]
}

function buildPrompt(concept: string): string {
  return [
    `You are checking illustrations for a language-learning app.`,
    `The illustration below was generated for the word/phrase "${concept}".`,
    `Does the illustration clearly depict "${concept}"?`,
    `- If yes, answer exactly: MATCH`,
    `- If no or ambiguous, answer exactly: MISMATCH: <short reason in 1 sentence>`,
    ``,
    `Never mention the image itself, just the verdict.`,
  ].join("\n")
}

function parseVerdict(text: string): VisionVerdict {
  const t = (text ?? "").trim()
  if (/^MATCH$/i.test(t)) return { match: true, reason: "" }
  const reason = t.replace(/^MISMATCH:?\s*/i, "").trim() || t || "(no verdict)"
  return { match: false, reason }
}

/** Gemini native vision (free tier available). */
async function geminiVision(
  key: ImageKeySpec,
  prompt: string,
  image: Buffer,
  mime: string
): Promise<string> {
  const base = (
    key.apiBaseUrl ||
    process.env.MEDIA_IMAGE_GEMINI_BASE_URL ||
    "https://generativelanguage.googleapis.com/v1beta"
  ).replace(/\/+$/, "")
  const model =
    key.model ||
    process.env.GEMINI_MODEL ||
    process.env.MEDIA_IMAGE_GEMINI_MODEL ||
    "gemini-2.5-flash"
  const res = await fetch(
    `${base}/models/${model}:generateContent?key=${encodeURIComponent(key.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: { mimeType: mime, data: image.toString("base64") },
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    }
  )
  if (!res.ok)
    throw new Error(`Gemini vision ${res.status}: ${await res.text()}`)
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
}

/** OpenAI-compatible vision via chat completions with image_url. */
async function openaiVision(
  key: ImageKeySpec,
  prompt: string,
  image: Buffer,
  mime: string
): Promise<string> {
  const base = (
    key.apiBaseUrl ||
    process.env.MEDIA_IMAGE_API_BASE_URL ||
    "https://api.openai.com/v1"
  ).replace(/\/+$/, "")
  const model =
    key.model || process.env.MEDIA_VISION_OPENAI_MODEL || "gpt-4o-mini"
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${mime};base64,${image.toString("base64")}`,
              },
            },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) throw new Error(`Vision API ${res.status}: ${await res.text()}`)
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  return data.choices?.[0]?.message?.content ?? ""
}

/** Cloudflare Workers AI vision model (e.g. llama vision-instruct). */
async function cloudflareVision(
  key: ImageKeySpec,
  prompt: string,
  image: Buffer
): Promise<string> {
  const account = key.cfAccountId || process.env.MEDIA_IMAGE_CF_ACCOUNT_ID
  const model =
    key.model ||
    process.env.MEDIA_VISION_CF_MODEL ||
    "@cf/meta/llama-3.2-11b-vision-instruct-wasi"
  if (!account || !key.apiKey)
    throw new Error("Cloudflare vision: account id / token not set")
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key.apiKey}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image: image.toString("base64") },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    }
  )
  if (!res.ok)
    throw new Error(`Cloudflare vision ${res.status}: ${await res.text()}`)
  const data = (await res.json()) as { result?: { response?: string } }
  return data.result?.response ?? ""
}

async function visionCall(
  key: ImageKeySpec,
  prompt: string,
  image: Buffer,
  mime: string
): Promise<string> {
  const p = key.provider
  if (p === "openai") return openaiVision(key, prompt, image, mime)
  if (p === "cloudflare") return cloudflareVision(key, prompt, image)
  return geminiVision(key, prompt, image, mime)
}

/** Mark a key used (success) or on cooldown (rate-limit failure). Env keys are never persisted. */
async function reportVisionStatus(
  key: ImageKeySpec,
  err?: unknown
): Promise<void> {
  if (key.name === "env" || !dbConfigured()) return
  const patch: Partial<VisionPoolRow> = {
    last_used_at: new Date().toISOString(),
  }
  if (err) {
    patch.last_error = errMessage(err)
    if (isRateLimitError(err)) {
      patch.cooldown_until = new Date(
        Date.now() + cooldownMs(COOLDOWN_ENV)
      ).toISOString()
      console.warn(
        `  ⏳ ${key.provider}:${key.name} rate-limited — cooldown ${cooldownMs(COOLDOWN_ENV) / 1000}s`
      )
    }
  }
  await patchPoolRowByProviderName(
    POOL_TABLE,
    key.provider,
    key.name,
    patch as Record<string, unknown>
  ).catch(() => undefined)
}

/**
 * Check whether an image depicts the concept, rotating round-robin across the
 * vision pool and retrying with the next key on a rate-limit failure.
 */
export async function checkImageWithRotation(
  cfg: MediaConfig,
  concept: string,
  image: Buffer,
  mime: string
): Promise<VisionVerdict> {
  void cfg
  const provider = await visionProvider()
  const pool = await getVisionPool(provider)
  const attempts = pool.length
  const prompt = buildPrompt(concept)

  let lastErr: Error | undefined
  for (let i = 0; i < attempts; i++) {
    const idx = (roundRobin[provider] ?? 0) % pool.length
    roundRobin[provider] = idx + 1
    const key = pool[idx]
    try {
      const text = await visionCall(key, prompt, image, mime)
      await reportVisionStatus(key)
      return parseVerdict(text)
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err))
      await reportVisionStatus(key, err)
      if (!isRateLimitError(err)) throw lastErr
      console.warn(`  → retrying with next vision key (${i + 1}/${attempts})`)
    }
  }
  throw (
    lastErr ?? new Error(`Vision check failed: no keys left for ${provider}`)
  )
}

/** Drop the cached pool (used by tests / dashboard after edits). */
export function resetVisionPoolCache(): void {
  poolCache = null
}
