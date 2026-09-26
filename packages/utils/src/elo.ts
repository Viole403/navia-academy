/**
 * The adaptive exam's rating maths.
 *
 * Lives here rather than in either client because three places have to agree on
 * it: the web session, the mobile session, and the Go backend, which replays the
 * answer log to recompute the rating and refuse the client's own number. A third
 * copy would be a third way to disagree.
 *
 * Nothing in this file touches React or the DOM, so the same code runs under
 * Next.js and Hermes unchanged.
 */

export type EloExamType = "hsk" | "tocfl" | "goethe" | "jlpt" | "toefl"

/**
 * The minimum a word needs for its difficulty to be derivable.
 *
 * `examMappings` is typed loosely on purpose: the clients declare it as an
 * interface with named exam keys, which has no index signature and so is not
 * assignable to a `Record`. What matters here is only that the four exams can
 * be read off it, so a shape with those optional keys is accepted.
 */
export interface EloSeed {
  id: string
  level?: number
  examMappings?:
    | Record<string, string | number | undefined>
    | {
        hsk?: string | number
        tocfl?: string | number
        goethe?: string | number
        jlpt?: string | number
        toefl?: string | number
      }
}

/** Rating at the centre of each exam level. */
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
  // TOEFL has four score bands, not seven levels, so there are four centres. They
  // are the same values the other exams use for the same ability, which is why
  // they are borrowed rather than invented: a learner rated 1150 is rated 1150
  // whether the item was tagged Goethe B1, JLPT N3 or TOEFL 61-90. Missing this
  // table was not a cosmetic gap — recommendedLevel fell through to
  // levels[0] and reported "0-30" for every TOEFL result, so a perfect score and
  // a blank paper produced the same band.
  toefl: {
    "0-30": 550,
    "31-60": 850,
    "61-90": 1150,
    "91-120": 1500,
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

/** Level ladders, used to name a level for a rating. */
export const EXAM_LEVELS: Record<string, string[]> = {
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

function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/**
 * Spreads items inside a level so two words of the same level do not produce the
 * same target — without it every HSK 3 word would be exactly 1150 and the
 * adaptive step would have nothing to discriminate on.
 */
function jitter(id: string): number {
  return (hashId(id) % 61) - 30
}

function levelCenter(level: number): number {
  return CENTER.hsk[level] ?? DEFAULT_ELO
}

/**
 * An item's difficulty. Priority: hsk > jlpt > goethe > tocfl > toefl > level >
 * default. Seeded from the id, so a word's difficulty is the same on every device
 * and in every session — otherwise the same word would be a different challenge
 * to different learners.
 */
export function eloOf(word: EloSeed): number {
  const m = word.examMappings
  if (m?.hsk) return CENTER.hsk[m.hsk] + jitter(word.id)
  if (m?.jlpt) return CENTER.jlpt[m.jlpt] + jitter(word.id)
  if (m?.goethe) return CENTER.goethe[m.goethe] + jitter(word.id)
  if (m?.tocfl) return CENTER.tocfl[m.tocfl] + jitter(word.id)
  // TOEFL last, because it is the only exam that tags English and so can never
  // collide with the four above. Without this branch an English word fell through
  // to levelCenter, which reads CENTER.hsk — an English item was being rated on
  // the Mandarin scale, and a word with no level at all took the default.
  if (m?.toefl) return CENTER.toefl[m.toefl] + jitter(word.id)
  return levelCenter(word.level as number) + jitter(word.id)
}

export function cefrBandOf(elo: number): CefrBand {
  for (const b of CEFR_BANDS) {
    if (elo >= b.min && elo < b.max) return b
  }
  const last = CEFR_BANDS[CEFR_BANDS.length - 1]
  return elo >= last.max ? last : CEFR_BANDS[0]
}

function bandIndex(elo: number): number {
  return CEFR_BANDS.findIndex((b) => b === cefrBandOf(elo))
}

/**
 * The exam level a rating corresponds to, for naming a result.
 *
 * Found by inverting the exam's own centre table rather than by mapping the
 * CEFR band index onto the level index. The two only agree when the exam has
 * exactly six levels: JLPT has five, and the linear version reported N2 for a
 * rating of 1850 — which is the centre the table itself gives to N1.
 */
export function recommendedLevel(examType: string, elo: number): string {
  const levels = EXAM_LEVELS[examType]
  if (!levels || levels.length === 0) return ""
  const centres = CENTER[examType]
  if (!centres) return levels[0]

  let best = levels[0]
  let bestDist = Number.POSITIVE_INFINITY
  for (const level of levels) {
    const centre = centres[level]
    if (centre === undefined) continue
    const dist = Math.abs(centre - elo)
    if (dist < bestDist) {
      bestDist = dist
      best = level
    }
  }
  return best
}

/** Probability that an `eloA`-rated learner answers an `eloB`-rated item. */
export function eloExpected(eloA: number, eloB: number): number {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400))
}

/**
 * The update, with K decaying as the session goes on.
 *
 * It is not "right answer, harder next one". The step is the gap between what
 * happened and what was expected, so it is largest when a learner beats
 * something above their current rating and near zero when they beat something
 * below it. Answering an easy item correctly demonstrates almost nothing new, so
 * the rating barely moves; that is what stops a learner inflating their estimate
 * by grinding content they already know, and what keeps the estimate anchored on
 * their frontier rather than on their best day.
 *
 * K falls from 36 to a floor of 4 so the last few questions cannot swing the
 * result on a single answer.
 *
 * Mirrored in the backend's recomputeCatRating. Changing one means changing both.
 */
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

/**
 * Stopping rule.
 *
 * MIN_QUESTIONS is a floor for the case where the spread converges absurdly
 * early; in practice the spread term is what binds. `eloSd` only reaches the
 * target at 20 answers, so a session runs twenty questions even though twelve is
 * the stated minimum. MAX_QUESTIONS then guards the case where it never
 * converges at all.
 */
export const MIN_QUESTIONS = 12
export const MAX_QUESTIONS = 50
export const SEM_TARGET = 60

/**
 * Spread proxy: shrinks as answers come in, with a floor of 30 because a set of
 * items from one exam level cannot pin the estimate down any further.
 *
 * Note this is linear in the number answered, not a standard error — at 20
 * answers it reaches the target of 60, and then it is the floor for ever after.
 */
export function eloSd(answered: number): number {
  return Math.max(30, 120 - answered * 3)
}

export function shouldStop(answered: number, poolExhausted: boolean): boolean {
  if (poolExhausted) return true
  if (answered >= MAX_QUESTIONS) return true
  return answered >= MIN_QUESTIONS && eloSd(answered) <= SEM_TARGET
}

/** Anything the adaptive step can pick from. */
export interface EloCandidate {
  id: string
  elo: number
}

export type CatItemFormat = "meaning" | "listening" | "reading"

/**
 * The next item: the one closest to the current estimate, drawn from the three
 * closest.
 *
 * Taking the single closest would be the most informative item on paper, but it
 * over-exposes whichever band the estimate happens to sit on — a learner parked
 * near one band would see almost nothing else. Three candidates with a small
 * random spread around the target keeps the measurement informative while
 * letting the learner move.
 */
export function pickNext(
  items: EloCandidate[],
  theta: number,
  usedIds: Set<string>,
  rand: () => number = Math.random
): EloCandidate | null {
  const unused = items.filter((i) => !usedIds.has(i.id))
  if (unused.length === 0) return null
  const target = theta + (rand() * 60 - 30)
  const ranked = [...unused].sort(
    (a, b) => Math.abs(a.elo - target) - Math.abs(b.elo - target)
  )
  const n = Math.min(3, ranked.length)
  return ranked[Math.floor(rand() * n)]
}

const FORMATS: CatItemFormat[] = ["meaning", "listening", "reading"]
const FORMAT_HISTORY_WINDOW = 5

/**
 * Rotates the question format so a session does not become twenty meaning
 * questions in a row, which would measure vocabulary recognition only.
 */
export function pickLeastUsedFormat(history: CatItemFormat[]): CatItemFormat {
  const window = history.slice(-FORMAT_HISTORY_WINDOW)
  const counts = new Map<CatItemFormat, number>()
  for (const f of FORMATS) counts.set(f, 0)
  for (const f of window) counts.set(f, (counts.get(f) ?? 0) + 1)
  let best: CatItemFormat = FORMATS[0]
  for (const f of FORMATS) {
    if ((counts.get(f) ?? 0) < (counts.get(best) ?? 0)) best = f
  }
  return best
}

/** Bands where the learner was wrong, most-missed first. */
export function weakBandsOf(
  log: { elo: number; correct: boolean }[]
): string[] {
  const wrong = log.filter((a) => !a.correct)
  if (wrong.length === 0) return []
  const byBand = new Map<string, number>()
  for (const a of wrong) {
    const b = cefrBandOf(a.elo).name
    byBand.set(b, (byBand.get(b) ?? 0) + 1)
  }
  return [...byBand.entries()].sort((x, y) => y[1] - x[1]).map(([band]) => band)
}
