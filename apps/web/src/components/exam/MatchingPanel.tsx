import { useState } from "react"
import {
  assignRight,
  availableRight,
  buildAnswer,
  scoreMatching,
  selectLeft,
  unpair,
  type Assignment,
  type Selected,
} from "@navia/utils"
import type { MatchingPair } from "@navia/types"
import { useTranslation } from "@/i18n/locale-context"

/**
 * A matching question: two columns, paired by clicking.
 *
 * Click a left-hand item, then the right-hand item it belongs to. The pairing
 * rules live in `@navia/utils` because the phone runs the same ones, and the
 * failure worth avoiding — one right-hand item claimed by two rows at once — is
 * the kind of thing that gets reimplemented differently the second time round.
 *
 * The answer is submitted once, when every row is paired. The browser grades it
 * with the same arithmetic the service uses, so the number shown here and the
 * number the server records agree, including partial credit for a partially
 * correct set.
 */
export function MatchingPanel({
  prompt,
  pairs,
  correctAnswer,
  onAnswer,
}: {
  prompt: string
  pairs: MatchingPair[]
  correctAnswer?: Record<string, string>
  onAnswer: (answer: unknown) => void
}) {
  const { t } = useTranslation()
  const [assignment, setAssignment] = useState<Assignment>({})
  const [selected, setSelected] = useState<Selected>(null)
  const [sent, setSent] = useState(false)

  const free = availableRight(pairs, assignment)
  const credit = scoreMatching(correctAnswer, assignment)

  const onLeft = (id: string) => {
    if (Object.keys(assignment).includes(id)) {
      setAssignment((a) => unpair(a, id))
      setSelected(null)
      return
    }
    setSelected((s) => selectLeft(s, id))
  }

  const onRight = (right: string) => {
    if (selected === null || sent) return
    setAssignment((a) => {
      const next = assignRight(a, selected, right)
      const answer = buildAnswer(pairs, next)
      if (answer) {
        setSent(true)
        onAnswer(answer)
      }
      return next
    })
    setSelected(null)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-xs font-medium tracking-wider text-ink-soft uppercase">
          {t("exam.matching")}
        </div>
        <h2 className="text-xl font-semibold text-ink">{prompt}</h2>
      </div>

      <div className="space-y-2">
        {pairs.map((p) => {
          const held = selected === p.id
          const partner = assignment[p.id]
          return (
            <div key={p.id} className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onLeft(p.id)}
                aria-pressed={held}
                className={`flex-1 rounded border px-3 py-2 text-left text-sm ${
                  held
                    ? "border-accent bg-accent-soft text-ink"
                    : "border-line bg-raised text-ink"
                }`}
              >
                {p.left}
              </button>
              <span aria-hidden className="w-4 text-ink-faint">
                {partner ? "→" : "·"}
              </span>
              <div className="flex-1">
                {partner ? (
                  <button
                    type="button"
                    onClick={() => onLeft(p.id)}
                    className="w-full rounded border border-accent bg-accent-soft px-3 py-2 text-left text-sm text-ink"
                  >
                    {partner}
                  </button>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded border border-line bg-raised">
        <ul>
          {pairs.map((p) => {
            const used = !free.includes(p.right)
            return (
              <li
                key={p.id}
                className="border-line-soft border-t first:border-t-0"
              >
                <button
                  type="button"
                  onClick={() => onRight(p.right)}
                  disabled={selected === null || used || sent}
                  className={`w-full px-3 py-2 text-left text-sm disabled:cursor-default ${
                    used ? "text-ink-faint line-through" : "text-ink"
                  }`}
                >
                  {p.right}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {sent ? (
        <div className="space-y-1">
          <div className="text-sm text-ink">
            {t("exam.matchingScore", {
              percent: String(Math.round(credit * 100)),
            })}
          </div>
          <div className="text-xs text-ink-soft">{t("exam.matchingNote")}</div>
        </div>
      ) : (
        <div className="text-sm text-ink-soft">
          {t("exam.matchingHint", { count: String(pairs.length) })}
        </div>
      )}
    </div>
  )
}
