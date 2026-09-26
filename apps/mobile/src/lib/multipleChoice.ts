import type { ContentExercise, ContentOption } from "@navia/types"

/**
 * How each option should read once an answer is in.
 *
 * Pulled out of the component so it can be tested without a renderer, since
 * this is where the decision lives — the JSX around it only draws it. The
 * desktop reader keeps its own equivalent; a test here is a test of this copy,
 * not of the two together.
 */
export type OptionState = "idle" | "correct" | "wrong" | "dim"

export interface OptionView {
  key: string
  label: string
  state: OptionState
}

/**
 * Content option ids are lowercase letters while the exam shows uppercase, so
 * a learner moving between a reading and an exam should not see the key change
 * style. An id that is not a single letter has no letter to show, so the
 * position in the list stands in for it.
 */
export function optionKey(option: ContentOption, index: number): string {
  return option.id || String.fromCharCode(65 + index)
}

export function optionViews(
  exercise: Pick<ContentExercise, "options" | "correct">,
  picked: string | null
): OptionView[] {
  const correct = exercise.correct
  return (exercise.options ?? []).map((o, i) => {
    const key = optionKey(o, i)
    return {
      key,
      label: o.label ?? "",
      state: stateFor(key, correct, picked),
    }
  })
}

function stateFor(
  key: string,
  correct: string | undefined,
  picked: string | null
): OptionState {
  if (picked === null) return "idle"
  if (key === correct) return "correct"
  return key === picked ? "wrong" : "dim"
}

/**
 * How many of a passage's questions were answered, and how many correctly.
 *
 * Answers are keyed by question id so a re-render cannot count the same question
 * twice, which matters because each answer logs study time.
 */
export function tally(
  questions: Pick<ContentExercise, "id" | "correct">[],
  answers: Record<string, string>
): { answered: number; correct: number } {
  let correct = 0
  let answered = 0
  for (const q of questions) {
    const given = answers[q.id]
    if (given === undefined) continue
    answered++
    if (given === q.correct) correct++
  }
  return { answered, correct }
}
