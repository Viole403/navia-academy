import { storage } from "./storage"

const KEY = "navia.onboarded.v1"

export async function hasSeenOnboarding(): Promise<boolean> {
  const v = await storage.getItem(KEY)
  return v === "1"
}

export async function markOnboarded(): Promise<void> {
  await storage.setItem(KEY, "1")
}
