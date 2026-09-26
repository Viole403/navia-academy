import type { MatchingPair } from "@navia/types"

/**
 * The state of a matching question, and the rules for moving through it.
 *
 * Both clients run this. A matching question is a question about pairing, and
 * the things that can go wrong while pairing — assigning one right-hand item
 * to two left-hand items, leaving a row half-done, reading the learner's answer
 * back in an order the grader does not expect — are the same on a phone and on a
 * desktop. Keeping that here means the second client is written against a
 * tested contract rather than against the first one's component.
 *
 * A right-hand item used by one left-hand item is not offered to another, so the
 * columns cannot contradict each other.
 */

/** Which left-hand item is waiting for a partner, if any. */
export type Selected = string | null

/** Left-hand id to the right-hand item it has been given. */
export type Assignment = Record<string, string>

/**
 * Pick up a left-hand item, or put down the one already held.
 *
 * Selecting a row that already has a partner keeps that partner until a new one
 * is chosen, so a mis-tap does not throw away work. `assignRight` is what
 * releases a partner, and `unpair` is the deliberate way to clear a row.
 */
export function selectLeft(selected: Selected, id: string): Selected {
  return selected === id ? null : id
}

/** Give the selected left-hand item a partner. */
export function assignRight(
  assignment: Assignment,
  selected: Selected,
  right: string
): Assignment {
  if (selected === null) return assignment
  // A right-hand item belongs to one row. If it is spoken for, its previous row
  // goes back to unpaired rather than leaving two rows claiming the same item.
  const freed = Object.entries(assignment).find(([, v]) => v === right)
  const next: Assignment = { ...assignment }
  if (freed) delete next[freed[0]]
  next[selected] = right
  return next
}

/** Release a left-hand item's partner. */
export function unpair(assignment: Assignment, id: string): Assignment {
  if (!Object.prototype.hasOwnProperty.call(assignment, id)) return assignment
  const next = { ...assignment }
  delete next[id]
  return next
}

/** The right-hand items still available to pair. */
export function availableRight(
  pairs: MatchingPair[],
  assignment: Assignment
): string[] {
  const used = new Set(Object.values(assignment))
  return pairs.map((p) => p.right).filter((r) => !used.has(r))
}

/** Whether every left-hand item has a partner. */
export function isComplete(
  pairs: MatchingPair[],
  assignment: Assignment
): boolean {
  return pairs.every((p) =>
    Object.prototype.hasOwnProperty.call(assignment, p.id)
  )
}

/**
 * The answer to submit, or null while the question is unfinished.
 *
 * Keyed by pair id, which is what the grader compares against — a left-hand
 * item's position in the list is a display detail and must not be part of it.
 */
export function buildAnswer(
  pairs: MatchingPair[],
  assignment: Assignment
): Record<string, string> | null {
  if (!isComplete(pairs, assignment)) return null
  const answer: Record<string, string> = {}
  for (const p of pairs) answer[p.id] = assignment[p.id]
  return answer
}

/**
 * The share of a matching answer that is right, from 0 to 1.
 *
 * The Go service grades the submitted answer, and that is the number of record.
 * The browser also grades locally, because the web exam shows a result without
 * waiting on a round trip, so the two have to agree — otherwise the same paper
 * gets two different scores depending on which client it was taken on. This is
 * the browser's copy of `matchingCredit` in the service, and both are pinned by
 * tests over the same cases.
 *
 * Answered by pair id rather than by position, and extra keys are ignored, so a
 * learner cannot score above one by submitting more than they were asked for.
 */
export function scoreMatching(
  correct: Record<string, string> | undefined,
  given: unknown
): number {
  if (!correct || Object.keys(correct).length === 0) return 0
  const got =
    given && typeof given === "object" ? (given as Record<string, string>) : null
  if (!got) return 0
  const ids = Object.keys(correct)
  let matched = 0
  for (const id of ids) {
    if (got[id] !== undefined && got[id] === correct[id]) matched++
  }
  return matched / ids.length
}
