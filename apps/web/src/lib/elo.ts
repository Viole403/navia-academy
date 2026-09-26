/**
 * The rating maths moved to `@navia/utils` so the mobile session runs the same
 * engine as this one instead of a band walk that only borrowed the field names.
 * The backend mirrors the same formula in Go, so there is now one TypeScript
 * implementation and one Go one, rather than three JavaScript ones.
 */
export {
  DEFAULT_ELO,
  CEFR_BANDS,
  EXAM_LEVELS,
  MIN_QUESTIONS,
  MAX_QUESTIONS,
  SEM_TARGET,
  cefrBandOf,
  eloExpected,
  eloOf,
  eloSd,
  eloUpdate,
  pickLeastUsedFormat,
  pickNext,
  recommendedLevel,
  shouldStop,
  weakBandsOf,
} from "@navia/utils"

export type {
  CatItemFormat,
  CefrBand,
  EloCandidate,
  EloExamType,
  EloSeed,
} from "@navia/utils"
