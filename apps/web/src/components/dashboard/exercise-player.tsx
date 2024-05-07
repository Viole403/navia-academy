"use client";

import { useMemo, useState } from "react";
import { Check, RotateCcw, Volume2, X } from "lucide-react";
import type { Exercise } from "@/types";
import { play } from "@/lib/audio";
import { useSettings } from "@/stores/settings";
import { cn, shuffle } from "@/lib/utils";
import { Button } from "@/components/ui";
import { useTranslation } from "@/i18n/locale-context";

interface Props {
  exercise: Exercise;
  onResult: (correct: boolean) => void;
}

/** Renders any exercise type and reports the result once. */
export function ExercisePlayer({ exercise, onResult }: Props) {
  const audioRate = useSettings((s) => s.audioRate);
  const [picked, setPicked] = useState<string | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const { t } = useTranslation();

  const options = useMemo(
    () => shuffle(exercise.options ?? []),
    [exercise]
  );
  const tokens = useMemo(() => shuffle(exercise.tokens ?? []), [exercise]);

  const done = picked !== null || checked;

  function pick(id: string) {
    if (done) return;
    setPicked(id);
    onResult(id === exercise.correct);
  }

  function checkOrder() {
    if (checked) return;
    setChecked(true);
    const correct = Array.isArray(exercise.correct) && order.join("|") === exercise.correct.join("|");
    onResult(correct);
  }

  const orderCorrect = Array.isArray(exercise.correct) && order.join("|") === exercise.correct.join("|");

  if (exercise.type === "order-words") {
    return (
      <div>
        <p className="font-medium">{exercise.prompt}</p>
        {/* Built sentence */}
        <div className="mt-4 flex min-h-14 flex-wrap items-center gap-2 rounded-xl border border-dashed border-line-strong bg-sunken/50 p-3" aria-label={t("exercise.builtSentence")}>
          {order.length === 0 && <span className="text-sm text-ink-faint">{t("exercise.tapWordsInOrder")}</span>}
          {order.map((id, i) => {
            const t = tokens.find((t) => t.id === id)!;
            return (
              <button
                key={id + i}
                disabled={checked}
                onClick={() => setOrder((o) => o.filter((x) => x !== id))}
                className="hanzi rounded-lg border border-line bg-raised px-3 py-1.5 text-lg cursor-pointer hover:border-danger disabled:cursor-default"
                lang="zh-CN"
              >
                {t.label}
              </button>
            );
          })}
        </div>
        {/* Available tokens */}
        <div className="mt-3 flex flex-wrap gap-2">
          {tokens
            .filter((t) => !order.includes(t.id))
            .map((t) => (
              <button
                key={t.id}
                disabled={checked}
                onClick={() => setOrder((o) => [...o, t.id])}
                className="hanzi rounded-lg border border-line bg-raised px-3 py-1.5 text-lg cursor-pointer hover:border-accent hover:bg-hover disabled:cursor-default"
                lang="zh-CN"
              >
                {t.label}
              </button>
            ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button size="sm" onClick={checkOrder} disabled={checked || order.length !== tokens.length}>
            {t("exercise.check")}
          </Button>
          {!checked && order.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setOrder([])}>
              <RotateCcw className="h-3.5 w-3.5" /> {t("exercise.reset")}
            </Button>
          )}
        </div>
        {checked && (
          <ResultNote
            correct={orderCorrect}
            explanation={exercise.explanation}
            correctAnswer={
              !orderCorrect && Array.isArray(exercise.correct)
                ? exercise.correct.map((id) => exercise.tokens?.find((t) => t.id === id)?.label ?? "").join(" ")
                : undefined
            }
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="font-medium">{exercise.prompt}</p>

      {exercise.subject && (
        <p className="hanzi mt-3 text-4xl" lang="zh-CN">
          {exercise.subject}
        </p>
      )}

      {exercise.audioText && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => play(exercise.audioText!, { rate: audioRate, onLoadingChange: setAudioLoading, onError: () => {} })}
            disabled={audioLoading}
            className="flex items-center gap-2 rounded-xl border border-line bg-raised px-4 py-2.5 text-sm font-medium hover:bg-hover cursor-pointer disabled:opacity-50"
          >
            <Volume2 className="h-4 w-4 text-accent" /> {t('audio.listen')}
          </button>
          <button
            onClick={() => play(exercise.audioText!, { rate: Math.max(0.5, audioRate - 0.3), onLoadingChange: setAudioLoading, onError: () => {} })}
            disabled={audioLoading}
            className="flex items-center gap-2 rounded-xl border border-line bg-raised px-4 py-2.5 text-sm font-medium hover:bg-hover cursor-pointer disabled:opacity-50"
          >
            <Volume2 className="h-4 w-4" /> {t('audio.slow')}
          </button>
        </div>
      )}

      <div className="mt-5 space-y-2.5" role="group" aria-label={t("exercise.answerOptions")}>
        {options.map((o) => {
          const isPicked = picked === o.id;
          const isCorrect = o.id === exercise.correct;
          return (
            <button
              key={o.id}
              disabled={done}
              onClick={() => pick(o.id)}
              className={cn(
                "w-full rounded-xl border px-4 py-3 text-left transition-colors cursor-pointer disabled:cursor-default",
                done && isCorrect && "border-success bg-accent-soft",
                done && isPicked && !isCorrect && "border-danger",
                !done && "border-line bg-raised hover:border-line-strong hover:bg-hover"
              )}
            >
              <span className="flex items-center justify-between">
                <span className="hanzi text-base font-medium" lang="zh-CN">{o.label}</span>
                {done && isCorrect && <Check className="h-4 w-4 shrink-0 text-success" />}
                {done && isPicked && !isCorrect && <X className="h-4 w-4 shrink-0 text-danger" />}
              </span>
              {o.sublabel && <span className="mt-0.5 block text-xs text-ink-faint">{o.sublabel}</span>}
            </button>
          );
        })}
      </div>

      {done && picked && (
        <ResultNote correct={picked === exercise.correct} explanation={exercise.explanation} />
      )}
    </div>
  );
}

function ResultNote({ correct, explanation, correctAnswer }: { correct: boolean; explanation?: string; correctAnswer?: string }) {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      className={cn(
        "mt-4 rounded-lg border px-4 py-3 text-sm animate-brush-in",
        correct ? "border-success/40 bg-accent-soft text-success" : "border-danger/40 bg-sunken text-danger"
      )}
    >
      <p className="font-semibold">{correct ? t("exercise.correct") : t("exercise.incorrect")}</p>
      {correctAnswer && (
        <p className="hanzi mt-1 text-ink" lang="zh-CN">{t("exercise.answer")}: {correctAnswer}</p>
      )}
      {explanation && <p className="mt-1 text-ink-soft">{explanation}</p>}
    </div>
  );
}
