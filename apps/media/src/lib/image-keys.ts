/**
 * Central image-generation key pool.
 *
 * Keys live in the `image_api_keys` table (Supabase, see
 * migrations/0003_image_api_keys.sql) and are edited centrally in the Media
 * Studio dashboard. CLI, GitHub Actions, and dashboard API routes all fetch
 * from the same table via PostgREST using the service-role key.
 *
 * Behavior:
 *  - Keys are fetched once and cached (POOL_CACHE_TTL_MS) per run.
 *  - Enabled, non-cooldown keys for the active provider are rotated round-robin.
 *  - When a key hits a 429 / quota / rate-limit error it is marked
 *    `cooldown_until` (with the error message) so the remaining keys keep the
 *    batch going instead of failing it.
 *  - If the DB is not configured (no service-role key), the legacy flat env
 *    keys are used (old `.env.local`-only setups keep working).
 */

import type { MediaConfig } from "./config"
import { loadMediaConfig } from "./config"
import { ImageKeySpec, generateImage, legacyImageKey } from "./image"
import {
  POOL_CACHE_TTL_MS,
  dbConfigured,
  fetchPoolRows,
  upsertPoolRow,
  patchPoolRow,
  patchPoolRowByProviderName,
  deletePoolRow,
  isRateLimitError,
  errMessage,
  cooldownMs,
  maskKey,
  type PooledRow,
} from "./key-pool"

export interface StoredKey extends PooledRow {
  api_base_url?: string | null
  model?: string | null
  cf_account_id?: string | null
}

export { maskKey }

const POOL_TABLE = "image_api_keys"
const COOLDOWN_ENV = process.env.MEDIA_IMAGE_KEY_COOLDOWN_MS

let poolCache: { keys: StoredKey[]; fetchedAt: number } | null = null
const roundRobin: Record<string, number> = {}

function toSpec(k: StoredKey): ImageKeySpec {
  return {
    provider: k.provider,
    name: k.name,
    apiKey: k.api_key,
    apiBaseUrl: k.api_base_url || undefined,
    model: k.model || undefined,
    cfAccountId: k.cf_account_id || undefined,
  }
}

/** Enabled keys for the provider, minus any currently in cooldown. */
export async function getKeyPool(provider: string): Promise<ImageKeySpec[]> {
  if (dbConfigured()) {
    try {
      if (!poolCache || Date.now() - poolCache.fetchedAt > POOL_CACHE_TTL_MS) {
        poolCache = {
          keys: await fetchPoolRows<StoredKey>(POOL_TABLE),
          fetchedAt: Date.now(),
        }
      }
      const now = new Date().toISOString()
      const active = poolCache.keys
        .filter((k) => k.enabled && k.provider === provider)
        .filter((k) => !k.cooldown_until || k.cooldown_until <= now)
      if (active.length > 0) return active.map(toSpec)
      console.warn(
        `  ⚠ No enabled ${provider} keys in the pool (all in cooldown?) — falling back to env`
      )
    } catch (err) {
      console.warn(
        `  ⚠ image_api_keys fetch failed (${errMessage(err)}) — falling back to env keys`
      )
    }
  }
  return [legacyImageKey(loadMediaConfig())]
}

/** Pick the next key for a provider (round-robin across the active pool). */
export async function nextImageKey(provider: string): Promise<ImageKeySpec> {
  const pool = await getKeyPool(provider)
  const idx = (roundRobin[provider] ?? 0) % pool.length
  roundRobin[provider] = idx + 1
  return pool[idx]
}

/**
 * Mark a key as used (success) or on cooldown (rate-limit failure). Env keys
 * (`name: "env"`) are never persisted — there is no DB row for them.
 */
export async function reportKeyStatus(
  key: ImageKeySpec,
  err?: unknown
): Promise<void> {
  if (key.name === "env" || !dbConfigured()) return
  const patch: Partial<StoredKey> = { last_used_at: new Date().toISOString() }
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
 * Generate an image using the pooled keys: rotate round-robin, and on a
 * rate-limit failure mark the key in cooldown and retry with the next key.
 * Non-rate-limit errors (bad prompt, NSFW gate, …) are reported without a
 * cooldown and surface to the caller.
 */
export async function generateImageWithRotation(
  cfg: MediaConfig,
  prompt: string
): Promise<Buffer> {
  const provider = cfg.imageProvider
  const pool = await getKeyPool(provider)
  const attempts = pool.length

  let lastErr: Error | undefined
  for (let i = 0; i < attempts; i++) {
    const key = await nextImageKey(provider)
    try {
      const buf = await generateImage(cfg, prompt, key)
      await reportKeyStatus(key)
      return buf
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err))
      await reportKeyStatus(key, err)
      if (!isRateLimitError(err)) throw lastErr
      console.warn(`  → retrying with next key (${i + 1}/${attempts})`)
    }
  }
  throw (
    lastErr ??
    new Error(`Image generation failed: no keys left for ${provider}`)
  )
}

/** Drop the cached pool (used by tests / dashboard after edits). */
export function resetKeyPoolCache(): void {
  poolCache = null
}

// ── CRUD (dashboard API routes) ───────────────────────────────────────────

/** List every stored key (used by the dashboard API; keys are masked on the client). */
export async function listStoredKeys(): Promise<StoredKey[]> {
  if (!dbConfigured())
    throw new Error(
      "CONTENT_SUPABASE_URL + CONTENT_SUPABASE_SERVICE_ROLE_KEY not configured"
    )
  const rows = await fetchPoolRows<StoredKey>(POOL_TABLE)
  return rows.sort(
    (a, b) =>
      a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name)
  )
}

/** Insert or replace a stored key (upsert by unique provider+name). */
export async function upsertStoredKey(input: {
  provider: string
  name: string
  api_key: string
  api_base_url?: string
  model?: string
  cf_account_id?: string
  enabled?: boolean
}): Promise<StoredKey> {
  if (!dbConfigured())
    throw new Error(
      "CONTENT_SUPABASE_URL + CONTENT_SUPABASE_SERVICE_ROLE_KEY not configured"
    )
  const row = {
    provider: input.provider,
    name: input.name,
    api_key: input.api_key,
    api_base_url: input.api_base_url || null,
    model: input.model || null,
    cf_account_id: input.cf_account_id || null,
    enabled: input.enabled ?? true,
  }
  const saved = await upsertPoolRow(POOL_TABLE, row)
  resetKeyPoolCache()
  return saved as StoredKey
}

/** Patch one stored key (enable/disable, clear cooldown, update optional fields). */
export async function patchStoredKey(
  id: string,
  patch: Partial<
    Pick<
      StoredKey,
      | "api_key"
      | "api_base_url"
      | "model"
      | "cf_account_id"
      | "enabled"
      | "cooldown_until"
      | "last_error"
    >
  >
): Promise<void> {
  if (!dbConfigured())
    throw new Error(
      "CONTENT_SUPABASE_URL + CONTENT_SUPABASE_SERVICE_ROLE_KEY not configured"
    )
  await patchPoolRow(POOL_TABLE, id, patch as Record<string, unknown>)
  resetKeyPoolCache()
}

/** Delete one stored key. */
export async function deleteStoredKey(id: string): Promise<void> {
  if (!dbConfigured())
    throw new Error(
      "CONTENT_SUPABASE_URL + CONTENT_SUPABASE_SERVICE_ROLE_KEY not configured"
    )
  await deletePoolRow(POOL_TABLE, id)
  resetKeyPoolCache()
}
