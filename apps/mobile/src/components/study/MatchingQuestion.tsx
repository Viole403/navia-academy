import { useState } from "react"
import { Text, View } from "react-native"
import type { MatchingPair } from "@navia/types"
import {
  assignRight,
  availableRight,
  buildAnswer,
  isComplete,
  selectLeft,
  unpair,
  type Assignment,
  type Selected,
} from "@navia/utils"
import { PaperCard } from "./PaperCard"
import { PressableScale } from "./PressableScale"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentFaces } from "@/hooks/useContentFaces"
import { paperType } from "@/theme/paperType"

interface Props {
  prompt: string
  pairs: MatchingPair[]
  /** Fires once, with the answer keyed by pair id. */
  onAnswered?: (answer: Record<string, string>) => void
}

/**
 * A matching question: two columns, paired by tapping.
 *
 * Tap a left-hand item, then tap the right-hand item it belongs to. There is no
 * drag — a phone is a touch surface and dragging a term onto a meaning turns a
 * language exercise into a dexterity test, which measures the finger rather than
 * the learner. The two columns are shown in different orders so it cannot be
 * read straight across.
 *
 * The pairing rules live in `@navia/utils` because both clients run them, and
 * the failure that matters — one right-hand item held by two rows at once —
 * would otherwise be reimplemented, and reimplemented differently, on the
 * desktop.
 */
export function MatchingQuestion({ prompt, pairs, onAnswered }: Props) {
  const { paper } = useTheme()
  const faces = useContentFaces()
  const [assignment, setAssignment] = useState<Assignment>({})
  const [selected, setSelected] = useState<Selected>(null)

  const free = availableRight(pairs, assignment)
  const complete = isComplete(pairs, assignment)

  const onLeft = (id: string) => {
    // A finished row is released by tapping it again; a half-finished one
    // waits for a partner.
    if (Object.prototype.hasOwnProperty.call(assignment, id)) {
      setAssignment((a) => unpair(a, id))
      setSelected(null)
      return
    }
    setSelected((s) => selectLeft(s, id))
  }

  const onRight = (right: string) => {
    if (selected === null) return
    setAssignment((a) => {
      const next = assignRight(a, selected, right)
      // Committing on the last pair is what "done" means here, so the answer
      // goes out as soon as the learner has nothing left to place. Checking a
      // button first would be a second thing to forget to press.
      const settled = buildAnswer(pairs, next)
      if (settled) {
        setSelected(null)
        onAnswered?.(settled)
      }
      return next
    })
  }

  return (
    <PaperCard tone="plain">
      <Text
        style={[
          paperType.cardTitle,
          { color: paper.ink, fontSize: 18, lineHeight: 26 },
        ]}
      >
        {prompt}
      </Text>

      <View style={{ gap: 10 }}>
        {pairs.map((p) => {
          const held = selected === p.id
          const partner = assignment[p.id]
          return (
            <View
              key={p.id}
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <PressableScale
                onPress={() => onLeft(p.id)}
                scale={0.98}
                accessibilityLabel={p.left}
                accessibilityState={{ selected: held }}
                innerStyle={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderRadius: paper.radius.pill,
                  borderWidth: held ? 2 : 1,
                  borderColor: held ? paper.green : paper.line,
                  backgroundColor: held ? paper.greenSoft : "transparent",
                }}
              >
                <Text
                  style={[
                    paperType.cardTitleSm,
                    { color: paper.ink, lineHeight: 22 },
                  ]}
                >
                  {p.left}
                </Text>
              </PressableScale>

              <Text
                style={{
                  fontFamily: faces.display,
                  fontSize: 16,
                  color: partner ? paper.green : paper.inkMuted,
                  width: 18,
                  textAlign: "center",
                }}
              >
                {partner ? "→" : "·"}
              </Text>

              <View
                style={{ flex: 1, minHeight: 44, justifyContent: "center" }}
              >
                {partner ? (
                  <PressableScale
                    onPress={() => onLeft(p.id)}
                    scale={0.98}
                    accessibilityLabel={`${p.left} matched with ${partner}`}
                    innerStyle={{
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderRadius: paper.radius.pill,
                      borderWidth: 1,
                      borderColor: paper.green,
                      backgroundColor: paper.greenSoft,
                    }}
                  >
                    <Text
                      style={[
                        paperType.cardTitleSm,
                        { color: paper.ink, lineHeight: 22 },
                      ]}
                    >
                      {partner}
                    </Text>
                  </PressableScale>
                ) : (
                  <Text style={[paperType.note, { color: paper.inkMuted }]}>
                    {selected === null ? "" : "…"}
                  </Text>
                )}
              </View>
            </View>
          )
        })}
      </View>

      <PaperCard padded={false}>
        {pairs.map((p) => {
          const used = !free.includes(p.right)
          return (
            <PressableScale
              key={p.id}
              onPress={() => onRight(p.right)}
              scale={0.98}
              disabled={selected === null || used}
              accessibilityLabel={p.right}
              innerStyle={{
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderTopWidth: 1,
                borderTopColor: paper.lineSoft,
                opacity: used ? 0.3 : 1,
              }}
            >
              <Text
                style={[
                  paperType.cardTitleSm,
                  { color: paper.ink, lineHeight: 22 },
                ]}
              >
                {p.right}
              </Text>
            </PressableScale>
          )
        })}
      </PaperCard>

      <Text style={[paperType.note, { color: paper.inkMuted }]}>
        {complete ? "✓" : `${Object.keys(assignment).length} / ${pairs.length}`}
      </Text>
    </PaperCard>
  )
}
