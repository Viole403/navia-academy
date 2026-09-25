import * as Haptics from "expo-haptics"

/**
 * Haptic vocabulary — ported from Chinese-Easy `lib/haptics.ts`.
 * Keep to these five; a feel for everything is a feel for nothing.
 */
export async function tick(): Promise<void> {
  try {
    await Haptics.selectionAsync()
  } catch {
    // haptics unavailable (web / old device) — silent by design
  }
}

/** Something small picked up (chip, option, toggle on). */
export async function tap(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  } catch {}
}

/** Weight: page turned, answer committed, card graded. */
export async function thunk(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  } catch {}
}

/** Milestones only: exam passed, streak saved, goal hit. */
export async function thud(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  } catch {}
}

/** A warning nudge: streak about to lapse, destructive action armed. */
export async function careful(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
  } catch {}
}
