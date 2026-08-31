/**
 * Dashboard-editable media pipeline settings (`media_settings` table, see
 * migrations/0005_media_settings.sql).
 *
 * These let the Media Studio switch the active image provider / TTS engine
 * without touching env vars on every machine/runner. Precedence in the
 * pipeline is: explicit env var > DB setting > built-in default.
 */

import { dbConfigured, supabaseUrl, authHeaders } from "./key-pool"
import type { MediaConfig } from "./config"

export const MEDIA_SETTING_KEYS = [
  "image_provider",
  "tts_engine",
  "vision_provider",
] as const
export type MediaSettingKey = (typeof MEDIA_SETTING_KEYS)[number]

export interface MediaSettingOverrides {
  imageProvider?: MediaConfig["imageProvider"]
  ttsEngine?: MediaConfig["ttsEngine"]
  visionProvider?: "gemini" | "openai" | "cloudflare"
}

interface MediaSettingRow {
  key: string
  value: string
}

const TABLE = "media_settings"

/** Read the saved overrides from the DB (empty when not configured / reachable). */
export async function readMediaSettings(): Promise<MediaSettingOverrides> {
  if (!dbConfigured()) return {}
  const res = await fetch(
    `${supabaseUrl()}/rest/v1/${TABLE}?select=key,value`,
    { headers: authHeaders() }
  )
  if (!res.ok)
    throw new Error(
      `Failed to read ${TABLE} (${res.status}): ${await res.text()}`
    )
  const rows = (await res.json()) as MediaSettingRow[]
  const overrides: MediaSettingOverrides = {}
  for (const r of rows) {
    if (r.key === "image_provider")
      overrides.imageProvider = r.value as MediaConfig["imageProvider"]
    else if (r.key === "tts_engine")
      overrides.ttsEngine = r.value as MediaConfig["ttsEngine"]
    else if (r.key === "vision_provider")
      overrides.visionProvider =
        r.value as MediaSettingOverrides["visionProvider"]
  }
  return overrides
}

/** Upsert one setting (unique on `key`). */
export async function saveMediaSetting(
  key: MediaSettingKey,
  value: string
): Promise<void> {
  if (!dbConfigured())
    throw new Error(
      "CONTENT_SUPABASE_URL + CONTENT_SUPABASE_SERVICE_ROLE_KEY not configured"
    )
  const res = await fetch(`${supabaseUrl()}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ key, value }),
  })
  if (!res.ok)
    throw new Error(
      `Failed to save ${TABLE} (${res.status}): ${await res.text()}`
    )
}

/** Delete a setting so the pipeline falls back to env / default. */
export async function deleteMediaSetting(key: MediaSettingKey): Promise<void> {
  if (!dbConfigured())
    throw new Error(
      "CONTENT_SUPABASE_URL + CONTENT_SUPABASE_SERVICE_ROLE_KEY not configured"
    )
  const res = await fetch(`${supabaseUrl()}/rest/v1/${TABLE}?key=eq.${key}`, {
    method: "DELETE",
    headers: { ...authHeaders(), Prefer: "return=minimal" },
  })
  if (!res.ok)
    throw new Error(
      `Failed to delete ${TABLE} (${res.status}): ${await res.text()}`
    )
}
