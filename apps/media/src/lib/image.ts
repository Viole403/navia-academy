import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import type { MediaConfig } from "./config"

/**
 * A single usable API key for image generation. Carries everything a provider
 * call needs (key, optional base URL / model override, and the Cloudflare
 * account id). Pool entries come from the `image_api_keys` DB table
 * (see image-keys.ts) or from the flat env fallback below.
 */
export interface ImageKeySpec {
  provider: string
  name: string
  apiKey: string
  apiBaseUrl?: string
  model?: string
  cfAccountId?: string
}

/**
 * Build a single-key spec from the legacy flat env config. Used when the DB
 * key store is not configured — keeps old `.env.local`-only setups working.
 */
export function legacyImageKey(cfg: MediaConfig): ImageKeySpec {
  return {
    provider: cfg.imageProvider,
    name: "env",
    apiKey: cfg.imageApiKey,
    apiBaseUrl: cfg.imageApiBaseUrl,
    model: cfg.imageModel,
    cfAccountId: cfg.imageCfAccountId,
  }
}

/** Generate a PNG illustration for a prompt via the chosen provider + key spec. */
export async function generateImage(
  cfg: MediaConfig,
  prompt: string,
  key: ImageKeySpec
): Promise<Buffer> {
  const p = key.provider || cfg.imageProvider
  if (p === "gemini") return geminiImage(cfg, prompt, key)
  if (p === "deepai") return deepaiImage(cfg, prompt, key)
  if (p === "cloudflare") return cloudflareImage(cfg, prompt, key)
  return openaiImage(cfg, prompt, key)
}

/**
 * Cloudflare Workers AI — image models like @cf/black-forest-labs/flux-1-schnell.
 * Needs: MEDIA_IMAGE_CF_ACCOUNT_ID + MEDIA_IMAGE_CF_API_TOKEN (Workers AI token).
 * Endpoint: /accounts/{account_id}/ai/run/{model} → { result: { image: base64 } }.
 * The NSFW gate (code 3030) is known to false-positive on innocuous prompts;
 * retrying the same prompt usually passes, so we retry before giving up.
 */
async function cloudflareImage(
  cfg: MediaConfig,
  prompt: string,
  key: ImageKeySpec
): Promise<Buffer> {
  // flux-1-schnell TIDAK menerima width/height (hanya prompt/steps/seed) — ukuran
  // dikendalikan via Layer 2 (sharp post-compress). Migrasi ke flux-2-klein
  // (model Workers AI yang support width/height 256–1920) = opsi terpisah di
  // masa depan; BUKAN Cloudflare Images delivery transform.
  const account = key.cfAccountId || cfg.imageCfAccountId
  const token = key.apiKey || cfg.imageCfApiToken
  const model = key.model || cfg.imageCfModel
  if (!account || !token)
    throw new Error("Cloudflare: MEDIA_IMAGE_CF_ACCOUNT_ID / API token not set")
  const MAX_ATTEMPTS = 3
  let lastErr: Error | undefined
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ prompt }),
          signal: AbortSignal.timeout(120_000),
        }
      )
      if (!res.ok) {
        const body = await res.text()
        console.error(`[image] Cloudflare Workers AI ${res.status}: ${body}`)
        throw new Error(`Cloudflare Workers AI ${res.status}`)
      }
      const j = (await res.json()) as {
        result?: { image?: string }
        errors?: unknown[]
      }
      if (!j.result?.image)
        throw new Error("Cloudflare Workers AI returned no image")
      return Buffer.from(j.result.image, "base64")
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err))
      const nsfw = /NSFW|3030/.test(lastErr.message)
      if (attempt < MAX_ATTEMPTS && nsfw) {
        await new Promise((r) => setTimeout(r, 1500 * attempt))
        continue
      }
      throw lastErr
    }
  }
  throw lastErr
}

async function openaiImage(
  cfg: MediaConfig,
  prompt: string,
  key: ImageKeySpec
): Promise<Buffer> {
  const apiKey = key.apiKey || cfg.imageApiKey
  if (!apiKey) throw new Error("OpenAI-compatible: MEDIA_IMAGE_API_KEY not set")
  const base = (key.apiBaseUrl || cfg.imageApiBaseUrl).replace(/\/+$/, "")
  const model = key.model || cfg.imageModel
  // MEDIA_IMAGE_SIZE takes either a square side ("512") or full WxH
  // ("1024x1536"); unset lets the API use its model default.
  const sizeMatch = /^(\d+)(?:[xX](\d+))?$/.exec(
    process.env.MEDIA_IMAGE_SIZE || ""
  )
  const width = sizeMatch ? Number(sizeMatch[1]) : undefined
  const height = sizeMatch?.[2] ? Number(sizeMatch[2]) : undefined
  const body: Record<string, unknown> = { model, prompt, n: 1 }
  if (/^gpt-image/.test(model)) {
    // GPT image models reject `response_format` (they always return b64_json)
    // and only accept 1024x1024 | 1536x1024 | 1024x1536 | auto for size.
    body.size = width && height ? `${width}x${height}` : "auto"
  } else {
    body.size = width ? `${width}x${height ?? width}` : "512x512"
    body.response_format = "b64_json"
  }
  const res = await fetch(`${base}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  })
  if (!res.ok) {
    const body = await res.text()
    console.error(`[image] OpenAI-compatible ${res.status}: ${body}`)
    throw new Error(`Image API ${res.status}`)
  }
  const data = (await res.json()) as {
    data?: { b64_json?: string; url?: string }[]
  }
  const item = data.data?.[0]
  if (!item) throw new Error("Image API returned no data")
  if (item.b64_json) return Buffer.from(item.b64_json, "base64")
  if (item.url) {
    const img = await fetch(item.url)
    return Buffer.from(await img.arrayBuffer())
  }
  throw new Error("Image API returned no image")
}

async function geminiImage(
  cfg: MediaConfig,
  prompt: string,
  key: ImageKeySpec
): Promise<Buffer> {
  const apiKey = key.apiKey || cfg.imageApiKey
  if (!apiKey) throw new Error("Gemini: MEDIA_IMAGE_API_KEY not set")
  const base = (
    key.apiBaseUrl ||
    process.env.MEDIA_IMAGE_GEMINI_BASE_URL ||
    "https://generativelanguage.googleapis.com/v1beta"
  ).replace(/\/+$/, "")
  const model =
    key.model ||
    process.env.MEDIA_IMAGE_GEMINI_MODEL ||
    "gemini-3.1-flash-image"
  const size = process.env.MEDIA_IMAGE_SIZE || "512"
  // imageSize hanya didukung gemini-3.1-flash-image / gemini-3-pro-image;
  // model lama (2.5-flash-image) hanya terima aspectRatio.
  const imageFormat: Record<string, string> = { aspectRatio: "1:1" }
  if (/3-pro-image|3\.1-flash-image/.test(model)) imageFormat.imageSize = size
  const res = await fetch(
    `${base}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          responseFormat: { image: imageFormat },
        },
      }),
      signal: AbortSignal.timeout(120_000),
    }
  )
  if (!res.ok) {
    const body = await res.text()
    console.error(`[image] Gemini ${res.status}: ${body}`)
    throw new Error(`Gemini image ${res.status}`)
  }
  const data = (await res.json()) as {
    candidates?: {
      content?: { parts?: { inlineData?: { data?: string } }[] }
    }[]
  }
  const part = data.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData?.data
  )
  if (!part?.inlineData?.data) throw new Error("Gemini image returned no data")
  return Buffer.from(part.inlineData.data, "base64")
}

const DEEPAI_DEFAULT_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
/**
 * DeepAI's inline hasher (from the try-it script on deepai.org): standard MD5
 * hex digest with the string REVERSED. Cross-validated against the live
 * browser key and the public reverse-engineering of the same flow.
 */
function deepaiHash(input: string): string {
  return createHash("md5")
    .update(input, "utf8")
    .digest("hex")
    .split("")
    .reverse()
    .join("")
}

/**
 * Anonymous DeepAI web-UI "try it" API key, reverse-engineered from the inline
 * try-it script on deepai.org (verified Aug 2026):
 *
 *   H(x) = md5(x) hex, reversed
 *   key  = "tryit-" + rand + "-" + H(ua + H(ua + H(ua + rand + salt)))
 *
 * This is what the browser uses for free anonymous generation (quota per IP);
 * the request MUST send the same User-Agent header used to build the key.
 * DeepAI may rotate the salt/endpoint anytime — override via
 * `MEDIA_IMAGE_DEEPAI_SALT` / `MEDIA_IMAGE_DEEPAI_UA` / `MEDIA_IMAGE_DEEPAI_ENDPOINT`.
 */
function deepaiTryitKey(userAgent: string, salt: string): string {
  const rand = String(Math.round(Math.random() * 100_000_000_000))
  const inner = deepaiHash(userAgent + rand + salt)
  const mid = deepaiHash(userAgent + inner)
  const outer = deepaiHash(userAgent + mid)
  return `tryit-${rand}-${outer}`
}

/** Raised when DeepAI's anti-bot gate refuses a plain-HTTP client (non-browser). */
class DeepAIGateError extends Error {}

interface DeepAIResult {
  output_url?: string
  status?: string
  error?: string
  err?: string
  credits_remaining?: number
}

async function deepaiRequest(
  apiUrl: string,
  apiKey: string,
  userAgent: string,
  form: FormData,
  modelPage: string
): Promise<DeepAIResult> {
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "User-Agent": userAgent,
      Referer: modelPage,
      Origin: "https://deepai.org",
    },
    body: form,
    signal: AbortSignal.timeout(120_000),
  })
  const text = await res.text()
  let data: DeepAIResult = {}
  try {
    data = JSON.parse(text) as DeepAIResult
  } catch {
    // non-JSON error body
  }
  if (
    res.status === 401 &&
    /Please try this model on deepai\.org|Please pass a valid Api-Key/i.test(
      text
    )
  ) {
    throw new DeepAIGateError(`DeepAI anti-bot gate: ${text.trim()}`)
  }
  if (!res.ok) {
    console.error(`[image] DeepAI scrape ${res.status}: ${text}`)
    throw new Error(`DeepAI scrape ${res.status}`)
  }
  return data
}

/**
 * Scrape the free DeepAI web-UI generation flow (official API requires a paid
 * DeepAI Pro subscription). Primary path: same `tryit-` key + endpoint the
 * browser calls. DeepAI's anti-bot flags plain-HTTP clients after a few hits
 * (401 "Please try this model on deepai.org") — on that error we fall back to
 * driving a real headless Chrome (puppeteer-core, no bundled browser — uses the
 * system Chrome, which is preinstalled on GitHub-hosted runners). The key is
 * rebuilt over the browser's own User-Agent.
 * Set `MEDIA_IMAGE_DEEPAI_PAID_KEY` to a paid key to bypass the anonymous flow.
 */
async function deepaiImage(
  cfg: MediaConfig,
  prompt: string,
  key: ImageKeySpec
): Promise<Buffer> {
  const model = cfg.imageDeepaiModel
  const userAgent = process.env.MEDIA_IMAGE_DEEPAI_UA ?? DEEPAI_DEFAULT_UA
  const rawSalt = process.env.MEDIA_IMAGE_DEEPAI_SALT
  const paidKey = key.apiKey || cfg.imageDeepaiPaidKey
  const apiKey =
    paidKey ??
    (() => {
      if (!rawSalt)
        throw new Error(
          "MEDIA_IMAGE_DEEPAI_SALT is required when no paid key is configured"
        )
      return deepaiTryitKey(userAgent, rawSalt)
    })()
  const endpoint = (
    key.apiBaseUrl ||
    (process.env.MEDIA_IMAGE_DEEPAI_ENDPOINT ?? "https://api.deepai.org")
  ).replace(/\/+$/, "")
  const apiUrl = `${endpoint}/api/${model}`
  const modelPage = `https://deepai.org/machine-learning-model/${model}`

  const form = new FormData()
  form.append("text", prompt)
  form.append("generation_source", "img")
  // Best-effort: official DeepAI text2img accepts width/height (128–1536, mult 32);
  // model scrape bisa ignore — Layer 2 (sharp) menjamin hasil akhir.
  const size = process.env.MEDIA_IMAGE_SIZE || "512"
  form.append("width", size)
  form.append("height", size)

  let data: DeepAIResult
  try {
    data = await deepaiRequest(apiUrl, apiKey, userAgent, form, modelPage)
  } catch (err) {
    if (err instanceof DeepAIGateError && !paidKey)
      return deepaiImageViaBrowser(cfg, prompt)
    throw err
  }

  if (data.status) {
    const credits =
      data.credits_remaining != null
        ? ` (credits left: ${data.credits_remaining})`
        : ""
    throw new Error(`DeepAI scrape rejected: ${data.status}${credits}`)
  }
  if (data.error || data.err)
    throw new Error(`DeepAI scrape error: ${data.error || data.err}`)
  if (!data.output_url) throw new Error("DeepAI scrape returned no output_url")

  const img = await fetch(data.output_url, {
    headers: { "User-Agent": userAgent },
  })
  if (!img.ok) throw new Error(`DeepAI output fetch ${img.status}`)
  return Buffer.from(await img.arrayBuffer())
}

function chromeExecutable(): string {
  const candidates = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/opt/google/chrome/chrome",
    process.platform === "darwin" &&
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    process.platform === "win32" &&
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ].filter((p): p is string => typeof p === "string" && p.length > 0)
  const found = candidates.find((p) => existsSync(p))
  if (!found) {
    throw new Error(
      "No Chrome/Chromium for the DeepAI browser fallback — set CHROME_PATH or install one."
    )
  }
  return found
}

let deepaiPage: Promise<import("puppeteer-core").Page> | null = null

async function getDeepaiPage(
  modelPage: string
): Promise<import("puppeteer-core").Page> {
  if (!deepaiPage) {
    deepaiPage = (async () => {
      const puppeteer = (await import("puppeteer-core")).default
      const browser = await puppeteer.launch({
        executablePath: chromeExecutable(),
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-gpu",
          "--disable-dev-shm-usage",
        ],
      })
      const page = await browser.newPage()
      await page.goto(modelPage, { waitUntil: "load", timeout: 60_000 })
      return page
    })()
  }
  return deepaiPage
}

async function deepaiImageViaBrowser(
  cfg: MediaConfig,
  prompt: string
): Promise<Buffer> {
  const model = cfg.imageDeepaiModel
  const endpoint = (
    process.env.MEDIA_IMAGE_DEEPAI_ENDPOINT ?? "https://api.deepai.org"
  ).replace(/\/+$/, "")
  const modelPage = `https://deepai.org/machine-learning-model/${model}`
  const page = await getDeepaiPage(modelPage)

  // Key must be computed over the exact User-Agent the browser sends; the
  // page's own `generateIslandKey` is module-scoped, so we build it here.
  const ua = await page.evaluate(() => navigator.userAgent)
  const rawSalt = process.env.MEDIA_IMAGE_DEEPAI_SALT
  if (!rawSalt)
    throw new Error(
      "MEDIA_IMAGE_DEEPAI_SALT is required for browser-based DeepAI generation"
    )
  const apiKey = deepaiTryitKey(ua, rawSalt)

  const job = await page.evaluate(
    async (arg: {
      prompt: string
      apiUrl: string
      apiKey: string
      ua: string
    }) => {
      const form = new FormData()
      form.append("text", arg.prompt)
      form.append("generation_source", "img")
      const res = await fetch(arg.apiUrl, {
        method: "POST",
        headers: { "api-key": arg.apiKey, "User-Agent": arg.ua },
        body: form,
      })
      return { status: res.status, text: await res.text() }
    },
    { prompt, apiUrl: `${endpoint}/api/${model}`, apiKey, ua }
  )

  if (job.status !== 200) {
    console.error(`[image] DeepAI browser scrape ${job.status}: ${job.text}`)
    throw new Error(`DeepAI browser scrape ${job.status}`)
  }
  const data = JSON.parse(job.text) as DeepAIResult
  if (data.status || data.error || data.err) {
    const detail = data.error || data.err || data.status
    console.error(`[image] DeepAI browser scrape rejected: ${detail}`)
    throw new Error("DeepAI browser scrape rejected")
  }
  if (!data.output_url)
    throw new Error("DeepAI browser scrape returned no output_url")

  const img = await page.evaluate(async (url: string) => {
    const r = await fetch(url)
    if (!r.ok) return `ERR:${r.status}`
    const bytes = new Uint8Array(await r.arrayBuffer())
    let bin = ""
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
    return `B64:${btoa(bin)}`
  }, data.output_url)

  if (!img.startsWith("B64:")) throw new Error(`DeepAI output fetch ${img}`)
  return Buffer.from(img.slice(4), "base64")
}

/**
 * Close the cached headless browser so the CLI process can exit after a batch
 * (without this the puppeteer browser keeps the event loop alive → hang).
 */
export async function closeDeepaiBrowser(): Promise<void> {
  if (!deepaiPage) return
  const p = deepaiPage
  deepaiPage = null
  try {
    await (await p).close()
  } catch {
    // already closed
  }
}

export interface ImagePromptInput {
  translation: string
  translationId?: string
  /** Headword in the source language (hanzi / kana / native script) — helps the model pin the concept. */
  word?: string
  meanings?: string[]
  pos?: string
  /**
   * Contributor-authored per-item override, read from the content JSON
   * (`imagePrompt` field). Takes priority over the POS-aware default so
   * tricky abstract concepts never need code changes.
   */
  imagePrompt?: string
}

/**
 * POS-aware default prompt frames. Verbs render an action scene, adjectives
 * something "that is <subject>", adverbs an intensity metaphor, modal verbs
 * ability/permission, copula identity — so abstract concepts generate the
 * right image instead of a literal reading. Concrete nouns keep the plain
 * object template. Returns null when the POS has no dedicated frame.
 */
function posFrame(pos: string | undefined, subject: string): string | null {
  switch (pos) {
    case "verb":
      return `simple flat illustration of a person doing ${subject}`
    case "adjective":
      return `simple flat illustration of something that is ${subject}`
    case "adverb":
      return `simple flat illustration of a concept of intensity or degree, symbolizing ${subject}`
    case "modal verb":
      return `simple flat illustration of ability and permission, a green checkmark inside a circle and an open door, symbolizing ${subject}`
    case "copula":
      return `simple flat illustration of an equal sign between two person silhouettes, symbolizing identity, ${subject}`
    case "pronoun":
      return `simple flat illustration of a person pointing at the viewer, ${subject}`
    case "interjection":
      return `simple flat illustration of a speech bubble with an excited face, symbolizing ${subject}`
    case "numeral":
      return `simple flat illustration of the number ${subject}`
    case "particle":
      return `simple flat illustration of a grammar symbol, symbolizing ${subject}`
    case "phrase":
      return `simple flat illustration of a short scene symbolizing ${subject}`
    default:
      return null
  }
}

/**
 * Build a generation prompt from the full content item (not just the raw
 * translation). Uses the Indonesian `translationId` + native `word` as
 * disambiguation context so abstract / polysemous translations (e.g. "to quote,
 * quotation") generate the right concept instead of a literal reading.
 */
export function buildImagePrompt(item: ImagePromptInput): string {
  if (item.imagePrompt) return item.imagePrompt

  const senses =
    item.meanings && item.meanings.length > 0
      ? item.meanings
      : [item.translation]
  const subject = (senses[0] || item.translation).replace(/^to\s+/i, "").trim()
  const frame =
    posFrame(item.pos, subject) ?? `simple flat illustration of ${subject}`
  const parts = [frame]
  if (
    item.translationId &&
    item.translationId.toLowerCase() !== subject.toLowerCase()
  ) {
    parts.push(item.translationId)
  }
  if (item.word) parts.push(item.word)
  parts.push("white background, no text, minimal style")
  return parts.join(", ")
}

export const IMAGE_PROMPT_TEMPLATE =
  "simple flat illustration of {translation}, white background, no text, minimal style"
