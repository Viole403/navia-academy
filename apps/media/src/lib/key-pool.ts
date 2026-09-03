/**
 * Generic Supabase-backed key-pool primitives shared by the image and TTS
 * pipelines (`image-keys.ts` / `tts-keys.ts`).
 *
 * Both pools store secrets in Supabase tables (`image_api_keys`,
 * `tts_api_keys`) that only the service-role key can read. The CLI, GitHub
 * Actions, and the dashboard API routes all reach the same tables via
 * PostgREST, so a key edited in the dashboard is used by every consumer.
 *
 * AES-256-GCM encryption is applied to api_key columns when
 * MEDIA_KEY_ENCRYPTION_KEY is set. Without it the pool stays plaintext
 * (backward-compatible with existing local/CI data).
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

export const POOL_CACHE_TTL_MS = 60_000
export const DEFAULT_COOLDOWN_MS = 10 * 60_000

/** Minimum columns every pool table has (domain tables add their own fields). */
export interface PooledRow {
  id: string
  provider: string
  name: string
  api_key: string
  enabled: boolean
  cooldown_until?: string | null
  last_error?: string | null
  last_used_at?: string | null
}

export function dbConfigured(): boolean {
  return Boolean(
    process.env.CONTENT_SUPABASE_URL &&
    process.env.CONTENT_SUPABASE_SERVICE_ROLE_KEY
  )
}

function getEncryptionKey(): Buffer | null {
  const key = process.env.MEDIA_KEY_ENCRYPTION_KEY
  if (!key) return null
  return Buffer.from(key, "base64") // must be 32 bytes (256-bit)
}

/** Decrypt a ciphertext stored in the DB. Returns plaintext on success. */
function decryptSecret(ciphertext: string): string {
  const key = getEncryptionKey()
  if (!key) return ciphertext
  try {
    const [version, ivHex, tagHex, ...rest] = ciphertext.split(":")
    if (version !== "enc:v1") throw new Error("unknown version")
    const iv = Buffer.from(ivHex, "hex")
    const tag = Buffer.from(tagHex, "hex")
    const encrypted = rest.join(":")
    const decipher = createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAuthTag(tag)
    return decipher.update(encrypted, "base64", "utf8") + decipher.final("utf8")
  } catch {
    return ciphertext // legacy plaintext
  }
}

/** Encrypt a plaintext secret for storage. Returns ciphertext prefixed with version. */
function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey()
  if (!key) return plaintext
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const encrypted =
    cipher.update(plaintext, "utf8", "base64") + cipher.final("base64")
  const tag = cipher.getAuthTag()
  return `enc:v1:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`
}

export function supabaseUrl(): string {
  return (process.env.CONTENT_SUPABASE_URL ?? "").replace(/\/+$/, "")
}

export function authHeaders(): Record<string, string> {
  const key = process.env.CONTENT_SUPABASE_SERVICE_ROLE_KEY ?? ""
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  }
}

export function errMessage(err: unknown): string {
  return err instanceof Error ? err.message.slice(0, 500) : String(err)
}

/** 429 / quota / rate-limit detection across provider error messages. */
export function isRateLimitError(err: unknown): boolean {
  const m = errMessage(err).toLowerCase()
  return /429|4006|quota|rate.?limit|too many|exhausted|insufficient|not enough credits|credits left: 0/i.test(
    m
  )
}

export function cooldownMs(envOverride?: string): number {
  return (
    Number(envOverride ?? String(DEFAULT_COOLDOWN_MS)) || DEFAULT_COOLDOWN_MS
  )
}

/** Mask a key for display (show last 4 chars). */
export function maskKey(apiKey: string): string {
  if (apiKey.length <= 8) return "••••"
  return `••••••••${apiKey.slice(-4)}`
}

/** Fetch every row of a pool table (rotation pool + dashboard list). */
export async function fetchPoolRows<T extends PooledRow>(
  table: string
): Promise<T[]> {
  const res = await fetch(`${supabaseUrl()}/rest/v1/${table}?select=*`, {
    headers: authHeaders(),
  })
  if (!res.ok)
    throw new Error(
      `Failed to read ${table} (${res.status}): ${await res.text()}`
    )
  const rows: T[] = await res.json()
  return rows.map((r) => ({ ...r, api_key: decryptSecret(r.api_key) })) as T[]
}

/** Upsert a row by the unique (provider, name) constraint. */
export async function upsertPoolRow(
  table: string,
  row: Record<string, unknown>
): Promise<PooledRow> {
  const body = { ...row }
  if (typeof body.api_key === "string" && body.api_key)
    body.api_key = encryptSecret(body.api_key)
  const res = await fetch(`${supabaseUrl()}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(body),
  })
  if (!res.ok)
    throw new Error(
      `Failed to upsert ${table} (${res.status}): ${await res.text()}`
    )
  const rows = (await res.json()) as PooledRow[]
  return rows[0]
}

export async function patchPoolRow(
  table: string,
  id: string,
  patch: Record<string, unknown>
): Promise<void> {
  const body: Record<string, unknown> = { ...patch }
  if (typeof body.api_key === "string" && body.api_key)
    body.api_key = encryptSecret(body.api_key)
  const res = await fetch(`${supabaseUrl()}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...authHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify(body),
  })
  if (!res.ok)
    throw new Error(
      `Failed to update ${table} (${res.status}): ${await res.text()}`
    )
}

/** Patch by the unique (provider, name) pair — used to mark keys in cooldown. */
export async function patchPoolRowByProviderName(
  table: string,
  provider: string,
  name: string,
  patch: Record<string, unknown>
): Promise<void> {
  const body: Record<string, unknown> = { ...patch }
  if (typeof body.api_key === "string" && body.api_key)
    body.api_key = encryptSecret(body.api_key)
  const q = `provider=eq.${encodeURIComponent(provider)}&name=eq.${encodeURIComponent(name)}`
  const res = await fetch(`${supabaseUrl()}/rest/v1/${table}?${q}`, {
    method: "PATCH",
    headers: { ...authHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify(body),
  })
  if (!res.ok)
    throw new Error(
      `Failed to update ${table} (${res.status}): ${await res.text()}`
    )
}

export async function deletePoolRow(table: string, id: string): Promise<void> {
  const res = await fetch(`${supabaseUrl()}/rest/v1/${table}?id=eq.${id}`, {
    method: "DELETE",
    headers: { ...authHeaders(), Prefer: "return=minimal" },
  })
  if (!res.ok)
    throw new Error(
      `Failed to delete ${table} (${res.status}): ${await res.text()}`
    )
}
