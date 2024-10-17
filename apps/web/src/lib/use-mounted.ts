"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * True once the component is hydrated on the client. Used to gate UI that
 * reads persisted stores, avoiding server/client markup mismatches.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

/** Client-only snapshot of a browser value (primitive), with an SSR fallback. */
export function useClientSnapshot<T>(getValue: () => T, serverFallback: T): T {
  return useSyncExternalStore(emptySubscribe, getValue, () => serverFallback);
}
