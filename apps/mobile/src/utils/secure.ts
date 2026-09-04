import * as SecureStore from "expo-secure-store"

const KEY_VERSION = "navia.key-version"
const KEY_PREFIX = "navia.tokens.v"
const CURRENT_VERSION = 2

export interface StoredTokens {
  accessToken: string
  refreshToken: string
}

async function tokenKey(version: number): Promise<string> {
  return `${KEY_PREFIX}${version}`
}

async function ensureVersion(): Promise<number> {
  try {
    const raw = await SecureStore.getItemAsync(KEY_VERSION)
    if (raw !== null) {
      const v = parseInt(raw, 10)
      if (!isNaN(v)) return v
    }
  } catch {
    // fall through
  }
  return 1
}

export async function saveTokens(tokens: StoredTokens): Promise<void> {
  const version = await ensureVersion()
  await SecureStore.setItemAsync(KEY_VERSION, String(CURRENT_VERSION))
  await SecureStore.setItemAsync(
    await tokenKey(version),
    JSON.stringify(tokens)
  )
}

export async function getTokens(): Promise<StoredTokens | null> {
  let version = await ensureVersion()

  // Try current version first
  let raw = await SafeGet(KEY_PREFIX + version)
  if (raw) {
    // Migrate to current version slot if needed
    if (version !== CURRENT_VERSION) {
      await SecureStore.setItemAsync(KEY_VERSION, String(CURRENT_VERSION))
      await SecureStore.setItemAsync(await tokenKey(CURRENT_VERSION), raw)
    }
    return JSON.parse(raw) as StoredTokens
  }

  // Fall back to legacy v1 slot and promote on read
  const legacy = await SafeGet(KEY_PREFIX + "1")
  if (legacy) {
    await SecureStore.setItemAsync(KEY_VERSION, String(CURRENT_VERSION))
    await SecureStore.setItemAsync(await tokenKey(CURRENT_VERSION), legacy)
    return JSON.parse(legacy) as StoredTokens
  }

  return null
}

async function SafeGet(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key)
  } catch {
    return null
  }
}

export async function clearTokens(): Promise<void> {
  try {
    for (const v of [1, 2]) {
      await SecureStore.deleteItemAsync(KEY_PREFIX + v)
    }
    await SecureStore.deleteItemAsync(KEY_VERSION)
  } catch {
    // noop
  }
}
