import { LESSONS, UNITS } from "@/lib/curriculum";
import { isDue } from "@/lib/srs";
import type { LessonProgress } from "@/stores/progress";
import type { ExamType, GrammarPoint, HanziChar, Lesson, SrsCard, StudySessionLog, Unit, VocabWord } from "@/types";

/** First not-completed lesson following curriculum order. */
export function nextLesson(
  lessons: Record<string, LessonProgress>,
  activeLessons?: Lesson[],
  allUnits?: Unit[],
  allLessons?: Lesson[],
): Lesson | null {
  const pool = activeLessons ?? allLessons ?? LESSONS;
  const units = allUnits ?? UNITS;
  const orderedUnits = [...units].sort((a, b) => a.order - b.order);
  for (const unit of orderedUnits) {
    const unitLessons = pool.filter((l) => l.unitId === unit.id).sort((a, b) => a.order - b.order);
    for (const lesson of unitLessons) {
      if (!lessons[lesson.id]?.completed) return lesson;
    }
  }
  return null;
}

export function dueCards(srs: Record<string, SrsCard>): SrsCard[] {
  return Object.values(srs).filter((c) => isDue(c));
}

/**
 * A card belongs to the active exam only if its content item maps to that
 * exam. Prevents HSK learners from reviewing TOCFL-only items and vice versa.
 */
export function inExamFor(
  exam: ExamType,
  vocab: VocabWord[],
  chars: HanziChar[],
  grammar: GrammarPoint[],
): (c: SrsCard) => boolean {
  const keys = new Set<string>();
  for (const w of vocab) if (w.examMappings?.[exam]) keys.add(`word:${w.id}`);
  for (const c of chars) if (c.examMappings?.[exam]) keys.add(`character:${c.id}`);
  for (const g of grammar) if (g.examMappings?.[exam]) keys.add(`grammar:${g.id}`);
  return (c) => keys.has(`${c.kind}:${c.itemId}`);
}

export function todayLog(sessions: Record<string, StudySessionLog>): StudySessionLog | null {
  return sessions[new Date().toISOString().slice(0, 10)] ?? null;
}

/** Minutes per day for the last `days` days, oldest first. */
export function lastDays(sessions: Record<string, StudySessionLog>, days: number) {
  const out: { date: string; minutes: number; xp: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const log = sessions[key];
    out.push({ date: key, minutes: log?.minutes ?? 0, xp: log?.xp ?? 0 });
  }
  return out;
}

export function totalMinutes(sessions: Record<string, StudySessionLog>): number {
  return Object.values(sessions).reduce((a, l) => a + l.minutes, 0);
}

export function learnedCount(srs: Record<string, SrsCard>, kind: SrsCard["kind"], minMastery = 30): number {
  return Object.values(srs).filter((c) => c.kind === kind && c.mastery >= minMastery).length;
}

export function xpForNextLevel(level: number): number {
  return level * level * 50;
}
