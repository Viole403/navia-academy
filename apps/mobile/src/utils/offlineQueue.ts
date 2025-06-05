import AsyncStorage from "@react-native-async-storage/async-storage";
import { progress } from "@/api/endpoints";
import type { SrsCard } from "@/types/api";

const KEY = "navia.outbox.v1";

export interface OutboxOp {
  id: string; // uuid-ish
  kind: "srs.review" | "study.session";
  body:
    | { item_id: string; kind: "word" | "character" | "grammar"; grade: 0 | 1 | 2 | 3 }
    | { minutes: number; xp: number };
  createdAt: number;
  attempts: number;
}

async function read(): Promise<OutboxOp[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OutboxOp[]) : [];
  } catch {
    return [];
  }
}

async function write(ops: OutboxOp[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(ops));
}

export async function enqueue(op: Omit<OutboxOp, "id" | "createdAt" | "attempts">): Promise<void> {
  const next: OutboxOp = {
    ...op,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    attempts: 0,
  };
  const list = await read();
  await write([...list, next]);
}

export async function drain(): Promise<{ flushed: number; remained: number }> {
  const ops = await read();
  let flushed = 0;
  const kept: OutboxOp[] = [];

  for (const op of ops) {
    try {
      if (op.kind === "srs.review") {
        const b = op.body as Extract<OutboxOp["body"], { item_id: string }>;
        await progress.review(b.item_id, b.kind, b.grade);
      } else if (op.kind === "study.session") {
        const b = op.body as Extract<OutboxOp["body"], { minutes: number }>;
        await progress.logStudy(b.minutes, b.xp);
      }
      flushed++;
    } catch {
      op.attempts += 1;
      if (op.attempts < 5) kept.push(op);
    }
  }

  await write(kept);
  return { flushed, remained: kept.length };
}

export async function getPendingCount(): Promise<number> {
  return (await read()).length;
}

/**
 * Optimistic wrapper — tries the network, falls back to queueing
 * so the UI never blocks on connectivity.
 */
export async function reviewWithQueue(
  item_id: string,
  kind: "word" | "character" | "grammar",
  grade: 0 | 1 | 2 | 3,
): Promise<{ ok: boolean; offline: boolean; card?: SrsCard }> {
  try {
    const card = await progress.review(item_id, kind, grade);
    return { ok: true, offline: false, card };
  } catch {
    await enqueue({ kind: "srs.review", body: { item_id, kind, grade } });
    return { ok: true, offline: true };
  }
}

export async function logStudyWithQueue(
  minutes: number,
  xp: number,
): Promise<{ ok: true; offline: boolean }> {
  try {
    await progress.logStudy(minutes, xp);
    return { ok: true, offline: false };
  } catch {
    await enqueue({ kind: "study.session", body: { minutes, xp } });
    return { ok: true, offline: true };
  }
}
