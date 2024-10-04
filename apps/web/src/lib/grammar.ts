import { useEffect, useState } from "react";
import type { ExamType, GrammarPoint } from "@/types";
import { loadGrammar } from "@/lib/data-client";
import { makeHydrator } from "@/lib/data-hydrator";

type Listener = () => void;

const listeners = new Set<Listener>();

export const GRAMMAR_POINTS: GrammarPoint[] = [];
export const GRAMMAR_BY_EXAM: Record<ExamType, GrammarPoint[]> = {
  hsk: [],
  tocfl: [],
  goethe: [],
  jlpt: [],
  toefl: [],
};

function notify() {
  for (const l of listeners) l();
}

function setData(data: GrammarPoint[]) {
  GRAMMAR_POINTS.length = 0;
  GRAMMAR_POINTS.push(...data);
  for (const exam of Object.keys(GRAMMAR_BY_EXAM) as ExamType[]) {
    const bucket = GRAMMAR_BY_EXAM[exam];
    bucket.length = 0;
    bucket.push(...data.filter((g) => Boolean(g.examMappings?.[exam])));
  }
  notify();
}

/** Load grammar for the active learning language and hydrate the store. */
export const hydrateGrammar = makeHydrator<GrammarPoint[]>(loadGrammar, setData);

export function getGrammar(): GrammarPoint[] {
  return GRAMMAR_POINTS;
}

export function subscribeGrammar(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useGrammar(): GrammarPoint[] {
  const [snapshot, setSnapshot] = useState<GrammarPoint[]>(GRAMMAR_POINTS.slice());

  useEffect(() => {
    hydrateGrammar().catch(() => {});
    const unsubscribe = subscribeGrammar(() => setSnapshot(GRAMMAR_POINTS.slice()));
    return unsubscribe;
  }, []);

  return snapshot;
}

if (typeof window !== "undefined") {
  void hydrateGrammar().catch(() => {});
}

export function grammarById(id: string): GrammarPoint | undefined {
  return GRAMMAR_POINTS.find((g) => g.id === id);
}

export function grammarByExam(examType: ExamType): GrammarPoint[] {
  return GRAMMAR_BY_EXAM[examType];
}
