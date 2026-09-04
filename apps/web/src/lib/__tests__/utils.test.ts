import { describe, it, expect } from "@jest/globals"
import { cn } from "../utils"

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar")
  })

  it("handles conditional classes", () => {
    const active = true
    const disabled = false
    expect(cn("base", active && "active", disabled && "disabled")).toBe(
      "base active"
    )
  })

  it("deduplicates tailwind classes (later wins)", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500")
  })

  it("handles empty inputs", () => {
    expect(cn()).toBe("")
    expect(cn("", "foo", "")).toBe("foo")
  })

  it("handles arrays and objects", () => {
    expect(cn(["a", "b"], { c: true, d: false })).toBe("a b c")
  })
})
