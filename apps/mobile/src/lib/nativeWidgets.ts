/**
 * Reaching the native widgets from JavaScript.
 *
 * The module only exists in a development or production build, and only on
 * Android — an Expo Go client has no such native module and an iOS build has
 * none either. So every call here is guarded and every caller has to treat
 * "unavailable" as a normal state rather than an error: a learner on iOS should
 * get a working app, not a crash over a feature that was never there.
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

/**
 * Why the widgets are not there, in words the UI can show.
 *
 * The two reasons need different wording. A missing native module on Android
 * means the build is wrong, and telling the learner that would be pointless
 * noise; a platform that simply has no implementation yet is worth a line in
 * settings.
 */
export function widgetUnavailableReason():
  "missing-build" | "unsupported" | null {
  if (native) return null
  return Platform.OS === "android" ? "missing-build" : "unsupported"
}

export function widgetsAvailable(): boolean {
  return native !== null && Platform.OS === "android"
}

/**
 * Writes a snapshot the widget can read.
 *
 * Serialising here rather than passing an object across the bridge keeps the
 * native side's contract a single string, so the widget process never has to know
 * anything about this app's types — which is what lets the same payload feed a
 * future iOS target unchanged.
 */
export async function pushWidgetPayload(
  payload: WidgetPayload
): Promise<boolean> {
  if (!native) return false
  try {
    await native.setPayload(JSON.stringify(payload))
    return true
  } catch {
    // A failed widget sync must never surface as a study-session failure. The
    // data is already saved; this is decoration.
    return false
  }
}

export async function clearWidgetPayload(): Promise<void> {
  if (!native) return
  try {
    await native.clear()
  } catch {
    // Same reasoning as above: nothing to recover, and nothing to tell the user.
  }
}
