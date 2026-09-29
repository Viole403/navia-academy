import type { VocabWord } from "@/types/api"

/**
 * Word categories.
 *
 * The content has no category field of its own, but it does carry `pos` (14
 * values) and free-form `tags`. Six buckets are derived from those two, so the
 * category row filters something real rather than being a decorative strip of
 * tiles that filter nothing.
 *
 * Every word lands in exactly one bucket. A `tags`-based theme is checked before
 * the `pos` fallback so "time" and "places" survive the flattening rather than
 * disappearing into `other`.
 */
export type CategoryId =
  "verbs" | "nouns" | "descriptors" | "grammar" | "timePlace" | "other"

export interface Category {
  id: CategoryId
  /** Glyph shown in the tile. */
  glyph: string
  /** i18n key for the label — the tiles are labels, not data. */
  labelKey: string
  /** Pastel fill for the tile, resolved against the live paper palette. */
}

const POS_BUCKETS: Record<string, CategoryId> = {
  verb: "verbs",
  "modal verb": "verbs",
  noun: "nouns",
  "measure word": "nouns",
  numeral: "nouns",
  pronoun: "nouns",
  adjective: "descriptors",
  adverb: "descriptors",
  conjunction: "grammar",
  preposition: "grammar",
  particle: "grammar",
  interjection: "grammar",
  phrase: "other",
  other: "other",
}

const TAG_BUCKETS: Record<string, CategoryId> = {
  time: "timePlace",
  places: "timePlace",
  location: "timePlace",
  school: "nouns",
  work: "nouns",
  family: "nouns",
  people: "nouns",
  food: "nouns",
  numbers: "nouns",
  money: "nouns",
  body: "nouns",
  nature: "nouns",
}

export function categoryOf(word: VocabWord): CategoryId {
  const tags = (word.tags ?? []) as string[]
  for (const tag of tags) {
    const hit = TAG_BUCKETS[tag.toLowerCase()]
    if (hit) return hit
  }
  const pos = typeof word.pos === "string" ? word.pos.toLowerCase() : ""
  return POS_BUCKETS[pos] ?? "other"
}

// No per-category fill: the pastel hexes this used to carry were light-mode
// only, so on a dark page ink on them measured 1.00:1. The tile takes a
// palette surface and the hanzi glyph carries the category.
export const CATEGORIES: Category[] = [
  { id: "verbs", glyph: "動", labelKey: "cat.verbs" },
  { id: "nouns", glyph: "名", labelKey: "cat.nouns" },
  {
    id: "descriptors",
    glyph: "形",
    labelKey: "cat.descriptors",
  },
  { id: "grammar", glyph: "法", labelKey: "cat.grammar" },
  { id: "timePlace", glyph: "時", labelKey: "cat.timePlace" },
  { id: "other", glyph: "其", labelKey: "cat.other" },
]
