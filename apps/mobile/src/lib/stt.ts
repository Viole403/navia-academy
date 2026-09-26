/**
 * Speech recognition on the phone.
 *
 * Mirrors the web module's `SttRecognizer` shape on purpose: the drill screen
 * should not care which platform it is on, and the comparison logic is already
 * shared. What differs is the recogniser, and one difference matters more than
 * the rest — see `onDevicePreferred` below.
 *
 * The native module is loaded defensively. It is a development build, not part
 * of Expo Go, so a client running in Expo Go has to get a clear "not available"
 * rather than a red screen.
 */
import { sttLocale, type SttRecognizer } from "@navia/utils"

export type { SttRecognizer } from "@navia/utils"

type ResultEvent = { transcript: string; isFinal: boolean }
type ErrorEvent = { message: string; error?: string }

interface NativeModule {
  isRecognitionAvailable(): boolean
  supportsOnDeviceRecognition?(): boolean
  requestPermissionsAsync(): Promise<{ granted: boolean }>
  start(options: Record<string, unknown>): void
  stop(): void
  abort(): void
  addListener(
    event: "result",
    handler: (e: ResultEvent) => void
  ): { remove: () => void }
  addListener(
    event: "error",
    handler: (e: ErrorEvent) => void
  ): { remove: () => void }
  addListener(event: "end", handler: () => void): { remove: () => void }
}

/**
 * Absent in Expo Go, where the native side is not built. Resolved lazily and
 * cached so the failure is discovered once per session rather than per press.
 */
let native: NativeModule | null | undefined

function loadNative(): NativeModule | null {
  if (native !== undefined) return native
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("expo-speech-recognition") as {
      ExpoSpeechRecognitionModule: NativeModule
    }
    native = mod.ExpoSpeechRecognitionModule ?? null
  } catch {
    native = null
  }
  return native
}

/**
 * Whether the native module is present at all.
 *
 * Distinct from `sttSupported`, and the two are not interchangeable: a
 * development build on a device with no recogniser still has the module but
 * cannot use it, while a client running in Expo Go has no module to begin with.
 * Telling the learner the feature needs a development build is only true in the
 * second case, so the two must not be reported the same way.
 */
export function sttModulePresent(): boolean {
  return loadNative() !== null
}

export function sttSupported(): boolean {
  const mod = loadNative()
  if (!mod) return false
  try {
    return mod.isRecognitionAvailable()
  } catch {
    return false
  }
}

/**
 * Whether the device can recognise speech without sending it anywhere.
 *
 * This is the default we ask for, not an optimisation. The web client uses the
 * browser's recogniser and inherits whatever the browser does about audio
 * leaving the machine; on a phone the platform default for this module is
 * network-backed recognition, so the choice has to be made explicitly. A drill
 * should not record a learner's voice onto a server because nobody passed a
 * flag.
 */
export function onDevicePreferred(): boolean {
  const mod = loadNative()
  if (!mod?.supportsOnDeviceRecognition) return false
  try {
    return mod.supportsOnDeviceRecognition()
  } catch {
    return false
  }
}

export async function ensureMicPermission(): Promise<boolean> {
  const mod = loadNative()
  if (!mod) return false
  try {
    const res = await mod.requestPermissionsAsync()
    return Boolean(res?.granted)
  } catch {
    return false
  }
}

export function startSTT(
  language: string,
  onFinal: (transcript: string) => void,
  onInterim: (transcript: string) => void,
  onError: (message: string) => void,
  onEnd: () => void
): SttRecognizer | null {
  const mod = loadNative()
  if (!mod) return null

  const subs = [
    mod.addListener("result", (e) => {
      const text = (e?.transcript ?? "").trim()
      if (e?.isFinal) onFinal(text)
      else onInterim(text)
    }),
    mod.addListener("error", (e) => {
      const code = e?.error ?? e?.message ?? "unknown"
      // An abort is the learner's own stop, not a failure worth reporting.
      if (code !== "aborted") onError(String(code))
    }),
    mod.addListener("end", onEnd),
  ]

  const dispose = () => subs.forEach((s) => s.remove())
  try {
    mod.start({
      lang: sttLocale(language),
      continuous: true,
      interimResults: true,
      requiresOnDeviceRecognition: onDevicePreferred(),
    })
  } catch {
    dispose()
    return null
  }
  return { stop: () => mod.stop(), abort: () => mod.abort() }
}
