import { useEffect, useState } from "react"
import type { Exercise } from "@/types"
import { loadPlacement } from "@/lib/data-client"
import { makeHydrator } from "@/lib/data-hydrator"

export interface PlacementQuestion extends Exercise {
  /** Difficulty band used by the adaptive engine: 1 (HSK1 easy) … 6 (HSK5+) */
  band: number
}

type Listener = () => void
const listeners = new Set<Listener>()

export const PLACEMENT_BANK: PlacementQuestion[] = []

function notify() {
  for (const l of listeners) l()
}

function setData(data: PlacementQuestion[]) {
  PLACEMENT_BANK.length = 0
  PLACEMENT_BANK.push(...data)
  notify()
}

/** Load placement for the active learning language and hydrate the store. */
export const hydratePlacement = makeHydrator<PlacementQuestion[]>(
  (lang) => loadPlacement<PlacementQuestion>(lang),
  setData
)

export function subscribePlacement(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function usePlacement(): PlacementQuestion[] {
  const [snapshot, setSnapshot] = useState<PlacementQuestion[]>(
    PLACEMENT_BANK.slice()
  )

  useEffect(() => {
    hydratePlacement().catch(() => {})
    const unsubscribe = subscribePlacement(() =>
      setSnapshot(PLACEMENT_BANK.slice())
    )
    return unsubscribe
  }, [])

  return snapshot
}

if (typeof window !== "undefined") {
  void hydratePlacement().catch(() => {})
}
