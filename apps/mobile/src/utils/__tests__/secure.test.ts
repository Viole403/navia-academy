import { vi, describe, it, expect, beforeEach } from "vitest"

// In-memory SecureStore mock — must be set up before secure.ts is imported
const mem: Record<string, string | null> = {}

vi.mock("expo-secure-store", () => ({
  setItemAsync: vi.fn(async (key: string, val: string) => {
    mem[key] = val
  }),
  getItemAsync: vi.fn(async (key: string) => mem[key] ?? null),
  deleteItemAsync: vi.fn(async (key: string) => {
    delete mem[key]
  }),
}))

import { saveTokens, getTokens, clearTokens } from "../secure"

describe("secure", () => {
  beforeEach(() => {
    // Reset memory store AND clear all mock calls
    for (const k of Object.keys(mem)) delete mem[k]
    vi.clearAllMocks()
  })

  describe("saveTokens + getTokens", () => {
    it("round-trips tokens", async () => {
      await saveTokens({ accessToken: "at-abc", refreshToken: "rt-xyz" })
      const stored = await getTokens()
      expect(stored).toEqual({ accessToken: "at-abc", refreshToken: "rt-xyz" })
    })

    it("returns null when empty", async () => {
      expect(await getTokens()).toBeNull()
    })
  })

  describe("clearTokens", () => {
    it("deletes all slots", async () => {
      await saveTokens({ accessToken: "x", refreshToken: "y" })
      await clearTokens()
      expect(await getTokens()).toBeNull()
    })
  })
})
