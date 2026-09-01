import type { SrsCard, SrsGrade, SrsItemKind } from "@/types"
import type { TranslationKey } from "@/i18n/keys"
import { clamp } from "@/lib/utils"

/**
 * Spaced-repetition scheduler based on the SM-2 family of algorithms,
 * adapted for four grades (again / hard / good / easy) and a 0-100
 * mastery heuristic used across the product.
 */

const MIN_EASE = 1.3
const DEFAULT_EASE = 2.5

export function newCard(
  itemId: string,
  kind: SrsItemKind,
  due = new Date()
): SrsCard {
  return {
    itemId,
    kind,
    ease: DEFAULT_EASE,
    intervalDays: 0,
    repetitions: 0,
    lapses: 0,
    due: due.toISOString().slice(0, 10),
    mastery: 0,
  }
}

export function gradeCard(
  card: SrsCard,
  grade: SrsGrade,
  now = new Date()
): SrsCard {
  let { ease, intervalDays, repetitions, lapses, mastery } = card

  if (grade === 0) {
    // Forgotten: reset interval, penalize ease and mastery.
    repetitions = 0
    lapses += 1
    intervalDays = 0
    ease = Math.max(MIN_EASE, ease - 0.2)
    mastery = clamp(mastery - 25, 0, 100)
  } else {
    repetitions += 1
    if (grade === 1) {
      ease = Math.max(MIN_EASE, ease - 0.15)
      intervalDays = Math.max(1, Math.round(intervalDays * 1.2))
      mastery = clamp(mastery + 5, 0, 100)
    } else if (grade === 2) {
      intervalDays =
        repetitions === 1
          ? 1
          : repetitions === 2
            ? 3
            : Math.round(intervalDays * ease)
      mastery = clamp(mastery + 12, 0, 100)
    } else {
      ease = Math.min(3.0, ease + 0.1)
      intervalDays =
        repetitions === 1
          ? 2
          : repetitions === 2
            ? 5
            : Math.round(intervalDays * ease * 1.3)
      mastery = clamp(mastery + 18, 0, 100)
    }
    intervalDays = Math.min(intervalDays, 365)
  }

  const due = new Date(now)
  due.setDate(due.getDate() + (grade === 0 ? 0 : intervalDays))

  return {
    ...card,
    ease,
    intervalDays,
    repetitions,
    lapses,
    mastery,
    due: due.toISOString().slice(0, 10),
    lastReviewed: now.toISOString(),
  }
}

export function isDue(card: SrsCard, onDate = new Date()): boolean {
  return card.due <= onDate.toISOString().slice(0, 10)
}

export function masteryLabel(mastery: number): TranslationKey {
  if (mastery >= 85) return "srs.mastery.mastered"
  if (mastery >= 60) return "srs.mastery.consolidating"
  if (mastery >= 30) return "srs.mastery.learning"
  if (mastery > 0) return "srs.mastery.recent"
  return "srs.mastery.new"
}
