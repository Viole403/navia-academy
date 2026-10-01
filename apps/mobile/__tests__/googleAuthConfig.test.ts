import { afterEach, describe, expect, it, vi } from "vitest"

/**
 * `Google.useAuthRequest` throws while rendering when the client id for the
 * current platform is `undefined`, which took down the whole app at the auth
 * wall in a release build with no Google credentials. The auth screens now gate
 * on this flag, so an unconfigured build has to report `false`.
 */
const KEYS = [
  "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID",
  "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID",
  "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID",
] as const

async function loadFlag(
  values: Partial<Record<(typeof KEYS)[number], string>>
) {
  vi.resetModules()
  for (const key of KEYS) vi.stubEnv(key, values[key])
  const mod = await import("../src/utils/env")
  return mod.googleAuthConfigured
}

describe("googleAuthConfigured", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("is false when no client id is set", async () => {
    expect(await loadFlag({})).toBe(false)
  })

  it("is false when the client id vars are present but empty", async () => {
    expect(
      await loadFlag({
        EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: "",
        EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: "",
        EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: "",
      })
    ).toBe(false)
  })

  it("is true when any single platform client id is set", async () => {
    expect(
      await loadFlag({
        EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: "a.apps.googleusercontent.com",
      })
    ).toBe(true)
    expect(
      await loadFlag({
        EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: "w.apps.googleusercontent.com",
      })
    ).toBe(true)
    expect(
      await loadFlag({
        EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: "i.apps.googleusercontent.com",
      })
    ).toBe(true)
  })
})
