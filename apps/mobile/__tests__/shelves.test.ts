import { describe, expect, it } from "vitest"
import { groupIntoShelves } from "@/lib/shelves"
import type { Reading } from "@/types/api"

const reading = (id: string, level?: number, hsk?: number): Reading => ({
  id,
  title: id,
  ...(level !== undefined ? { level } : {}),
  ...(hsk !== undefined ? { hsk } : {}),
})

describe("groupIntoShelves", () => {
  // The published bundles send `level` as a number in every language, so the
  // shelf key must be stringified. Keying on the raw number threw
  // `undefined is not a function` from localeCompare during the sort.
  it("groups numeric levels and sorts them numerically", () => {
    const shelves = groupIntoShelves(
      [reading("c", 3), reading("a", 1), reading("b", 2), reading("d", 10)],
      "General"
    )
    expect(shelves.map((s) => s.label)).toEqual(["1", "2", "3", "10"])
  })

  it("keeps HSK fallback shelves and places them by level", () => {
    const shelves = groupIntoShelves(
      [reading("a", 1, 1), reading("b", undefined, 2), reading("c", 2)],
      "General"
    )
    expect(shelves.map((s) => s.label)).toEqual(["1", "2", "HSK 2"])
    expect(shelves[0].items).toHaveLength(1)
  })

  it("falls back to the general label when level and hsk are both absent", () => {
    const shelves = groupIntoShelves([reading("x")], "Umum")
    expect(shelves).toEqual([{ label: "Umum", items: [reading("x")] }])
  })

  it("places every reading exactly once", () => {
    const all = [
      reading("a", 1, 1),
      reading("b", 1),
      reading("c", 2, 2),
      reading("d"),
      reading("e", 4, 4),
    ]
    const placed = groupIntoShelves(all, "General").flatMap((s) => s.items)
    expect(placed).toHaveLength(all.length)
    expect(new Set(placed.map((r) => r.id)).size).toBe(all.length)
  })

  it("returns no shelves for an empty bundle", () => {
    expect(groupIntoShelves([], "General")).toEqual([])
  })
})
