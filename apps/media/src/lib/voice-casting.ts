import { createHash } from "node:crypto"

export type CastGender = "female" | "male"

/**
 * Single source of truth for voice casting.
 *
 * Priority for dialogue speakers:
 *   1. Explicit per-conversation override (ambiguous names)
 *   2. Named pattern (Herr/Mr → male, Frau/Mrs/Ms → female)
 *   3. Known first names (Anna, Marco, …)
 *   4. Order rule: speaker who talks FIRST in the dialogue = male,
 *      the other = female. Order is by first turn appearance, NOT
 *      speakers[] array order.
 *
 * Neutral narrator content: deterministic hash of the manifest key (~50/50
 * male/female corpus-wide, stable per entry). Talker variability improves
 * generalization to novel talkers.
 */

/** convId:speakerId → gender for named speakers. */
const EXPLICIT_SPEAKERS: Record<string, CastGender> = {
  // de b1/b2 named pairs
  "de-conv-017:interviewer": "male", // Herr Weber
  "de-conv-017:candidate": "female", // Frau Schneider
  "de-conv-018:arzt": "female", // Dr. Klein, pairs with Herr Berg
  "de-conv-018:patient": "male", // Herr Berg
  "de-conv-019:vermieter": "female", // Frau Lorenz
  "de-conv-019:interessent": "male", // Herr Vogt
  "de-conv-020:angestellte": "female", // Frau Krüger
  "de-conv-020:kunde": "male", // Herr Albrecht
  "de-conv-021:a": "male", // Jonas
  "de-conv-021:b": "female", // Miriam
  "de-conv-022:a": "female", // Nina
  "de-conv-022:b": "male", // Tom
  "de-conv-023:anna": "female", // Anna
  "de-conv-023:marco": "male", // Marco
  "de-conv-024:vera": "female", // Frau Vogel
  "de-conv-024:tobias": "male", // Herr Klein
  "de-conv-025:lisa": "female", // Lisa
  "de-conv-025:paul": "male", // Paul
  "de-conv-026:chef": "female", // Frau Berger
  "de-conv-026:mitarbeiter": "male", // Herr Novak
  "de-conv-027:arzt": "male", // Dr. Braun, pairs with Frau Yilmaz
  "de-conv-027:patient": "female", // Frau Yilmaz
  // de a1/a2 named
  "de-conv-002:anna": "female",
  "de-conv-002:max": "male",
  "de-conv-007:a": "female", // Anna
  "de-conv-007:b": "male", // Ben
  "de-conv-011:cashier": "female", // Kassiererin (-in suffix)
  "de-conv-015:anna": "female",
  "de-conv-015:ben": "male",
  // en named
  "en-conv-001:a": "male", // Alex, pairs with Maya
  "en-conv-001:b": "female", // Maya
  "en-conv-002:a": "male", // Liam
  "en-conv-002:b": "female", // Sofia
  "en-conv-008:a": "female", // Anna
  "en-conv-008:b": "male", // Ben
  // zh tutor/user (tutor named 李明 once — male; user = learner, contrast female)
  "zh:tutor": "male",
  "zh:user": "female",
  // curriculum dialogues (named)
  "curriculum:李明": "male",
  "curriculum:Ana": "female",
}

const MALE_TITLE = /^(herr|mr\.?|sr\.?)\b/i
const FEMALE_TITLE = /^(frau|mrs?\.?|ms\.?|miss|sra\.?)\b/i

const FEMALE_NAMES = new Set(
  [
    "anna",
    "miriam",
    "nina",
    "lisa",
    "maya",
    "sofia",
    "ana",
    "lena",
    "nora",
  ].map((s) => s.toLowerCase())
)
const MALE_NAMES = new Set(
  ["max", "ben", "marco", "paul", "tom", "jonas", "liam", "alex", "李明"].map(
    (s) => s.toLowerCase()
  )
)

/** Feminine-marked role nouns (German -in suffix etc.). */
const FEMALE_ROLE = /(kassiererin|ärztin|verkäuferin|lehrerin|kollegin)$/i

function nameLookup(name: string): CastGender | undefined {
  const n = name.trim()
  if (!n) return undefined
  if (MALE_TITLE.test(n)) return "male"
  if (FEMALE_TITLE.test(n)) return "female"
  if (FEMALE_ROLE.test(n)) return "female"
  const first = n.split(/[\s(]/)[0].toLowerCase()
  if (FEMALE_NAMES.has(first)) return "female"
  if (MALE_NAMES.has(first)) return "male"
  return undefined
}

/**
 * Resolve dialogue speaker → gender.
 * @param convId conversation id (or "zh" / "curriculum" namespace)
 * @param speakerId speaker id as in turns/dialogue
 * @param speakerName display name from speakers[] (if any)
 * @param firstSpoken true if this speaker talks first in the dialogue
 */
export function speakerGender(
  convId: string,
  speakerId: string,
  speakerName: string | undefined,
  firstSpoken: boolean
): CastGender {
  const explicit =
    EXPLICIT_SPEAKERS[`${convId}:${speakerId}`] ??
    (convId === "zh" ? EXPLICIT_SPEAKERS[`zh:${speakerId}`] : undefined) ??
    (speakerName ? EXPLICIT_SPEAKERS[`curriculum:${speakerName}`] : undefined)
  if (explicit) return explicit
  if (speakerName) {
    const byName = nameLookup(speakerName)
    if (byName) return byName
  }
  const byId = nameLookup(speakerId)
  if (byId) return byId
  return firstSpoken ? "male" : "female"
}

/** Reading ids whose narrator follows a clear protagonist. */
const PROTAGONIST_NARRATOR: Record<string, CastGender> = {
  "r-wo-de-yitian": "female", // 我叫安娜
  "r-wo-de-laoshi": "female", // 老师…她
  "r-wo-de-pengyou": "female", // 好朋友…她
  "r-shengri-kuaile": "female", // 妹妹…她
  "r-wo-de-zhongwen-laoshi": "female", // 老师…她
  "r-wo-de-pengyou-xiaoming": "male", // 小明…他
  "r-de-b2-2-klimaschutz": "female", // Nora
  "r-de-b1-5-technik": "female", // Lena
  "r-de-a2-4-geburtstag": "female", // Anna
  "r-de-a2-2-arztbesuch": "male", // Markus
  "r-de-b1-1-arbeit": "male", // Thomas
  "r-de-b2-5-reisen": "male", // Jonas
}

/** Readings that are dialogues → split per speaker line. */
export const DIALOG_READINGS = new Set(["r-zai-fandian"])

/** Deterministic ~50/50 narrator gender from any stable key. */
export function hashGender(key: string): CastGender {
  const digest = createHash("md5").update(key).digest()
  return digest[0] % 2 === 0 ? "female" : "male"
}

/** Narrator gender for a whole reading (protagonist wins, else hash). */
export function readingGender(readingId: string): CastGender {
  return PROTAGONIST_NARRATOR[readingId] ?? hashGender(`reading:${readingId}`)
}
