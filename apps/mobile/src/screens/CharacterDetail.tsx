import { useMemo, useState } from "react"
import { Text, View } from "react-native"
import { useLocalSearchParams } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { DetailShell } from "@/components/study/DetailShell"
import { PaperCard, LiftedFace } from "@/components/study/PaperCard"
import { ReadingAid } from "@/components/study/ReadingAid"
import { HanziStage } from "@/components/hanzi/HanziStage"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentFaces } from "@/hooks/useContentFaces"
import { paperType, families, hanziType } from "@/theme/paperType"
import { loadCharacters } from "@/lib/content-data"
import { useOnboardingStore } from "@/store/onboarding"
import { useT } from "@/i18n"
import { useTargetLanguage } from "@/hooks/useTargetLanguage"

/**
 * Character detail — one glyph: its reading, its radical, its stroke count, and
 * the stroke order itself.
 *
 * Reached from the dictionary's radical index and from the characters grid, so
 * the back arrow is guarded: a deep link into `navia://character/学` has nothing
 * to pop.
 */
export function CharacterDetail() {
  const { paper } = useTheme()
  const faces = useContentFaces()
  const t = useT()
  const language = useTargetLanguage()
  const { char } = useLocalSearchParams<{ char?: string }>()
  const glyph = decodeURIComponent(char ?? "")
  const [mode, setMode] = useState<"demo" | "quiz">("demo")
  const [hintKey, setHintKey] = useState(0)
  const [revealKey, setRevealKey] = useState(0)

  const charsQ = useQuery({
    queryKey: ["characters", language],
    queryFn: () => loadCharacters(language),
  })

  const entry = useMemo(
    () => (charsQ.data ?? []).find((c) => (c.char ?? c.hanzi) === glyph),
    [charsQ.data, glyph]
  )

  return (
    <DetailShell
      title={glyph || t("vocab.notFound")}
      kicker={entry?.radical ?? undefined}
      fallback="/characters"
      footer={
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <LiftedFace
              title={mode === "demo" ? t("cd.quiz") : t("cd.demo")}
              face={mode === "demo" ? paper.surface.week.fill : paper.lavender}
              textColor={mode === "demo" ? paper.ink : "#FFFFFF"}
              small
              onPress={() => setMode((m) => (m === "demo" ? "quiz" : "demo"))}
            />
          </View>
          <View style={{ flex: 1 }}>
            <LiftedFace
              title={t("wd.hint")}
              face={paper.surface.week.fill}
              textColor={paper.ink}
              small
              onPress={() => setHintKey((k) => k + 1)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <LiftedFace
              title={t("wd.reveal")}
              face={paper.coral}
              small
              onPress={() => setRevealKey((k) => k + 1)}
            />
          </View>
        </View>
      }
    >
      <PaperCard tone="word">
        <View style={{ alignItems: "center", gap: 6, paddingVertical: 8 }}>
          <Text
            style={{
              fontFamily: faces.hanzi,
              ...hanziType(56),
              color: paper.ink,
            }}
          >
            {glyph}
          </Text>
          <ReadingAid
            pinyin={entry?.pinyin}
            translation={entry?.meaning}
            numberOfLines={undefined}
          />
          {!!entry?.meaning && (
            <Text
              style={[
                paperType.prose,
                { color: paper.ink, textAlign: "center" },
              ]}
            >
              {entry.meaning}
            </Text>
          )}
        </View>
      </PaperCard>

      <PaperCard tone="plain" title={t("cd.appearance")}>
        <View style={{ flexDirection: "row", gap: 20 }}>
          <Fact
            label={t("cd.strokes")}
            value={entry?.strokes ? String(entry.strokes) : "—"}
          />
          <Fact label={t("cd.radical")} value={entry?.radical ?? "—"} />
          <Fact
            label={t("cd.tone")}
            value={entry?.tone ? String(entry.tone) : "—"}
          />
        </View>
      </PaperCard>

      {glyph ? (
        <PaperCard tone="week" title={t("cd.writeIt")}>
          <View
            style={{
              height: 220,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <HanziStage
              character={glyph}
              mode={mode}
              showOutline={mode === "quiz"}
              showGuides
              hintKey={hintKey}
              revealKey={revealKey}
              holdCharacterOnComplete
              maxSize={190}
            />
          </View>
        </PaperCard>
      ) : null}
    </DetailShell>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  const { paper } = useTheme()
  return (
    <View style={{ gap: 2 }}>
      <Text
        style={[
          paperType.statValue,
          { color: paper.ink, fontFamily: families.nunitoExtraBold },
        ]}
      >
        {value}
      </Text>
      <Text
        style={[
          paperType.statLabel,
          { color: paper.inkMuted, fontFamily: families.nunitoSemiBold },
        ]}
      >
        {label}
      </Text>
    </View>
  )
}
