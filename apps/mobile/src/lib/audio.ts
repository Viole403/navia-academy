/**
 * Audio playback, on one dependency.
 *
 * `expo-av` is gone. Its `Sound` object was compiled against a different React
 * Native JSI than the one this app ships, and the mismatch did not surface as a
 * missing feature — it threw `UnsatisfiedLinkError` while the native module
 * registry was still being built, so the app died on launch before any
 * JavaScript ran. Nothing in the type-checked part of the codebase could have
 * caught that; it took a build and a device.
 *
 * The API is close but not the same, and the differences are the kind that look
 * like a typo when you have to read them:
 *
 *   setAudioModeAsync  playsInSilentModeIOS → playsInSilentMode
 *                      shouldDuckAndroid    → interruptionMode: 'duckOthers'
 *                      staysActiveInBackground  — removed
 *   Sound.createAsync  → createAudioPlayer, then play() (nothing starts on its own)
 *   unloadAsync        → remove()
 *   playAsync          → play()
 *   stopAsync          → pause() plus seekTo(0), so the next play starts over
 *   setOnPlaybackStatusUpdate → addListener('statusChange', ({ status }) => …)
 *
 * `isLoaded` and `didJustFinish` survived onto `AudioStatus` unchanged, so the
 * status handling below reads the same as it did before.
 */
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioStatus,
} from "expo-audio"

export type { AudioPlayer, AudioStatus }

/** Anything this app can play: a CDN URL or a cached file on disk. */
export type AudioSource = { uri: string }

let modeConfigured: Promise<void> | null = null

/**
 * Let sound play over the ringer and duck whatever else is talking.
 *
 * Called from several places that all want the same session, so the promise is
 * kept and handed back rather than reconfigured each time — an audio session
 * change interrupts whatever is currently playing, which is exactly what a tap
 * handler should not cause.
 */
export function configureAudioSession(): Promise<void> {
  if (!modeConfigured) {
    modeConfigured = setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "duckOthers",
    }).catch(() => {
      // A backend that refuses the configuration is not a reason to fail; the
      // effects simply stay silent.
    })
  }
  return modeConfigured
}

/**
 * Load a source and start playing it.
 *
 * Nothing begins on creation, so the play call is explicit and after the
 * listener is attached — otherwise a very short clip can finish before anything
 * is watching, and the caller is left showing "playing" for audio that is
 * already over.
 */
export function createPlayer(
  source: AudioSource,
  onStatus?: (status: AudioStatus) => void
): AudioPlayer {
  const player = createAudioPlayer(source)
  if (onStatus) {
    // Named playbackStatusUpdate, not statusChange — that is the video player's
    // event, and copying it from the documentation for that module is how the
    // status handler ends up silently never firing.
    player.addListener("playbackStatusUpdate", (status) => onStatus(status))
  }
  player.play()
  return player
}

/** Load a source without starting it, for a clip that may be replayed. */
export function createSilentPlayer(source: AudioSource): AudioPlayer {
  return createAudioPlayer(source)
}

/** From the beginning, so a replayed effect does not resume mid-clip. */
export async function playFromStart(player: AudioPlayer): Promise<void> {
  await player.seekTo(0)
  player.play()
}

export function stopPlayer(player: AudioPlayer): void {
  player.pause()
  void player.seekTo(0).catch(() => {})
}

/** Release a player. Safe to call twice. */
export function removePlayer(player: AudioPlayer): void {
  try {
    player.remove()
  } catch {
    // Already released.
  }
}
