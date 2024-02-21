"use client";

import { useMounted } from "@/lib/use-mounted";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Flag,
  StickyNote,
  Volume2,
  X,
} from "lucide-react";
import { useCurriculum, lessonById, unitById } from "@/lib/curriculum";
import { useVocabulary } from "@/lib/vocabulary";
import { useGrammar, grammarById } from "@/lib/grammar";
import { useCharacters, charById } from "@/lib/characters";
import { difficultFor, lessonsFor, notesFor, useProgress } from "@/stores/progress";
import { showsPinyin, showsTranslation, useSettings } from "@/stores/settings";
import { play } from "@/lib/audio";
import { ttsLocaleFor } from "@/lib/languages";
import type { VoiceLocale } from "@navia/utils";
import { cn } from "@/lib/utils";
import { Badge, Button, Card, EmptyState, PinyinText, ProgressBar, Textarea } from "@/components/ui";
import { ExercisePlayer } from "@/components/dashboard/exercise-player";
import { VocabCard } from "@/components/dashboard/vocab-card";
import { HanziPractice } from "@/components/dashboard/hanzi-practice";
import { useTranslation } from "@/i18n/locale-context";
import { locText, translationFor } from "@/lib/content-translation";

export default function LessonPage() {
  const { t, locale: uiLocale } = useTranslation();
  const { lessonId } = useParams<{ lessonId: string }>();
  useCurriculum();
  useGrammar();
  useCharacters();
  const lesson = lessonById(lessonId);
  const progress = useProgress();
  const settings = useSettings();
  const [showNotes, setShowNotes] = useState(false);
  const [exerciseResults, setExerciseResults] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const mounted = useMounted();
  const vocabulary = useVocabulary();
  const vocabById = useMemo(
    () => new Map(vocabulary.map((w) => [w.id, w] as const)),
    [vocabulary],
  );
  useEffect(() => {
    if (lesson) progress.startLesson(lesson.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id]);

  // Keyboard shortcuts: ←/→ navigate steps
  const langLessons = lessonsFor(progress, settings.language);
  const locale = ttsLocaleFor(settings.language) as VoiceLocale;
  const stepIndex = langLessons[lessonId]?.step ?? 0;
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, exerciseResults]);

  if (!mounted) return null;

  if (!lesson) {
    return (
      <EmptyState
        title={t("lesson.notFound")}
        description={t("lesson.notFoundDesc")}
        action={<Link href="/dashboard/program"><Button>{t("lesson.viewProgram")}</Button></Link>}
      />
    );
  }

  const step = lesson.steps[Math.min(stepIndex, lesson.steps.length - 1)];
  const isLast = stepIndex >= lesson.steps.length - 1;
  const exerciseDone = step.type !== "exercise" || step.exercise === undefined || step.exercise.id in exerciseResults;
  const difficult = difficultFor(progress, settings.language).includes(lesson.id);
  const STEP_TYPE_LABELS: Record<string, string> = {
    intro: t("lesson.introduction"),
    objectives: t("lesson.objectives"),
    explanation: t("lesson.explanation"),
    dialogue: t("lesson.dialogue"),
    vocabulary: t("lesson.vocabulary"),
    grammar: t("lesson.grammar"),
    pronunciation: t("lesson.pronunciation"),
    writing: t("lesson.writing"),
    reading: t("lesson.reading"),
    exercise: t("lesson.exercise"),
    summary: t("lesson.summary"),
  };

  function goPrev() {
    if (stepIndex > 0) progress.setLessonStep(lesson!.id, stepIndex - 1);
  }

  function goNext() {
    if (!exerciseDone) return;
    if (!isLast) {
      progress.setLessonStep(lesson!.id, stepIndex + 1);
      return;
    }
    if (!finished) {
      // Complete: award XP, enroll vocab/chars into SRS, log time.
      const alreadyDone = langLessons[lesson!.id]?.completed;
      for (const s of lesson!.steps) {
        for (const vid of s.vocabIds ?? []) progress.ensureCard(vid, "word");
        for (const cid of s.characterIds ?? []) progress.ensureCard(cid, "character");
        for (const gid of s.grammarIds ?? []) progress.ensureCard(gid, "grammar");
      }
      if (!alreadyDone) {
        progress.completeLesson(lesson!.id, lesson!.xp);
        progress.logStudy(lesson!.durationMin, lesson!.skills[0] ?? "vocabulary", 0);
      }
      progress.unlockAchievements();
      setFinished(true);
    }
  }

  /* ------------------------------ Finish screen ------------------------------ */
  if (finished) {
    const correct = Object.values(exerciseResults).filter(Boolean).length;
    const total = Object.keys(exerciseResults).length;
    return (
      <div className="mx-auto max-w-xl py-10 text-center animate-fade-up">
        <CheckCircle2 className="mx-auto h-16 w-16 text-jade" aria-hidden />
        <h1 className="font-display mt-5 text-2xl font-bold">{t("lesson.completed")}</h1>
        <p className="mt-2 text-ink-soft">
          «{lesson.title}» · {t("lesson.xp", { n: String(lesson.xp) })}
          {total > 0 && ` · ${t("lesson.correctExercises", { correct: String(correct), total: String(total) })}`}
        </p>
        <p className="mt-1 text-sm text-ink-faint">{t("lesson.addedToReview")}</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/dashboard/review"><Button variant="outline">{t("lesson.reviewNow")}</Button></Link>
          <Link href="/dashboard/learn"><Button>{t("dashboard.nextLesson")} <ArrowRight className="h-4 w-4" /></Button></Link>
        </div>
      </div>
    );
  }

  /* -------------------------------- Player --------------------------------- */
  return (
    <div className="mx-auto max-w-2xl">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          href={`/dashboard/unit/${lesson.unitId}`}
          className="flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink"
        >
          <X className="h-4 w-4" /> {t("lesson.exit")}
        </Link>
        <div className="flex-1 px-2">
          <ProgressBar value={stepIndex + 1} max={lesson.steps.length} label={t("lesson.progress")} />
        </div>
        <span className="text-xs text-ink-faint">
          {stepIndex + 1}/{lesson.steps.length}
        </span>
      </div>

      {/* Lesson header + tools */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs text-ink-faint">{unitById(lesson.unitId)?.title}</p>
          <h1 className="font-display text-xl font-bold">{lesson.title}</h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => settings.setDisplayMode({ mode: showsPinyin(settings.displayMode.mode) ? "none" : "hanyu+trans" })}
            aria-pressed={showsPinyin(settings.displayMode.mode)}
            title={showsPinyin(settings.displayMode.mode) ? t("lesson.hidePinyin") : t("lesson.showPinyin")}
            className={cn("rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer hover:bg-hover", showsPinyin(settings.displayMode.mode) ? "text-accent" : "text-ink-faint")}
          >
            pīn
          </button>
          <button
            onClick={() => settings.setDisplayMode({ mode: showsTranslation(settings.displayMode.mode) ? "hanyu" : "hanyu+trans" })}
            aria-pressed={showsTranslation(settings.displayMode.mode)}
            title={showsTranslation(settings.displayMode.mode) ? t("lesson.hideTranslation") : t("lesson.showTranslation")}
            className={cn("rounded-lg p-2 cursor-pointer hover:bg-hover", showsTranslation(settings.displayMode.mode) ? "text-accent" : "text-ink-faint")}
          >
            {showsTranslation(settings.displayMode.mode) ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button
            onClick={() => progress.toggleDifficult(lesson.id)}
            aria-pressed={difficult}
            title={t("lesson.markDifficult")}
            className={cn("rounded-lg p-2 cursor-pointer hover:bg-hover", difficult ? "text-danger" : "text-ink-faint")}
          >
            <Flag className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowNotes(!showNotes)}
            aria-pressed={showNotes}
            title={t("vocab.personalNotes")}
            className={cn("rounded-lg p-2 cursor-pointer hover:bg-hover", showNotes ? "text-accent" : "text-ink-faint")}
          >
            <StickyNote className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showNotes && (
        <Card className="mb-5 p-4">
          <Textarea
            label={t("lesson.notesLabel")}
            defaultValue={notesFor(progress, settings.language)[lesson.id] ?? ""}
            onBlur={(e) => progress.setNote(lesson.id, e.target.value)}
            placeholder={t("lesson.notesPlaceholder")}
          />
        </Card>
      )}

      {/* Step content */}
      <Card className="p-6 animate-brush-in" key={step.id}>
        <div className="mb-4 flex items-center gap-2">
          <Badge tone="accent">{STEP_TYPE_LABELS[step.type]}</Badge>
          <h2 className="font-display font-semibold">{step.title}</h2>
        </div>

        {step.body?.map((p, i) => (
          <p key={i} className="mt-3 text-sm leading-relaxed text-ink-soft first:mt-0">{p}</p>
        ))}

        {step.type === "objectives" && step.body && (
          <ul className="mt-2 space-y-1.5">
            {step.body.map((o, i) => (
              <li key={`o-${i}`} className="flex items-start gap-2 text-sm text-ink-soft">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-jade" /> {o}
              </li>
            ))}
          </ul>
        )}

        {step.dialogue && (
          <div className="mt-4 space-y-3">
            {step.dialogue.map((line, i) => (
              <div key={i} className="flex gap-3">
                <span className="hanzi mt-1 h-8 w-8 shrink-0 rounded-full bg-sunken text-center text-sm leading-8" lang={locale}>
                  {line.speaker.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1 rounded-[var(--radius)] border border-line bg-sunken/40 px-4 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="hanzi text-lg" lang={locale}>{line.hanzi ?? line.text ?? ""}</p>
                     <button
                       onClick={() => play(line.audio ?? line.hanzi ?? line.text ?? "", { rate: settings.audioRate, onLoadingChange: setAudioLoading, onError: () => {} }, locale, settings.voiceGender)}
                       aria-label={t("lesson.listenPhrase")}
                       disabled={audioLoading}
                       className="rounded p-1 text-ink-faint hover:text-accent cursor-pointer disabled:opacity-50"
                     >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  </div>
                  {<PinyinText pinyin={line.pinyin ?? line.romanization ?? ""} zhuyin={line.zhuyin} className="text-xs" />}
                  {showsTranslation(settings.displayMode.mode) && <p className="mt-0.5 text-xs text-ink-faint">{translationFor(line, uiLocale)}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {step.type === "reading" && step.paragraphs && (
          <div className="mt-4 space-y-4">
            {step.paragraphs.map((para, i) => (
              <div key={i} className="rounded-[var(--radius)] border border-line bg-sunken/40 px-4 py-3.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="hanzi text-lg" lang={locale}>{para.hanzi ?? ""}</p>
                  <button
                    onClick={() => play(para.audio ?? para.hanzi ?? "", { rate: settings.audioRate, onLoadingChange: setAudioLoading, onError: () => {} }, locale, settings.voiceGender)}
                    aria-label={t("lesson.listenPhrase")}
                    disabled={audioLoading}
                    className="rounded p-1 text-ink-faint hover:text-accent cursor-pointer disabled:opacity-50"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                </div>
                <PinyinText pinyin={para.pinyin ?? ""} zhuyin={para.zhuyin} className="text-xs" />
                {showsTranslation(settings.displayMode.mode) && <p className="mt-0.5 text-xs text-ink-faint">{translationFor(para, uiLocale)}</p>}
              </div>
            ))}
          </div>
        )}

        {step.vocabIds && (
          <div className="mt-4 grid gap-3">
            {step.vocabIds.map((id) => {
              const w = vocabById.get(id);
              return w ? <VocabCard key={id} word={w} /> : null;
            })}
          </div>
        )}

        {step.grammarIds && (
          <div className="mt-4 space-y-4">
            {step.grammarIds.map((id) => {
              const g = grammarById(id);
              if (!g) return null;
              return (
                <div key={id} className="rounded-[var(--radius)] border border-line p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{g.title}</p>
                    <Link href={`/dashboard/grammar/${g.id}`} className="text-xs font-medium text-accent hover:underline">
                      {t("lesson.fullEntry")}
                    </Link>
                  </div>
                  <p className="hanzi mt-1 text-sm text-accent" lang={locale}>{g.pattern}</p>
                  <p className="mt-2 text-sm text-ink-soft">{locText(g, "simpleExplanation", uiLocale)}</p>
                  {g.examples[0] && (
                    <p className="hanzi mt-2 text-sm" lang={locale}>
                      {g.examples[0].hanzi}{" "}
                      <span className="font-sans text-xs text-ink-faint">— {translationFor(g.examples[0], uiLocale)}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {step.characterIds && (
          <div className="mt-4 flex flex-wrap justify-center gap-6">
            {step.characterIds.map((id) => {
              const c = charById(id);
              if (!c) return null;
              return (
                <div key={id} className="text-center">
                  <p className="mb-2 text-sm text-ink-soft">
                    <span className="hanzi text-lg" lang={locale}>{c.char}</span>{" "}
                    <PinyinText pinyin={c.pinyin} /> · {c.meaning}
                  </p>
                  <HanziPractice char={c.char} size={200} />
                </div>
              );
            })}
          </div>
        )}

        {step.exercise && (
          <div className="mt-2">
            <ExercisePlayer
              key={step.exercise.id}
              exercise={step.exercise}
              onResult={(ok) => {
                setExerciseResults((r) => ({ ...r, [step.exercise!.id]: ok }));
                if (ok) progress.addXp(5);
              }}
            />
          </div>
        )}
      </Card>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={goPrev} disabled={stepIndex === 0}>
          <ArrowLeft className="h-4 w-4" /> {t("lesson.previous")}
        </Button>
        <p className="hidden text-xs text-ink-faint sm:block">{t("lesson.navigationHint")}</p>
        <Button onClick={goNext} disabled={!exerciseDone}>
          {isLast ? t("lesson.finish") : t("assessment.next")} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
