import { useWindowDimensions } from "react-native"

/**
 * Content column.
 *
 * One place decides how wide the reading column is, because the answer is not a
 * constant and getting it wrong is what makes a screen "look like a responsive
 * website".
 *
 * On a phone the column is simply the window minus its margins — 390pt of
 * device becomes a 350pt column, and nothing needs a cap to achieve that. The
 * cap only earns its keep on a tablet or a browser, where an uncapped column
 * stretches a hand-arranged card across a metre of glass: a 300pt "Start
 * review" pill marooned in one corner of a 1024pt screen is not the same design
 * at a larger size, it is a broken one.
 *
 * So the cap is **not** 430 — it is whatever keeps the design's proportions
 * intact on a large surface, which grows with the window instead of pinning the
 * app to phone width forever. Beyond `WIDE` the column centres rather than
 * stretching, and inner grids lay themselves out in more columns.
 */

/** Below this the layout is phone-shaped: no cap, column is window − gutters. */
const WIDE = 600

/** Content cap on a large surface. Comfortable for a card, not a wall of text. */
const MAX_COLUMN = 720

/** Horizontal margin. Text and cards align to this; decoration does not. */
export const GUTTER = 20

export interface ContentLayout {
  /** Width the column should occupy. */
  column: number
  /** True when the surface is tablet-sized and the column is capped. */
  wide: boolean
  /** How many columns a tile grid should use at this width. */
  tileColumns: number
}

export function useContentLayout(): ContentLayout {
  const { width } = useWindowDimensions()
  return contentLayoutFor(width)
}

export function contentLayoutFor(width: number): ContentLayout {
  const available = width - GUTTER * 2
  const wide = available > WIDE
  const column = wide ? Math.min(available, MAX_COLUMN) : available
  const tileColumns = column >= 720 ? 6 : column >= 560 ? 5 : 4
  return { column, wide, tileColumns }
}
