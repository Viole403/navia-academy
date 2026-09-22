import AsyncStorage from "@react-native-async-storage/async-storage"

// Safe key-value storage: AsyncStorage when its native module exists,
// in-memory Map fallback otherwise (e.g. Expo Go version drift where the
// native module is null and every call rejects with AsyncStorageError).
// ponytail: persistence in Expo Go is best-effort; real fix is a dev build
// with matching native modules. Swap this file for raw AsyncStorage then.
const mem = new Map<string, string>()

export async function getItem(key: string): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(key)
    if (v !== null) return v
  } catch {
    // native module missing — fall through to memory
  }
  return mem.has(key) ? (mem.get(key) as string) : null
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value)
    return
  } catch {
    mem.set(key, value)
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key)
  } catch {
    mem.delete(key)
  }
}

export const storage = { getItem, setItem, removeItem }
