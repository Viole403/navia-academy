import { vi } from "vitest"

globalThis.__DEV__ = true

// Mock expo
vi.mock("expo", () => ({}))

// Mock expo-modules-core.
//
// Defaults to "no native module present", which is the truth in a test
// environment and also the state of an Expo Go client. A test that needs the real
// module overrides requireOptionalNativeModule per-case rather than changing this
// default, so the normal path under test stays the unavailable one.
vi.mock("expo-modules-core", () => ({
  requireOptionalNativeModule: vi.fn(() => null),
  requireNativeModule: vi.fn(() => {
    throw new Error("native module unavailable in tests")
  }),
}))

// Mock expo-secure-store
vi.mock("expo-secure-store", () => ({
  setItemAsync: vi.fn(() => Promise.resolve()),
  getItemAsync: vi.fn(() => Promise.resolve(null)),
  deleteItemAsync: vi.fn(() => Promise.resolve()),
}))

// Mock expo-network
vi.mock("expo-network", () => ({
  useNetworkState: vi.fn(() => ({ isConnected: true })),
}))

// Mock AsyncStorage
vi.mock("@react-native-async-storage/async-storage", () => {
  const store: Record<string, string | null> = {}
  return {
    default: {
      setItem: vi.fn(async (k: string, v: string) => {
        store[k] = v
      }),
      getItem: vi.fn(async (k: string) => store[k] ?? null),
      removeItem: vi.fn(async (k: string) => {
        delete store[k]
      }),
      getAllKeys: vi.fn(async () => Object.keys(store)),
      multiGet: vi.fn(async (keys: string[]) =>
        keys.map((k) => [k, store[k] ?? null] as [string, string | null])
      ),
      multiSet: vi.fn(async (pairs: [string, string][]) =>
        pairs.forEach(([k, v]) => {
          store[k] = v
        })
      ),
    },
    setItem: (k: string, v: string) => Promise.resolve(),
    getItem: (k: string) => Promise.resolve<string | null>(null),
    removeItem: (k: string) => Promise.resolve(),
    getAllKeys: () => Promise.resolve<string[]>([]),
    multiGet: (keys: string[]) =>
      Promise.resolve<[string, string | null][]>([]),
    multiSet: (pairs: [string, string][]) => Promise.resolve(),
  }
})

// Silence console noise
vi.stubGlobal("console", {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
})
