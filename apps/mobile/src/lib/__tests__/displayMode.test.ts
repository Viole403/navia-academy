import { describe, it, expect } from "vitest"

import {
  DEFAULT_DISPLAY_MODE,
  DISPLAY_MODES,
  isCharDisplayMode,
  normalizeDisplayMode,
  resolveMode,
  showsPinyin,
  showsTranslation,
  showsZhuyin,
} from "../displayMode"
import type { DisplayMode } from "@/types/api"

describe("reading-aid predicates", () => {
  it("shows pinyin for the pinyin modes and for both", () => {
    expect(showsPinyin("hanyu")).toBe(true)
    expect(showsPinyin("hanyu+trans")).toBe(true)
    expect(showsPinyin("all")).toBe(true)
  })

  it("hides pinyin when zhuyin was asked for", () => {
    expect(showsPinyin("zhuyin")).toBe(false)
    expect(showsPinyin("zhuyin+trans")).toBe(false)
    expect(showsPinyin("none")).toBe(false)
  })

  it("shows zhuyin for the zhuyin modes and for both", () => {
    expect(showsZhuyin("zhuyin")).toBe(true)
    expect(showsZhuyin("zhuyin+trans")).toBe(true)
    expect(showsZhuyin("all")).toBe(true)
    expect(showsZhuyin("hanyu")).toBe(false)
    expect(showsZhuyin("none")).toBe(false)
  })

  it("adds the translation only to the +trans modes and to both", () => {
    expect(showsTranslation("hanyu+trans")).toBe(true)
    expect(showsTranslation("zhuyin+trans")).toBe(true)
    expect(showsTranslation("all")).toBe(true)
    expect(showsTranslation("hanyu")).toBe(false)
    expect(showsTranslation("zhuyin")).toBe(false)
    expect(showsTranslation("none")).toBe(false)
  })

  it("keeps 'none' meaning no aid at all", () => {
    for (const mode of DISPLAY_MODES) {
      if (mode !== "none") continue
      expect(showsPinyin(mode)).toBe(false)
      expect(showsZhuyin(mode)).toBe(false)
      expect(showsTranslation(mode)).toBe(false)
    }
  })
})

describe("resolveMode", () => {
  const base: DisplayMode = {
    script: "simplified",
    mode: "hanyu+trans",
    adaptiveByLevel: false,
    levelOverrides: {},
  }

  it("uses the base mode when adaptive is off", () => {
    const withOverride: DisplayMode = {
      ...base,
      levelOverrides: { 5: "none" },
    }
    expect(resolveMode(withOverride, 5)).toBe("hanyu+trans")
  })

  it("uses the override for that level when adaptive is on", () => {
    const adaptive: DisplayMode = {
      ...base,
      adaptiveByLevel: true,
      levelOverrides: { 5: "none", 6: "hanyu" },
    }
    expect(resolveMode(adaptive, 5)).toBe("none")
    expect(resolveMode(adaptive, 6)).toBe("hanyu")
  })

  it("falls back to the base mode for a level with no override", () => {
    const adaptive: DisplayMode = {
      ...base,
      adaptiveByLevel: true,
      levelOverrides: { 5: "none" },
    }
    expect(resolveMode(adaptive, 2)).toBe("hanyu+trans")
  })

  it("ignores a missing level rather than overriding", () => {
    const adaptive: DisplayMode = {
      ...base,
      adaptiveByLevel: true,
      levelOverrides: { 5: "none" },
    }
    expect(resolveMode(adaptive, undefined)).toBe("hanyu+trans")
    expect(resolveMode(adaptive, null)).toBe("hanyu+trans")
  })
})

describe("normalizeDisplayMode", () => {
  it("falls back to the server default when nothing is stored", () => {
    expect(normalizeDisplayMode(undefined)).toEqual(DEFAULT_DISPLAY_MODE)
    expect(normalizeDisplayMode(null)).toEqual(DEFAULT_DISPLAY_MODE)
    expect(normalizeDisplayMode("hanyu")).toEqual(DEFAULT_DISPLAY_MODE)
  })

  it("keeps a valid stored mode", () => {
    const stored = { ...DEFAULT_DISPLAY_MODE, mode: "zhuyin" as const }
    expect(normalizeDisplayMode(stored).mode).toBe("zhuyin")
  })

  it("replaces a mode the server no longer knows", () => {
    const stored = { ...DEFAULT_DISPLAY_MODE, mode: "klingon" }
    expect(normalizeDisplayMode(stored).mode).toBe(DEFAULT_DISPLAY_MODE.mode)
  })

  it("only accepts traditional when the stored script says so", () => {
    expect(
      normalizeDisplayMode({ ...DEFAULT_DISPLAY_MODE, script: "traditional" })
        .script
    ).toBe("traditional")
    expect(
      normalizeDisplayMode({ ...DEFAULT_DISPLAY_MODE, script: "nope" }).script
    ).toBe("simplified")
  })

  it("defaults the adaptive flag to off and keeps overrides", () => {
    const stored = {
      ...DEFAULT_DISPLAY_MODE,
      levelOverrides: { 5: "none" as const },
    }
    const out = normalizeDisplayMode(stored)
    expect(out.adaptiveByLevel).toBe(false)
    expect(out.levelOverrides).toEqual({ 5: "none" })
  })
})

describe("isCharDisplayMode", () => {
  it("is limited to the languages that carry reading aids", () => {
    expect(isCharDisplayMode("zh")).toBe(true)
    expect(isCharDisplayMode("ja")).toBe(true)
    expect(isCharDisplayMode("de")).toBe(false)
    expect(isCharDisplayMode("en")).toBe(false)
  })
})
