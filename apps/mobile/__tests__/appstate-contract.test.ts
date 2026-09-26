import { describe, it, expect } from "vitest"
import type { AppStateStatus } from "react-native"

import type { AppStateName } from "@/lib/integrity"

/**
 * The counting rule takes its state names as a local string union so it can be
 * imported outside a native host. That only works while the union and the real
 * react-native type describe the same set — otherwise a state react-native
 * starts emitting would be counted by a rule that has never heard of it.
 */
describe("AppStateName", () => {
  it("covers every state react-native can report", () => {
    const all: AppStateStatus[] = [
      "active",
      "background",
      "inactive",
      "unknown",
      "extension",
    ]
    for (const s of all) {
      const asRule: AppStateName = s
      expect(asRule).toBe(s)
    }
  })

  it("has no state react-native does not report", () => {
    const rule: AppStateName[] = ["active", "background", "inactive", "unknown"]
    const real: AppStateStatus[] = [
      "active",
      "background",
      "inactive",
      "unknown",
      "extension",
    ]
    for (const s of rule) {
      expect(real).toContain(s)
    }
  })
})
