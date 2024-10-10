import { useEffect, useState } from "react";
import type { Achievement } from "@/types";
import { loadAchievements } from "@/lib/data-client";

type Listener = () => void;
const listeners = new Set<Listener>();

export const ACHIEVEMENTS: Achievement[] = [];

let hydratePromise: Promise<Achievement[]> | null = null;

function notify() {
  for (const l of listeners) l();
}

function setData(data: Achievement[]) {
  ACHIEVEMENTS.length = 0;
  ACHIEVEMENTS.push(...data);
  notify();
}

export function hydrateAchievements(): Promise<Achievement[]> {
  if (hydratePromise) return hydratePromise;
  hydratePromise = loadAchievements<Achievement>()
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

export function subscribeAchievements(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAchievements(): Achievement[] {
  const [snapshot, setSnapshot] = useState<Achievement[]>(ACHIEVEMENTS.slice());

  useEffect(() => {
    hydrateAchievements().catch(() => {});
    const unsubscribe = subscribeAchievements(() => setSnapshot(ACHIEVEMENTS.slice()));
    return unsubscribe;
  }, []);

  return snapshot;
}

if (typeof window !== "undefined") {
  void hydrateAchievements().catch(() => {});
}
