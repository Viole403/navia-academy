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
  /** Glyph shown in the tile for a CJK track. */
  glyph: string
  /** Initial shown in the tile for a non-CJK track. */
  letter: string
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
// palette surface and the glyph carries the category.
export const CATEGORIES: Category[] = [
  { id: "verbs", glyph: "動", letter: "V", labelKey: "cat.verbs" },
  { id: "nouns", glyph: "名", letter: "N", labelKey: "cat.nouns" },
  {
    id: "descriptors",
    glyph: "形",
    letter: "D",
    labelKey: "cat.descriptors",
  },
  { id: "grammar", glyph: "法", letter: "G", labelKey: "cat.grammar" },
  {
    id: "timePlace",
    glyph: "時",
    letter: "T",
    labelKey: "cat.timePlace",
  },
  { id: "other", glyph: "其", letter: "O", labelKey: "cat.other" },
]

/**
 * The tile glyph for a language.
 *
 * The hanzi marks read as vocabulary to a Chinese learner and as nothing at all
 * to a German one, so non-CJK tracks get the category initial instead.
 */
export function categoryGlyph(category: Category, charScript: boolean): string {
  return charScript ? category.glyph : category.letter
}
