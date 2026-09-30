import type { Reading } from "@/types/api"

/**
 * Group readings into the shelves the Books screen renders.
 *
 * `level` is a number in every published language, so the shelf key has to be a
 * string: keying a Map<string, …> on the raw number leaves numeric keys in the
 * entry list, and the sort's localeCompare then threw `undefined is not a
 * function`, taking the screen down for every language.
 */
export interface Shelf {
  label: string
  items: Reading[]
}

function rank(label: string): number {
  const n = Number(label.replace(/^HSK\s*/i, ""))
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER
}

export function groupIntoShelves(
  readings: Reading[],
  generalLabel: string
): Shelf[] {
  const map = new Map<string, Reading[]>()
  for (const r of readings) {
    const label =
      String(r.level ?? (r.hsk ? `HSK ${r.hsk}` : "")) || generalLabel
    const list = map.get(label) ?? []
    list.push(r)
    map.set(label, list)
  }
  return [...map.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([label, items]) => ({ label, items }))
}
