"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { VocabWord, ExamType } from "@/types";
import { useVocabulary } from "@/lib/vocabulary";
import { eloOf, eloUpdate, cefrBandOf, recommendedLevel, DEFAULT_ELO } from "@/lib/elo";
import { shuffle } from "@/lib/utils";

export interface CatItem {
  word: VocabWord;
  elo: number;
  prompt: string;
  romanization: string;
  options: string[];
  correctAnswer: string;
  stimulusType: "text" | "audio";
  audioText?: string;
  /** Question format (content balancing — rotation over vocab, review #3). */
  format: CatItemFormat;
}

export type CatItemFormat = "meaning" | "listening" | "reading";

export interface CatAnswerLog {
  wordId: string;
  elo: number;
  correct: boolean;
  /** Question format at answer time — needed for resume replay (blueprint §14.10). */
  format: CatItemFormat;
}

export interface CatResult {
  eloEstimate: number;
  eloSd: number;
  cefrBand: string;
  answered: number;
  correct: number;
  recommendedLevel: string;
  /** Bands where the user answered wrong (clustered, blueprint §4.5). */
  weakBands: string[];
}

const MIN_QUESTIONS = 12;
const MAX_QUESTIONS = 50; // safety cap: never run forever if SE never converges (review #4)
const SEM_TARGET = 60; // equiprecise stop (blueprint §4.4): stop once SE <= target

type Candidate = { word: VocabWord; elo: number };

function pickNext(
  items: Candidate[],
  theta: number,
  usedIds: Set<string>,
): Candidate | null {
  const unused = items.filter((i) => !usedIds.has(i.word.id));
  if (unused.length === 0) return null;
  const target = theta + (Math.random() * 60 - 30);
  // Exposure control (blueprint §14.9/#6): random among top-N nearest candidates,
  // instead of always the single most informative item (prevents over-exposure).
  const ranked = [...unused].sort((a, b) => Math.abs(a.elo - target) - Math.abs(b.elo - target));
  const N = Math.min(3, ranked.length);
  return ranked[Math.floor(Math.random() * N)];
}

const FORMATS: CatItemFormat[] = ["meaning", "listening", "reading"];
const FORMAT_HISTORY_WINDOW = 5;

/** Soft round-robin (review #3): pick the format least seen among the last N. */
export function pickLeastUsedFormat(history: CatItemFormat[]): CatItemFormat {
  const window = history.slice(-FORMAT_HISTORY_WINDOW);
  const counts = new Map<CatItemFormat, number>();
  for (const f of FORMATS) counts.set(f, 0);
  for (const f of window) counts.set(f, (counts.get(f) ?? 0) + 1);
  let best = FORMATS[0];
  for (const f of FORMATS) {
    if ((counts.get(f) ?? 0) < (counts.get(best) ?? 0)) best = f;
  }
  return best;
}

const romanOf = (w: VocabWord): string => w.romanization ?? w.pinyin ?? w.translation;
const scriptOf = (w: VocabWord): string => w.text ?? w.hanzi ?? "";

/**
 * Build a question in a given format. All three formats derive from the same
 * vocabulary item (content balancing = format rotation, not domain rotation).
 * - meaning:    prompt = romanization → pick the script
 * - listening:  play audio (script via TTS) → pick the script
 * - reading:    prompt = script → pick the romanization
 */
function buildItem(word: VocabWord, elo: number, format: CatItemFormat, wrong: VocabWord[]): CatItem {
  const script = scriptOf(word);
  const roman = romanOf(word);
  const wrongScript = wrong.map(scriptOf);
  const wrongRoman = wrong.map(romanOf);

  if (format === "reading") {
    return {
      word, elo, prompt: script, romanization: roman,
      stimulusType: "text",
      options: shuffle([roman, ...wrongRoman]),
      correctAnswer: roman, format,
    };
  }
  if (format === "listening") {
    return {
      word, elo, prompt: "",
      romanization: roman,
      stimulusType: "audio",
      audioText: script,
      options: shuffle([script, ...wrongScript]),
      correctAnswer: script, format,
    };
  }
  // meaning
  return {
    word, elo, prompt: roman,
    romanization: roman,
    stimulusType: "text",
    options: shuffle([script, ...wrongScript]),
    correctAnswer: script, format,
  };
}

function eloSd(answered: number): number {
  // SE proxy: shrinks with information; pool homogeneity limits floor (30).
  return Math.max(30, 120 - answered * 3);
}

function weakBandsOf(log: CatAnswerLog[]): string[] {
  const wrong = log.filter((a) => !a.correct);
  if (wrong.length === 0) return [];
  const byBand = new Map<string, number>();
  for (const a of wrong) {
    const b = cefrBandOf(a.elo).name;
    byBand.set(b, (byBand.get(b) ?? 0) + 1);
  }
  return [...byBand.entries()]
    .sort((x, y) => y[1] - x[1])
    .map(([band]) => band);
}

function makeResult(theta: number, log: CatAnswerLog[], answered: number): CatResult {
  return {
    eloEstimate: theta,
    eloSd: eloSd(answered),
    cefrBand: cefrBandOf(theta).name,
    answered,
    correct: log.filter((a) => a.correct).length,
    recommendedLevel: "",
    weakBands: weakBandsOf(log),
  };
}

export interface CatResume {
  startTheta: number;
  answers: CatAnswerLog[];
}

/**
 * Client-side adaptive engine (blueprint §4). Single Elo estimate updated by
 * logistic updates with K decay. Termination (equiprecise, §4.4):
 * stop once answered >= MIN_QUESTIONS AND SE <= SEM_TARGET, or pool exhausted
 * (pickNext returns null), or time cap (handled by the page timer).
 *
 * Resume (blueprint §14.10): pass `resume` with the persisted start theta +
 * ordered answers; `start()` re-derives state by REPLAY (theta from
 * startTheta + eloUpdate over answers; formatHistory + usedIds from answers),
 * never from a stale snapshot.
 */
const LAST_ELO_KEY = "navia-cat-last-elo";

function readLastElo(): number | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = window.localStorage.getItem(LAST_ELO_KEY);
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export function useCatExam(priorElo?: number, resumeRef?: { current: CatResume | null }) {
  const vocabulary = useVocabulary();
  const [theta, setTheta] = useState(() => priorElo ?? readLastElo() ?? DEFAULT_ELO);
  const [current, setCurrent] = useState<CatItem | null>(null);
  const [log, setLog] = useState<CatAnswerLog[]>([]);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<CatResult | null>(null);
  const usedIds = useRef(new Set<string>());
  const thetaRef = useRef(theta);
  const logRef = useRef<CatAnswerLog[]>([]);
  const formatHistoryRef = useRef<CatItemFormat[]>([]);
  const resumeStateRef = useRef(resumeRef);

  const items = useMemo(
    () =>
      vocabulary
        .map((w) => ({ word: w, elo: eloOf(w) }))
        .sort((a, b) => a.elo - b.elo),
    [vocabulary],
  );

  const finish = useCallback((finalTheta: number, logRef: CatAnswerLog[]) => {
    setResult(makeResult(finalTheta, logRef, logRef.length));
    setDone(true);
  }, []);

  const pick = useCallback(
    (t: number) => {
      const item = pickNext(items, t, usedIds.current);
      if (!item) {
        finish(t, logRef.current);
        return;
      }
      usedIds.current.add(item.word.id);
      const format = pickLeastUsedFormat(formatHistoryRef.current);
      formatHistoryRef.current.push(format);
      const wrong = shuffle(items.filter((i) => i.word.id !== item.word.id))
        .slice(0, 3)
        .map((i) => i.word);
      setCurrent(buildItem(item.word, item.elo, format, wrong));
    },
    [items, finish],
  );

  const start = useCallback(() => {
    usedIds.current.clear();
    formatHistoryRef.current = [];
    const r = resumeStateRef.current?.current;
    let t: number;
    if (r && r.answers.length > 0) {
      // REPLAY (blueprint §14.10): re-derive from start theta + answers,
      // using the same engine functions → deterministic under any engine change.
      t = r.startTheta;
      for (let i = 0; i < r.answers.length; i++) {
        const a = r.answers[i];
        t = eloUpdate(t, a.elo, a.correct, i);
        usedIds.current.add(a.wordId);
        formatHistoryRef.current.push(a.format);
      }
      logRef.current = r.answers;
      setLog(r.answers);
    } else {
      t = priorElo ?? readLastElo() ?? DEFAULT_ELO;
      logRef.current = [];
      setLog([]);
    }
    thetaRef.current = t;
    setTheta(t);
    setDone(false);
    setResult(null);
    pick(t);
  }, [priorElo, pick]);

  function answer(option: string) {
    if (!current || done) return;
    const correct = option === current.correctAnswer;
    const nextTheta = eloUpdate(thetaRef.current, current.elo, correct, logRef.current.length);
    const newLog = [...logRef.current, { wordId: current.word.id, elo: current.elo, correct, format: current.format }];
    logRef.current = newLog;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LAST_ELO_KEY, String(Math.round(nextTheta)));
    }
    thetaRef.current = nextTheta;
    setLog(newLog);
    setTheta(nextTheta);
    setCurrent(null);
    const answered = newLog.length;
    if (
      answered >= MAX_QUESTIONS ||
      (answered >= MIN_QUESTIONS && eloSd(answered) <= SEM_TARGET)
    ) {
      finish(nextTheta, newLog);
    } else {
      pick(nextTheta);
    }
  }

  return { current, theta, log, done, result, start, answer };
}

export function catRecommendedLevel(result: CatResult, examType: ExamType): string {
  return recommendedLevel(examType, result.eloEstimate);
}
