import * as SecureStore from "expo-secure-store"

const KEY_VERSION = "navia.key-version"
const KEY_PREFIX = "navia.tokens.v"
const CURRENT_VERSION = 2

// In-memory fallback when the SecureStore native module is missing
// (same Expo Go drift class as AsyncStorage null). Tokens then live
// for the session only — acceptable for dev, real fix is a dev build.
const mem = new Map<string, string>()

export interface StoredTokens {
  accessToken: string
  refreshToken: string
}

async function tokenKey(version: number): Promise<string> {
  return `${KEY_PREFIX}${version}`
}

async function safeGet(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key)
  } catch {
    return mem.has(key) ? (mem.get(key) as string) : null
  }
}

async function safeSet(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value)
  } catch {
    mem.set(key, value)
  }
}

async function safeDelete(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key)
  } catch {
    mem.delete(key)
  }
}

async function ensureVersion(): Promise<number> {
  const raw = await safeGet(KEY_VERSION)
  if (raw !== null) {
    const v = parseInt(raw, 10)
    if (!isNaN(v)) return v
  }
  return 1
}

export async function saveTokens(tokens: StoredTokens): Promise<void> {
  const version = await ensureVersion()
  await safeSet(KEY_VERSION, String(CURRENT_VERSION))
  await safeSet(await tokenKey(version), JSON.stringify(tokens))
}

export async function getTokens(): Promise<StoredTokens | null> {
  const version = await ensureVersion()

  // Try current version first
  const raw = await safeGet(KEY_PREFIX + version)
  if (raw) {
    // Migrate to current version slot if needed
    if (version !== CURRENT_VERSION) {
      await safeSet(KEY_VERSION, String(CURRENT_VERSION))
      await safeSet(await tokenKey(CURRENT_VERSION), raw)
    }
    return JSON.parse(raw) as StoredTokens
  }

  // Fall back to legacy v1 slot and promote on read
  const legacy = await safeGet(KEY_PREFIX + "1")
  if (legacy) {
    await safeSet(KEY_VERSION, String(CURRENT_VERSION))
    await safeSet(await tokenKey(CURRENT_VERSION), legacy)
    return JSON.parse(legacy) as StoredTokens
  }

  return null
}

export async function clearTokens(): Promise<void> {
  for (const v of [1, 2]) {
    await safeDelete(KEY_PREFIX + v)
  }
  await safeDelete(KEY_VERSION)
}
