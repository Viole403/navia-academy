import { useEffect, useState } from "react";
import type { ExamType } from "@/types";
import { loadExamConfig, type ExamDefinitionConfig, type ExamConfigBundle } from "@/lib/data-client";

/**
 * Exam system config (definitions, display names, abbreviations, types,
 * badge colors). App-level, not language-scoped. Hydrated from the cache-first
 * data client.
 */

export interface ExamDefinition {
  type: ExamType;
  name: string;
  nameCN: string;
  name_en: string;
  name_de: string;
  name_ja: string;
  region: string;
  script: "Simplified" | "Traditional" | "Both";
  levels: string[];
  wordCountPerLevel: Record<string, number>;
  focus: ("listening" | "reading" | "writing" | "speaking")[];
  description?: string;
  website?: string;
}

export const EXAM_DEFINITIONS = {} as Record<ExamType, ExamDefinition>;
export const EXAM_DISPLAY_NAMES = {} as Record<ExamType, string>;
export const EXAM_ABBREVIATIONS = {} as Record<ExamType, string>;
export const ALL_EXAM_TYPES: ExamType[] = [];
export const EXAM_BADGE_COLORS = {} as Record<ExamType, string>;

// Static fallback so labels never show raw keys (e.g. "jlpt") before hydration.
const FALLBACK_DISPLAY_NAMES: Record<ExamType, string> = {
  hsk: "HSK", tocfl: "TOCFL", goethe: "Goethe-Zertifikat",
  jlpt: "JLPT",
  toefl: "TOEFL iBT",
};
Object.assign(EXAM_DISPLAY_NAMES, FALLBACK_DISPLAY_NAMES);

type Listener = () => void;
const listeners = new Set<Listener>();
let hydratePromise: Promise<ExamConfigBundle> | null = null;

function notify() {
  for (const l of listeners) l();
}

function setData(b: ExamConfigBundle) {
  Object.assign(EXAM_DEFINITIONS, b.definitions as Record<ExamType, ExamDefinition>);
  Object.assign(EXAM_DISPLAY_NAMES, b.displayNames as Record<ExamType, string>);
  Object.assign(EXAM_ABBREVIATIONS, b.abbreviations as Record<ExamType, string>);
  ALL_EXAM_TYPES.length = 0;
  ALL_EXAM_TYPES.push(...(b.types as ExamType[]));
  Object.assign(EXAM_BADGE_COLORS, b.badgeColors as Record<ExamType, string>);
  notify();
}

export function hydrateExamConfig(): Promise<ExamConfigBundle> {
  if (hydratePromise) return hydratePromise;
  hydratePromise = loadExamConfig()
    .then((data) => {
      setData(data);
      return data;
    })
    .catch((err) => {
      hydratePromise = null;
      throw err;
    });
  return hydratePromise;
}

export function subscribeExamConfig(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useExamConfig(): ExamConfigBundle {
  const [, setTick] = useState(0);

  useEffect(() => {
    hydrateExamConfig().catch(() => {});
    const unsubscribe = subscribeExamConfig(() => setTick((t) => t + 1));
    return unsubscribe;
  }, []);

  // Display names: readable canonical names (HSK, TOCFL, JLPT, …) from the
  // exam-display-names bundle. The per-learning-language names (nameCN etc.)
  // are only shown where context warrants them (e.g. exam overview page).
  const displayNames: Record<string, string> = {};
  for (const et of ALL_EXAM_TYPES) {
    displayNames[et] = EXAM_DISPLAY_NAMES[et] ?? et;
  }

  return {
    definitions: EXAM_DEFINITIONS as unknown as Record<string, ExamDefinitionConfig>,
    displayNames,
    abbreviations: EXAM_ABBREVIATIONS as unknown as Record<string, string>,
    types: ALL_EXAM_TYPES,
    badgeColors: EXAM_BADGE_COLORS as unknown as Record<string, string>,
  };
}

if (typeof window !== "undefined") {
  void hydrateExamConfig().catch(() => {});
}

export function isValidExamLevel(examType: ExamType, level: string): boolean {
  const def = EXAM_DEFINITIONS[examType];
  if (!def) return false;
  return def.levels.includes(level);
}
