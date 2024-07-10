/**
 * Central TTS (speech synthesis) key pool.
 *
 * Keys live in the `tts_api_keys` table (Supabase, see
 * migrations/0004_tts_api_keys.sql) and are edited centrally in the Media
 * Studio dashboard. CLI, GitHub Actions, and dashboard API routes all fetch
 * from the same table via PostgREST using the service-role key.
 *
 * Behavior:
 *  - Enabled, non-cooldown keys for the active engine (google | azure) are
 *    rotated round-robin.
 *  - When a key hits a 429 / quota / rate-limit error it is marked
 *    `cooldown_until` (with the error message) so the remaining keys keep the
 *    batch going instead of failing it.
 *  - Edge TTS is free and keyless — synthesized directly.
 *  - If the DB is not configured, the legacy flat env keys are used
 *    (GOOGLE_TTS_API_KEY / AZURE_SPEECH_KEY + AZURE_SPEECH_REGION).
 */

import type { MediaConfig } from "./config";
import { synthesizeAudioWithKey, type MediaLocale, type MediaGender } from "./tts";
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
  type PooledRow,
} from "./key-pool";

export interface TtsStoredKey extends PooledRow {
  region?: string | null;
}

export interface TtsKeySpec {
  provider: string;
  name: string;
  apiKey: string;
  region?: string;
}

const POOL_TABLE = "tts_api_keys";
const COOLDOWN_ENV = process.env.MEDIA_TTS_KEY_COOLDOWN_MS;

let poolCache: { keys: TtsStoredKey[]; fetchedAt: number } | null = null;
const roundRobin: Record<string, number> = {};

function toSpec(k: TtsStoredKey): TtsKeySpec {
  return { provider: k.provider, name: k.name, apiKey: k.api_key, region: k.region || undefined };
}

function legacyTtsKey(provider: string): TtsKeySpec {
  if (provider === "azure") {
    return {
      provider: "azure",
      name: "env",
      apiKey: process.env.AZURE_SPEECH_KEY ?? "",
      region: process.env.AZURE_SPEECH_REGION || undefined,
    };
  }
  return { provider: "google", name: "env", apiKey: process.env.GOOGLE_TTS_API_KEY ?? "" };
}

/** Enabled keys for the engine, minus any currently in cooldown. */
export async function getTtsKeyPool(provider: string): Promise<TtsKeySpec[]> {
  if (dbConfigured()) {
    try {
      if (!poolCache || Date.now() - poolCache.fetchedAt > POOL_CACHE_TTL_MS) {
        poolCache = { keys: await fetchPoolRows<TtsStoredKey>(POOL_TABLE), fetchedAt: Date.now() };
      }
      const now = new Date().toISOString();
      const active = poolCache.keys
        .filter((k) => k.enabled && k.provider === provider)
        .filter((k) => !k.cooldown_until || k.cooldown_until <= now);
      if (active.length > 0) return active.map(toSpec);
      console.warn(`  ⚠ No enabled ${provider} TTS keys in the pool (all in cooldown?) — falling back to env`);
    } catch (err) {
      console.warn(`  ⚠ tts_api_keys fetch failed (${errMessage(err)}) — falling back to env keys`);
    }
  }
  return [legacyTtsKey(provider)];
}

/** Pick the next key for an engine (round-robin across the active pool). */
export async function nextTtsKey(provider: string): Promise<TtsKeySpec> {
  const pool = await getTtsKeyPool(provider);
  const idx = (roundRobin[provider] ?? 0) % pool.length;
  roundRobin[provider] = idx + 1;
  return pool[idx];
}

/**
 * Mark a key as used (success) or on cooldown (rate-limit failure). Env keys
 * (`name: "env"`) are never persisted — there is no DB row for them.
 */
export async function reportTtsKeyStatus(key: TtsKeySpec, err?: unknown): Promise<void> {
  if (key.name === "env" || !dbConfigured()) return;
  const patch: Partial<TtsStoredKey> = { last_used_at: new Date().toISOString() };
  if (err) {
    patch.last_error = errMessage(err);
    if (isRateLimitError(err)) {
      patch.cooldown_until = new Date(Date.now() + cooldownMs(COOLDOWN_ENV)).toISOString();
      console.warn(`  ⏳ ${key.provider}:${key.name} rate-limited — cooldown ${cooldownMs(COOLDOWN_ENV) / 1000}s`);
    }
  }
  await patchPoolRowByProviderName(POOL_TABLE, key.provider, key.name, patch as Record<string, unknown>).catch(
    () => undefined,
  );
}

/**
 * Synthesize audio using the pooled keys: rotate round-robin, and on a
 * rate-limit failure mark the key in cooldown and retry with the next key.
 * Edge TTS is free and keyless — synthesized directly. Non-rate-limit errors
 * (empty key, malformed request, …) are reported without a cooldown and
 * surface to the caller.
 */
export async function synthesizeAudioWithRotation(
  cfg: MediaConfig,
  text: string,
  locale: MediaLocale,
  gender: MediaGender,
): Promise<Buffer> {
  if (cfg.ttsEngine === "edge") return synthesizeAudioWithKey(cfg, text, locale, gender);
  const provider = cfg.ttsEngine;
  const pool = await getTtsKeyPool(provider);
  const attempts = pool.length;

  let lastErr: Error | undefined;
  for (let i = 0; i < attempts; i++) {
    const key = await nextTtsKey(provider);
    try {
      const buf = await synthesizeAudioWithKey(cfg, text, locale, gender, key);
      await reportTtsKeyStatus(key);
      return buf;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      await reportTtsKeyStatus(key, err);
      if (!isRateLimitError(err)) throw lastErr;
      console.warn(`  → retrying with next TTS key (${i + 1}/${attempts})`);
    }
  }
  throw lastErr ?? new Error(`TTS synthesis failed: no keys left for ${provider}`);
}

/** Drop the cached pool (used by tests / dashboard after edits). */
export function resetTtsKeyPoolCache(): void {
  poolCache = null;
}

// ── CRUD (dashboard API routes) ───────────────────────────────────────────

/** List every stored key (used by the dashboard API; keys are masked on the client). */
export async function listTtsStoredKeys(): Promise<TtsStoredKey[]> {
  if (!dbConfigured()) throw new Error("CONTENT_SUPABASE_URL + CONTENT_SUPABASE_SERVICE_ROLE_KEY not configured");
  const rows = await fetchPoolRows<TtsStoredKey>(POOL_TABLE);
  return rows.sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name));
}

/** Insert or replace a stored key (upsert by unique provider+name). */
export async function upsertTtsStoredKey(input: {
  provider: string;
  name: string;
  api_key: string;
  region?: string;
  enabled?: boolean;
}): Promise<TtsStoredKey> {
  if (!dbConfigured()) throw new Error("CONTENT_SUPABASE_URL + CONTENT_SUPABASE_SERVICE_ROLE_KEY not configured");
  const row = {
    provider: input.provider,
    name: input.name,
    api_key: input.api_key,
    region: input.region || null,
    enabled: input.enabled ?? true,
  };
  const saved = await upsertPoolRow(POOL_TABLE, row);
  resetTtsKeyPoolCache();
  return saved as TtsStoredKey;
}

/** Patch one stored key (enable/disable, clear cooldown, update region/key). */
export async function patchTtsStoredKey(
  id: string,
  patch: Partial<Pick<TtsStoredKey, "api_key" | "region" | "enabled" | "cooldown_until" | "last_error">>,
): Promise<void> {
  if (!dbConfigured()) throw new Error("CONTENT_SUPABASE_URL + CONTENT_SUPABASE_SERVICE_ROLE_KEY not configured");
  await patchPoolRow(POOL_TABLE, id, patch as Record<string, unknown>);
  resetTtsKeyPoolCache();
}

/** Delete one stored key. */
export async function deleteTtsStoredKey(id: string): Promise<void> {
  if (!dbConfigured()) throw new Error("CONTENT_SUPABASE_URL + CONTENT_SUPABASE_SERVICE_ROLE_KEY not configured");
  await deletePoolRow(POOL_TABLE, id);
  resetTtsKeyPoolCache();
}
