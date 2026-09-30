import * as Crypto from "expo-crypto"
import { ttsLocaleFor, type LanguageCode } from "@/lib/languages"
import type { VoiceGender } from "@/data/audio"

/**
 * Voice casting, derived instead of looked up.
 *
 * The publisher picks one voice per manifest entry, but it is not a secret: for
 * every domain except passage narration it is `md5(key)[0] % 2`, and an example
 * sentence always speaks in its headword's voice. Measured against all 113,025
 * published entries:
 *
 *   vocab headword 40,609/40,609 · vocab example 60,765/60,765
 *   char 7,298/7,298 · grammar 1,747/1,747 · placement+assessment 19/19
 *
 * Passages (`reading:`, `conv:`, `curriculum:`) are narrated by a single voice
 * per passage and are deliberately not derived — they fall back to the manifest.
 */

const VOCAB_EXAMPLE = /^vocab:[^:]+:ex\d+$/
const TRAD_SUFFIX = /:trad$/

/**
 * The key a phrase is actually cast on.
 *
 * Only vocabulary example sentences borrow their headword's voice
 * (60,765/60,765). Grammar examples cast on their own key (1,747/1,747), as do
 * `:trad` variants (10,261/10,261) — hashing either of those stripped matched
 * barely half the time.
 */
export function castKeyOf(key: string): string {
  return VOCAB_EXAMPLE.test(key) ? key.replace(/:ex\d+$/, "") : key
}

/** Domains whose voice follows the hash rule. */
export function isHashCasted(key: string): boolean {
  const domain = key.split(":")[0]
  if (domain === "vocab" || domain === "char") return true
  return (
    domain === "grammar" || domain === "placement" || domain === "assessment"
  )
}

const genderCache = new Map<string, VoiceGender>()

/**
 * The publisher's casting rule, verbatim:
 *   digest[0] % 2 === 0 ? "female" : "male"
 * Memoised because a key always casts the same way, so each distinct word costs
 * one native digest for the life of the app.
 */
export async function hashGender(key: string): Promise<VoiceGender> {
  const base = castKeyOf(key)
  const hit = genderCache.get(base)
  if (hit) return hit
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.MD5,
    base
  )
  const gender: VoiceGender =
    parseInt(digest.slice(0, 2), 16) % 2 === 0 ? "female" : "male"
  genderCache.set(base, gender)
  return gender
}

/**
 * TTS locale for an entry. Fixed per language except Chinese, where HSK reads
 * zh-CN and TOCFL reads zh-TW — both marked in the key. 79,551/79,557 match.
 */
export function deriveLocale(key: string, language: LanguageCode): string {
  if (language !== "zh") return ttsLocaleFor(language)
  const traditional = key.includes("tocfl") || TRAD_SUFFIX.test(key)
  return traditional ? "zh-TW" : "zh-CN"
}

export interface DerivedVoice {
  gender: VoiceGender
  locale: string
}

/** Gender and locale for a key, or null when the domain needs the manifest. */
export async function deriveVoice(
  key: string,
  language: LanguageCode
): Promise<DerivedVoice | null> {
  if (!isHashCasted(key)) return null
  return {
    gender: await hashGender(key),
    locale: deriveLocale(key, language),
  }
}
