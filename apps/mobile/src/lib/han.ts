/**
 * Han content detection.
 *
 * "Is this character script?" is not the same question as "does this word have
 * stroke data?", and conflating them is how a feature ends up silently missing
 * rather than visibly broken.
 *
 *  - Japanese is written with kanji, and this app teaches 8,355 Japanese words
 *    across 2,091 distinct kanji. Every one of them renders; none of them are
 *    Latin, so a check for a "character script" that reads the language is right,
 *    but one that looks for a `hanzi` *field* is wrong — Japanese entries carry
 *    their text in `text`, and asking for `hanzi` finds nothing.
 *  - Kana carry no stroke order. So a Japanese word can be character-script and
 *    still have nothing to write, which is why the gates below ask for an
 *    ideograph rather than for the language.
 */

const IDEOGRAPH = /[㐀-䶿一-鿿豈-﫿\u{20000}-\u{2a6df}]/u

/** Every Han ideograph in the string, in order, de-duplicated. */
export function hanChars(text: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const ch of text ?? "") {
    if (IDEOGRAPH.test(ch) && !seen.has(ch)) {
      seen.add(ch)
      out.push(ch)
    }
  }
  return out
}

/** True when there is at least one ideograph — i.e. stroke order may exist. */
export function hasHan(text: string): boolean {
  return hanChars(text).length > 0
}
