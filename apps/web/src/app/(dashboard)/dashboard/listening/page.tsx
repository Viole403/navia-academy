"use client";

import { useMounted } from "@/lib/use-mounted";
import { useMemo, useState } from "react";
import { Ear, Play, RotateCcw } from "lucide-react";
import { useVocabulary } from "@/lib/vocabulary";
import { EXAM_DEFINITIONS, useExamConfig } from "@/lib/exam-definitions";
import { useProgress } from "@/stores/progress";
import { useSettings } from "@/stores/settings";
import { sample, shuffle } from "@/lib/utils";
import { useTranslation } from "@/i18n/locale-context";
import type { Exercise, HskLevel, VocabWord } from "@/types";
import { Button, Card, ProgressBar, SectionHeader, Select, StatCard } from "@/components/ui";
import { ExercisePlayer } from "@/components/dashboard/exercise-player";

type DrillKind = "word" | "tone" | "sentence";

const TONE_KEYS = ["listening.tone.neutral", "listening.tone.1st", "listening.tone.2nd", "listening.tone.3rd", "listening.tone.4th"];

function buildDrills(kind: DrillKind, pool: VocabWord[], count: number, t: (key: string, params?: Record<string, string>) => string): Exercise[] {
  const drills: Exercise[] = [];
  const chosen = sample(pool, Math.min(count, pool.length));

  for (const [i, w] of chosen.entries()) {
    if (kind === "word") {
      const distractors = sample(pool.filter((x) => x.id !== w.id), 3);
      drills.push({
        id: `lw-${i}-${w.id}`,
        type: "listening-choice",
        prompt: t("listening.prompt.word"),
        audioText: w.hanzi ?? w.text,
        options: shuffle([w, ...distractors]).map((x) => ({ id: x.id, label: x.hanzi ?? x.text ?? "", sublabel: x.translation })),
        correct: w.id,
        skill: "listening",
        hsk: (w.level ?? w.hsk ?? 1) as HskLevel,
        explanation: `${w.hanzi ?? w.text} (${w.pinyin ?? w.romanization ?? ""}) — ${w.translation}`,
      });
    } else if (kind === "tone") {
      const mono = pool.filter((x) => (x.tones ?? []).length === 1 && (x.tones ?? [])[0] !== 0);
      const word = mono[i % Math.max(1, mono.length)] ?? w;
      const tone = (word.tones ?? [])[0];
      drills.push({
        id: `lt-${i}-${word.id}`,
        type: "listening-choice",
        prompt: t("listening.prompt.tone"),
        audioText: word.hanzi ?? word.text,
        options: [1, 2, 3, 4].map((tn) => ({ id: `t${tn}`, label: t(TONE_KEYS[tn]) })),
        correct: `t${tone}`,
        skill: "listening",
        hsk: (word.level ?? word.hsk ?? 1) as HskLevel,
        explanation: t("listening.explanation", { hanzi: word.hanzi ?? word.text, pinyin: word.pinyin ?? word.romanization ?? "", tone: t(TONE_KEYS[tone]) }),
      });
    } else {
      const ex = w.examples[0];
      if (!ex) continue;
      const others = sample(pool.filter((x) => x.id !== w.id && x.examples[0]), 3).map((x) => x.examples[0]);
      drills.push({
        id: `ls-${i}-${w.id}`,
        type: "listening-choice",
        prompt: t("listening.prompt.sentence"),
        audioText: ex.hanzi ?? ex.text ?? "",
        options: shuffle([ex, ...others]).map((x, j) => ({ id: `o${j}-${x.hanzi ?? x.text ?? ""}`, label: x.translation })),
        correct: `?`,
        skill: "listening",
        hsk: (w.level ?? w.hsk ?? 1) as HskLevel,
        explanation: `${ex.hanzi ?? ex.text ?? ""} (${ex.pinyin ?? ex.romanization ?? ""}) — ${ex.translation}`,
      });
      // Fix correct id after shuffle
      const last = drills[drills.length - 1];
      last.correct = last.options!.find((o) => o.label === ex.translation)!.id;
    }
  }
  return drills;
}

export default function ListeningPage() {
  const progress = useProgress();
  const settings = useSettings();
  const examConfig = useExamConfig();
  const [kind, setKind] = useState<DrillKind>("word");
  const [level, setLevel] = useState("all");
  const [length, setLength] = useState("8");
  const [session, setSession] = useState<Exercise[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(0);
  const mounted = useMounted();
  const { t } = useTranslation();
  const vocabulary = useVocabulary();
  const examDef = EXAM_DEFINITIONS[settings.activeExamType];

  const listeningMinutes = useMemo(
    () => Object.values(progress.sessions).reduce((a, l) => a + (l.skills.listening ?? 0), 0),
    [progress.sessions]
  );

  if (!mounted || !examDef) return null;

  const poolFor = (exam: typeof settings.activeExamType) =>
    vocabulary.filter((w) =>
      level === "all" || String(w.examMappings?.[exam] ?? w.level ?? w.hsk) === level
    );

  if (session) {
    if (session.length === 0) {
      return (
        <div className="mx-auto max-w-md py-10 text-center animate-fade-up">
          <Ear className="mx-auto h-16 w-16 text-accent" aria-hidden />
          <h1 className="font-display mt-5 text-2xl font-bold">{t("listening.empty")}</h1>
          <p className="mt-2 text-ink-soft">{t("listening.emptySub")}</p>
          <div className="mt-8 flex justify-center">
            <Button variant="outline" onClick={() => setSession(null)}>{t("listening.configureAnother")}</Button>
          </div>
        </div>
      );
    }
    if (index >= session.length) {
      return (
        <div className="mx-auto max-w-md py-10 text-center animate-fade-up">
          <Ear className="mx-auto h-16 w-16 text-accent" aria-hidden />
          <h1 className="font-display mt-5 text-2xl font-bold">{t("listening.completed")}</h1>
          <p className="mt-2 text-ink-soft">{t("listening.score", { n: String(correct), total: String(session.length) })}</p>
          <div className="mt-8 flex justify-center gap-3">
            <Button variant="outline" onClick={() => { setSession(null); setIndex(0); setCorrect(0); }}>
              {t("listening.configureAnother")}
            </Button>
            <Button onClick={() => {
              setSession(buildDrills(kind, poolFor(settings.activeExamType), Number(length), t)); setIndex(0); setCorrect(0); setAnswered(false);
            }}>
              <RotateCcw className="h-4 w-4" /> {t("listening.repeat")}
            </Button>
          </div>
        </div>
      );
    }
    const ex = session[index];
    return (
      <div className="mx-auto max-w-xl">
        <div className="mb-4 flex items-center justify-between text-xs text-ink-faint">
          <span>{index + 1} / {session.length}</span>
          <button onClick={() => setSession(null)} className="text-accent hover:underline cursor-pointer">{t("lesson.exit")}</button>
        </div>
        <ProgressBar value={index} max={session.length} className="mb-6" label={t("listening.sessionProgress")} />
        <Card className="p-6" key={ex.id}>
          <ExercisePlayer
            exercise={ex}
            onResult={(ok) => {
              setAnswered(true);
              if (ok) setCorrect((c) => c + 1);
              progress.logStudy(1, "listening", ok ? 4 : 1);
            }}
          />
        </Card>
        {answered && (
          <Button className="mt-4 w-full" onClick={() => { setIndex((i) => i + 1); setAnswered(false); }}>
            {t("assessment.next")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <SectionHeader  title={t("nav.listening")} subtitle={t("listening.subtitle")} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label={t("listening.time")} value={`${listeningMinutes} min`} icon={<Ear className="h-4 w-4" />} />
        <StatCard label={t("listening.mode")} value={t(kind === "word" ? "listening.words" : kind === "tone" ? "listening.tones" : "listening.sentences")} />
        <StatCard label={t("listening.tip")} value={t("listening.slowAudio")} sub={t("listening.slowAudioSub")} />
      </div>

      <Card className="mt-6 p-6">
        <h2 className="font-display text-lg font-semibold">{t("listening.newSession")}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Select label={t("listening.exerciseType")} value={kind} onChange={(e) => setKind(e.target.value as DrillKind)}>
            <option value="word">{t("listening.kind.word")}</option>
            <option value="tone">{t("listening.kind.tone")}</option>
            <option value="sentence">{t("listening.kind.sentence")}</option>
          </Select>
          <Select label={t("listening.level")} value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="all">{t("listening.allLevels", { exam: examConfig.abbreviations[settings.activeExamType] || examConfig.displayNames[settings.activeExamType] || settings.activeExamType })}</option>
            {examDef.levels.map((l: string) => (
              <option key={l} value={l}>{t("listening.levelOption", { exam: examConfig.abbreviations[settings.activeExamType] || examConfig.displayNames[settings.activeExamType] || settings.activeExamType, level: l })}</option>
            ))}
          </Select>
          <Select label={t("listening.duration")} value={length} onChange={(e) => setLength(e.target.value)}>
            <option value="5">{t("listening.durationOpt", { n: "5" })}</option>
            <option value="8">{t("listening.durationOpt", { n: "8" })}</option>
            <option value="12">{t("listening.durationOpt", { n: "12" })}</option>
            <option value="20">{t("listening.durationOpt", { n: "20" })}</option>
          </Select>
        </div>
        <Button className="mt-5" size="lg" onClick={() => {
          setSession(buildDrills(kind, poolFor(settings.activeExamType), Number(length), t)); setIndex(0); setCorrect(0); setAnswered(false);
        }}>
          <Play className="h-4 w-4" /> {t("listening.startSession")}
        </Button>
        <p className="mt-3 text-xs text-ink-faint">{t("listening.audioNote")}</p>
      </Card>
    </div>
  );
}
