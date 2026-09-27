/**
 * Bridge to the native widgets. The module is Android-only, so every entry point
 * degrades quietly rather than throwing on a platform that never had it.
 */

import { requireOptionalNativeModule } from "expo-modules-core"
import { Platform } from "react-native"
import type { WidgetPayload } from "./widget"

interface NaviaWidgetsNativeModule {
  isAvailable(): Promise<boolean>
  setPayload(json: string): Promise<boolean>
  clear(): Promise<boolean>
}

const native =
  requireOptionalNativeModule<NaviaWidgetsNativeModule>("NaviaWidgets")

/** Whether the widgets are missing because the build is wrong or the platform lacks them. */
export function widgetUnavailableReason():
  "missing-build" | "unsupported" | null {
  if (native) return null
  return Platform.OS === "android" ? "missing-build" : "unsupported"
}

export function widgetsAvailable(): boolean {
  return native !== null && Platform.OS === "android"
}

/** Serialised here so the native contract stays one string, unchanged by a future iOS target. */
export async function pushWidgetPayload(
  payload: WidgetPayload
): Promise<boolean> {
  if (!native) return false
  try {
    await native.setPayload(JSON.stringify(payload))
    return true
  } catch {
    // A failed sync must never surface as a study-session failure.
    return false
  }
}

export async function clearWidgetPayload(): Promise<void> {
  if (!native) return
  try {
    await native.clear()
  } catch {}
}
