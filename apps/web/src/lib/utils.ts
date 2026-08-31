import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h} h ${m} min` : `${h} h`
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function sample<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n)
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

const PINYIN_TONE_MAP: Record<string, string> = {
  ā: "a",
  á: "a",
  ǎ: "a",
  à: "a",
  ē: "e",
  é: "e",
  ě: "e",
  è: "e",
  ī: "i",
  í: "i",
  ǐ: "i",
  ì: "i",
  ō: "o",
  ó: "o",
  ǒ: "o",
  ò: "o",
  ū: "u",
  ú: "u",
  ǔ: "u",
  ù: "u",
  ǖ: "ü",
  ǘ: "ü",
  ǚ: "ü",
  ǜ: "ü",
  Ā: "a",
  Á: "a",
  Ǎ: "a",
  À: "a",
  Ē: "e",
  É: "e",
  Ě: "e",
  È: "e",
  Ī: "i",
  Í: "i",
  Ǐ: "i",
  Ì: "i",
  Ō: "o",
  Ó: "o",
  Ǒ: "o",
  Ò: "o",
  Ū: "u",
  Ú: "u",
  Ǔ: "u",
  Ù: "u",
  Ǖ: "ü",
  Ǘ: "ü",
  Ǚ: "ü",
  Ǜ: "ü",
}

/** Strip pinyin tone marks (bā → ba) for tone-insensitive search matching. */
export function stripPinyinTones(s: string): string {
  return s.replace(
    /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙǕǗǙǛ]/g,
    (ch) => PINYIN_TONE_MAP[ch] ?? ch
  )
}

/** Split pinyin syllables and map to tone classes for colored rendering. */
export function toneClassForSyllable(syllable: string): string {
  const toneMarks: Record<string, number> = {
    ā: 1,
    ē: 1,
    ī: 1,
    ō: 1,
    ū: 1,
    ǖ: 1,
    á: 2,
    é: 2,
    í: 2,
    ó: 2,
    ú: 2,
    ǘ: 2,
    ǎ: 3,
    ě: 3,
    ǐ: 3,
    ǒ: 3,
    ǔ: 3,
    ǚ: 3,
    à: 4,
    è: 4,
    ì: 4,
    ò: 4,
    ù: 4,
    ǜ: 4,
  }
  for (const ch of syllable) {
    if (toneMarks[ch]) return `tone-${toneMarks[ch]}`
  }
  return "tone-0"
}

/**
 * Map a zhuyin (Bopomofo) syllable to its tone class. The tone mark is the
 * final character: ˙ neutral, ˊ 2nd, ˇ 3rd, ˋ 4th; no mark = 1st.
 */
export function toneClassForZhuyinSyllable(syllable: string): string {
  const last = syllable.slice(-1)
  if (last === "˙") return "tone-5"
  if (last === "ˊ") return "tone-2"
  if (last === "ˇ") return "tone-3"
  if (last === "ˋ") return "tone-4"
  return "tone-1"
}
