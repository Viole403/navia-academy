import { useEffect, useState } from "react";
import type { ExamType, HskLevel, VocabWord } from "@/types";
import { loadVocabulary } from "@/lib/data-client";
import { makeHydrator } from "@/lib/data-hydrator";

/**
 * Vocabulary data sourced from the cache-first data client (R2/CDN), hydrated
 * into a small in-memory store that keeps a sync API for consumers while
 * loading from the CDN at runtime.
 *
 * Use `useVocabulary()` in React components for a guaranteed re-render once the
 * bundle arrives. Sync helpers read the current snapshot (empty until hydrated)
 * for server-side/module-scope call sites.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

// Mutable in-place store so `VOCABULARY` / `VOCAB_BY_EXAM` const bindings
// stay valid while data is swapped after CDN hydration.
export const VOCABULARY: VocabWord[] = [];
export const VOCAB_BY_EXAM: Record<ExamType, VocabWord[]> = {
  hsk: [],
  tocfl: [],
  goethe: [],
  jlpt: [],
  toefl: [],
};

function notify() {
  for (const l of listeners) l();
}

function setData(data: VocabWord[]) {
  VOCABULARY.length = 0;
  VOCABULARY.push(...data);
  for (const exam of Object.keys(VOCAB_BY_EXAM) as ExamType[]) {
    const bucket = VOCAB_BY_EXAM[exam];
    bucket.length = 0;
    bucket.push(...data.filter((w) => Boolean(w.examMappings?.[exam])));
  }
  notify();
}

/** Load vocabulary for the active learning language and hydrate the store. */
export const hydrateVocabulary = makeHydrator<VocabWord[]>(loadVocabulary, setData);

export function getVocabulary(): VocabWord[] {
  return VOCABULARY;
}

export function subscribeVocabulary(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** React hook: subscribes to the store and returns vocabulary once hydrated. */
export function useVocabulary(): VocabWord[] {
  const [snapshot, setSnapshot] = useState<VocabWord[]>(VOCABULARY.slice());

  useEffect(() => {
    hydrateVocabulary().catch(() => {
      // non-fatal
    });
    const unsubscribe = subscribeVocabulary(() => setSnapshot(VOCABULARY.slice()));
    return unsubscribe;
  }, []);

  return snapshot;
}

// Auto-hydrate on the client so page renders after mount get data.
if (typeof window !== "undefined") {
  void hydrateVocabulary().catch(() => {
    // non-fatal: consumers fall back to empty state until next load
  });
}

// ─── Sync helpers (read current snapshot) ──────────────────────────────

export function vocabById(id: string): VocabWord | undefined {
  return VOCABULARY.find((v) => v.id === id);
}

export function vocabByHsk(hsk: HskLevel): VocabWord[] {
  return VOCABULARY.filter((v) => v.hsk === hsk);
}

export function vocabByExam(examType: ExamType): VocabWord[] {
  return VOCAB_BY_EXAM[examType];
}

export function vocabByHanzi(hanzi: string): VocabWord | undefined {
  return VOCABULARY.find((v) => v.hanzi === hanzi);
}

export function getVocabCountByLevel(): Record<HskLevel, number> {
  return VOCABULARY.reduce((acc, word) => {
    const level = (word.level ?? word.hsk ?? 1) as HskLevel;
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<HskLevel, number>);
}
