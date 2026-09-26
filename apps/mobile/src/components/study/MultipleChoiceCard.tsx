import { useState } from "react"
import { Text, View } from "react-native"
import type { ContentExercise } from "@navia/types"
import { PaperCard } from "./PaperCard"
import { PressableScale } from "./PressableScale"
import { optionViews } from "@/lib/multipleChoice"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentFaces } from "@/hooks/useContentFaces"
import { paperType } from "@/theme/paperType"

interface Props {
  exercise: ContentExercise
  /** Fires once, when the learner commits an answer. */
  onAnswered?: (correct: boolean) => void
}

/**
 * One multiple-choice question, revealed on pick.
 *
 * The reveal is immediate and there is no retry: a reading question is there to
 * tell a learner whether they took the passage in, and letting them tap until
 * the right answer appears measures nothing. The exam screens have a different
 * rhythm — a deliberate beat before advancing — so they keep their own
 * presentation rather than being bent through this.
 */
export function MultipleChoiceCard({ exercise, onAnswered }: Props) {
  const { paper } = useTheme()
  const faces = useContentFaces()
  const [picked, setPicked] = useState<string | null>(null)
  const answered = picked !== null

  const choose = (key: string) => {
    if (answered) return
    setPicked(key)
    onAnswered?.(key === exercise.correct)
  }

  return (
    <PaperCard tone="plain">
      {exercise.passage && (
        <>
          <Text style={[paperType.proseSm, { color: paper.inkSoft }]}>
            {exercise.passage}
          </Text>
          {exercise.passageSource && (
            <Text style={[paperType.note, { color: paper.inkMuted }]}>
              {exercise.passageSource}
            </Text>
          )}
        </>
      )}
      <Text
        style={[
          paperType.cardTitle,
          { color: paper.ink, fontSize: 18, lineHeight: 26 },
        ]}
      >
        {exercise.prompt}
      </Text>

      <PaperCard padded={false}>
        {optionViews(exercise, picked).map((o, i) => (
          <PressableScale
            key={o.key}
            onPress={() => choose(o.key)}
            scale={0.99}
            disabled={answered}
            accessibilityLabel={o.label}
            accessibilityState={{
              selected: picked === o.key,
              disabled: answered,
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingVertical: 13,
              paddingHorizontal: 14,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: paper.lineSoft,
              opacity: o.state === "dim" ? 0.45 : 1,
              backgroundColor:
                o.state === "correct"
                  ? paper.greenSoft
                  : o.state === "wrong"
                    ? paper.coralSoft
                    : "transparent",
            }}
          >
            <Text
              style={{
                fontFamily: faces.display,
                fontSize: 20,
                color: o.state === "wrong" ? paper.coral : paper.green,
              }}
            >
              {o.key.length === 1 ? o.key.toUpperCase() : o.key}
            </Text>
            <Text
              style={[
                paperType.cardTitleSm,
                { color: paper.ink, flex: 1, lineHeight: 22 },
              ]}
            >
              {o.label}
            </Text>
          </PressableScale>
        ))}
      </PaperCard>
    </PaperCard>
  )
}
