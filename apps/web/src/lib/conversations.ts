import { useEffect, useState } from "react";
import type { ExamType, ConversationScenario } from "@/types";
import { loadConversations } from "@/lib/data-client";
import { makeHydrator } from "@/lib/data-hydrator";

type Listener = () => void;

const listeners = new Set<Listener>();

export const CONVERSATIONS: ConversationScenario[] = [];
export const CONVERSATIONS_BY_EXAM: Record<ExamType, ConversationScenario[]> = {
  hsk: [],
  tocfl: [],
  goethe: [],
  jlpt: [],
  toefl: [],
};

function notify() {
  for (const l of listeners) l();
}

function setData(data: ConversationScenario[]) {
  CONVERSATIONS.length = 0;
  CONVERSATIONS.push(...data);
  for (const exam of Object.keys(CONVERSATIONS_BY_EXAM) as ExamType[]) {
    const bucket = CONVERSATIONS_BY_EXAM[exam];
    bucket.length = 0;
    bucket.push(...data.filter((c) => Boolean(c.examMappings?.[exam])));
  }
  notify();
}

/** Load conversations for the active learning language and hydrate the store. */
export const hydrateConversations = makeHydrator<ConversationScenario[]>(loadConversations, setData);

export function getConversations(): ConversationScenario[] {
  return CONVERSATIONS;
}

export function subscribeConversations(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useConversations(): ConversationScenario[] {
  const [snapshot, setSnapshot] = useState<ConversationScenario[]>(CONVERSATIONS.slice());

  useEffect(() => {
    hydrateConversations().catch(() => {});
    const unsubscribe = subscribeConversations(() => setSnapshot(CONVERSATIONS.slice()));
    return unsubscribe;
  }, []);

  return snapshot;
}

if (typeof window !== "undefined") {
  void hydrateConversations().catch(() => {});
}

export function conversationById(id: string): ConversationScenario | undefined {
  return CONVERSATIONS.find((c) => c.id === id);
}

export function conversationByExam(examType: ExamType): ConversationScenario[] {
  return CONVERSATIONS_BY_EXAM[examType];
}
