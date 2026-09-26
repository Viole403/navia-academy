/**
 * Comparing what a learner said against what they were asked to say.
 *
 * The pure half of the speech-recognition support: no API, no device, so both
 * clients and the tests use the same judgement. The recogniser itself is
 * platform-specific — the Web Speech API in the browser, a native module on
 * phone — but deciding whether a transcript counts is not, and that decision is
 * the part worth agreeing on.
 */

/** Speech-recognition locales per learning language. */
const STT_LOCALES: Record<string, string> = {
  zh: "zh-CN",
  de: "de-DE",
  en: "en-US",
  ja: "ja-JP",
}

export function sttLocale(language: string): string {
  return STT_LOCALES[language] ?? "en-US"
}

/**
 * Reduce a transcript to the part worth comparing.
 *
 * Normalising to NFKC folds the compatibility forms a recogniser and a typed
 * phrase disagree about — full-width punctuation, accented Latin that looks
 * composed one way and another. Case is dropped, and so is everything that is
 * not a letter or a digit, which removes the spacing a recogniser inserts
 * between syllables. What is left is the text itself.
 */
export function normalizeTranscript(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
}

/**
 * Whether a transcript matches a target exactly, once both are normalised.
 *
 * This is the bar a drill has to clear, and it is a high one: a recogniser
 * rarely returns a phrase character for character, so a miss here means "not
 * demonstrably right" rather than "wrong". Short targets hold up — 你好 comes
 * back as 你好 — and long ones get brittle. Use `transcriptSimilarity` to show
 * how close it was, and treat the gap between the two as the learner's signal.
 */
export function matchTranscript(transcript: string, target: string): boolean {
  if (!transcript || !target) return false
  return normalizeTranscript(transcript) === normalizeTranscript(target)
}

/**
 * How much of the target the transcript covered, between 0 and 1.
 *
 * Word error rate expressed as a score: the share of target words the
 * transcript got right, counting a substitution as half a miss and a deletion
 * as a full one. Cheap and order-preserving, which matters — reordering a
 * phrase should not read as a perfect score.
 *
 * This is not a pronunciation score. It says how much of the expected text was
 * recognised, and nothing about how it was said: tone, stress and vowel
 * quality are all invisible here.
 */
export function transcriptSimilarity(
  transcript: string,
  target: string,
  lang = "en"
): number {
  const t = words(forWords(transcript, lang), lang)
  const g = words(forWords(target, lang), lang)
  if (g.length === 0) return 0
  if (t.length === 0) return 0

  // Levenshtein over words, substitution charged half of an edit.
  const prev = new Array<number>(g.length + 1)
  const cur = new Array<number>(g.length + 1)
  for (let j = 0; j <= g.length; j++) prev[j] = j
  for (let i = 1; i <= t.length; i++) {
    cur[0] = i
    for (let j = 1; j <= g.length; j++) {
      const sub = prev[j - 1] + (t[i - 1] === g[j - 1] ? 0 : 0.5)
      const del = prev[j] + 1
      const ins = cur[j - 1] + 1
      cur[j] = Math.min(sub, del, ins)
    }
    for (let j = 0; j <= g.length; j++) prev[j] = cur[j]
  }
  return Math.max(0, 1 - prev[g.length] / g.length)
}

/**
 * The same reduction, but keeping word boundaries.
 *
 * `normalizeTranscript` collapses whitespace because an exact comparison wants
 * one string; splitting that into words afterwards is impossible, since the
 * separators are already gone. So this keeps spaces and drops only the
 * punctuation, which is what a per-word comparison actually needs.
 */
function forWords(s: string, lang: string): string {
  const folded = s.normalize("NFKC").toLowerCase()
  if (lang === "zh" || lang === "ja") return folded
  return folded.replace(/[^\p{L}\p{N}\s]+/gu, " ")
}

/**
 * Split into comparable units.
 *
 * A recogniser does not agree on where words break: Chinese comes back
 * character by character with spaces, Japanese mixes kanji runs and kana. So
 * CJK is compared per character and everything else per whitespace-delimited
 * word, which keeps "我很好" from being one unmatchable blob.
 */
function words(normalized: string, lang: string): string[] {
  if (lang === "zh" || lang === "ja") {
    return Array.from(normalized).filter((c) => c.trim() !== "")
  }
  return normalized.split(/\s+/).filter(Boolean)
}
