import { describe, expect, it } from "vitest"
import { levelLabelFor } from "@/lib/languages"

describe("levelLabelFor", () => {
  it("names a German level using the Goethe ladder", () => {
    expect(levelLabelFor("goethe", 1)).toBe("A1")
    expect(levelLabelFor("goethe", 3)).toBe("B1")
  })

  it("names Chinese and Japanese levels on their own ladders", () => {
    expect(levelLabelFor("hsk", 4)).toBe("4")
    expect(levelLabelFor("jlpt", 1)).toBe("N5")
    expect(levelLabelFor("tocfl", 1)).toBe("Novice 1")
  })

  // de/ja/en conversations ship no `context`, so this fallback is what every
  // one of their rows rendered — a bare level number instead of a name.
  it("never returns a bare number when no exam track is known", () => {
    expect(levelLabelFor(null, 1)).toBe("")
    expect(levelLabelFor(undefined, 2)).toBe("")
    expect(levelLabelFor("", 3)).toBe("")
  })

  it("returns empty when there is no level", () => {
    expect(levelLabelFor("goethe", undefined)).toBe("")
    expect(levelLabelFor("goethe", "")).toBe("")
  })

  it("falls back to a readable label past the end of the ladder", () => {
    expect(levelLabelFor("jlpt", 9)).toBe("Level 9")
  })
})
