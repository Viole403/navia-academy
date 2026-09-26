/**
 * The module's JavaScript surface.
 *
 * A local Expo module is a native library with no JavaScript of its own, so this
 * file exists to satisfy the `main` field and to be the one place that knows the
 * module's name. The real work — building the payload and deciding when to write
 * it — lives in the app, in `src/lib/widget.ts` and `src/hooks/useWidgetSync.ts`.
 *
 * `requireNativeModule` rather than `requireOptionalNativeModule` on purpose:
 * this module declares Android only, so a build for a platform without it would
 * fail at import time with a message naming this module. The app-facing wrapper in
 * `src/lib/nativeWidgets.ts` is the one that has to degrade quietly, and it reads
 * this module through the optional path.
 */
import { requireNativeModule } from "expo-modules-core"

export interface NaviaWidgetsNativeModule {
  /** Always true on Android; the module simply does not exist elsewhere. */
  isAvailable(): Promise<boolean>
  /** Writes one JSON snapshot the widget process reads when it draws. */
  setPayload(json: string): Promise<boolean>
  /** Drops the snapshot, so a signed-out home screen shows nothing. */
  clear(): Promise<boolean>
}

export default requireNativeModule<NaviaWidgetsNativeModule>("NaviaWidgets")
