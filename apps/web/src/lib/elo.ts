import type { VocabWord, ExamType } from "@/types"

const CENTER: Record<string, Record<string, number>> = {
  hsk: { 1: 550, 2: 850, 3: 1150, 4: 1500, 5: 1700, 6: 1850, 7: 2200 },
  jlpt: { N5: 550, N4: 850, N3: 1150, N2: 1700, N1: 1850 },
  goethe: { A1: 550, A2: 850, B1: 1150, B2: 1500, C1: 1850, C2: 2200 },
  tocfl: {
    "Novice 1": 400,
    "Novice 2": 500,
    "Level 1": 550,
    "Level 2": 850,
    "Level 3": 1150,
    "Level 4": 1500,
    "Level 5": 1850,
  },
}

export const DEFAULT_ELO = 550

export interface CefrBand {
  name: "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
  min: number
  max: number
  center: number
}

export const CEFR_BANDS: CefrBand[] = [
  { name: "A1", min: 400, max: 700, center: 550 },
  { name: "A2", min: 700, max: 1000, center: 850 },
  { name: "B1", min: 1000, max: 1300, center: 1150 },
  { name: "B2", min: 1300, max: 1700, center: 1500 },
  { name: "C1", min: 1700, max: 2000, center: 1850 },
  { name: "C2", min: 2000, max: 2400, center: 2200 },
]

function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function jitter(id: string): number {
  return (hashId(id) % 61) - 30
}

function levelCenter(level: number): number {
  const c = CENTER.hsk[level]
  return c ?? DEFAULT_ELO
}

/**
 * Deterministic difficulty seeding per blueprint §3.3.
 * Priority: hsk > jlpt > goethe > tocfl > word.level > default (A1).
 */
export function eloOf(
  word: Pick<VocabWord, "id" | "level" | "examMappings">
): number {
  const m = word.examMappings
  if (m?.hsk) return CENTER.hsk[m.hsk] + jitter(word.id)
  if (m?.jlpt) return CENTER.jlpt[m.jlpt] + jitter(word.id)
  if (m?.goethe) return CENTER.goethe[m.goethe] + jitter(word.id)
  if (m?.tocfl) return CENTER.tocfl[m.tocfl] + jitter(word.id)
  return levelCenter(word.level) + jitter(word.id)
}

export function cefrBandOf(elo: number): CefrBand {
  for (const b of CEFR_BANDS) {
    if (elo >= b.min && elo < b.max) return b
  }
  return elo >= CEFR_BANDS[CEFR_BANDS.length - 1].max
    ? CEFR_BANDS[CEFR_BANDS.length - 1]
    : CEFR_BANDS[0]
}

function bandIndex(elo: number): number {
  return CEFR_BANDS.findIndex((b) => b === cefrBandOf(elo))
}

const EXAM_LEVELS: Record<string, string[]> = {
  hsk: ["1", "2", "3", "4", "5", "6", "7"],
  tocfl: [
    "Novice 1",
    "Novice 2",
    "Level 1",
    "Level 2",
    "Level 3",
    "Level 4",
    "Level 5",
  ],
  goethe: ["A1", "A2", "B1", "B2", "C1", "C2"],
  jlpt: ["N5", "N4", "N3", "N2", "N1"],
  toefl: ["0-30", "31-60", "61-90", "91-120"],
}

/** Map an Elo estimate to the nearest level label for an exam type. */
export function recommendedLevel(examType: ExamType, elo: number): string {
  const levels = EXAM_LEVELS[examType]
  if (!levels) return levels?.[0] ?? ""
  const bi = bandIndex(elo)
  const idx = Math.round((bi / (CEFR_BANDS.length - 1)) * (levels.length - 1))
  return levels[Math.max(0, Math.min(levels.length - 1, idx))]
}

export function eloExpected(eloA: number, eloB: number): number {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400))
}

/** Elo update with K-factor decay over questions answered (blueprint §4.3). */
export function eloUpdate(
  theta: number,
  itemElo: number,
  correct: boolean,
  questionsAnswered: number
): number {
  const k = Math.max(4, 36 - questionsAnswered * 2)
  const expected = eloExpected(theta, itemElo)
  const actual = correct ? 1 : 0
  return theta + k * (actual - expected)
}
