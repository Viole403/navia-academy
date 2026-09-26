/**
 * Sound effects.
 *
 * Two rules here are load-bearing, and both were bugs first:
 *
 *  - **The rewind before `play()` must be awaited.** `seekTo` returns a promise,
 *    and a player that has finished sits parked at the end of its clip — where
 *    `play()` does nothing at all. Firing the seek without waiting played
 *    against the end of the clip and went silent, so every effect worked
 *    exactly once per launch. The three stages (create, seek, play) each swallow
 *    their own errors on purpose, so a missing audio backend degrades to
 *    silence rather than an exception on a hot path.
 *
 *  - **`configureAudioSession()` is called once at startup** (from the root
 *    layout). Without it iOS routes playback through the default session, where
 *    the ring/silent switch mutes everything — so every effect is silent for
 *    anyone whose phone is on silent, which is most people most of the time.
 *    It also sets `mixWithOthers`, because a 200ms stroke click has no business
 *    pausing someone's podcast.
 *
 * The clips are pre-rendered WAVs rather than synthesised: React Native has no
 * Web Audio API, so they are baked offline rather than generated at runtime.
 *
 * Uses the same audio engine as the TTS hook, so the app keeps one audio
 * dependency.
 */
import {
  configureAudioSession,
  createSilentPlayer,
  playFromStart,
  removePlayer,
  type AudioSource,
} from "@/lib/audio"

export { configureAudioSession }

const CLIPS = {
  stroke: require("@assets/sounds/stroke.wav"),
  chime: require("@assets/sounds/chime.wav"),
  retry: require("@assets/sounds/retry.wav"),
  tap: require("@assets/sounds/tap.wav"),
  fanfare: require("@assets/sounds/fanfare.wav"),
  gong: require("@assets/sounds/gong.wav"),
} as const

export type SoundName = keyof typeof CLIPS

export type SoundPrefs = {
  /** Respect the OS silent switch (iOS). Off = silent. */
  enabled: boolean
}

let prefs: SoundPrefs = { enabled: true }

/** Read once at startup; the Settings toggle writes through `setSoundPrefs`. */
export function setSoundPrefs(next: SoundPrefs) {
  prefs = next
}

/**
 * Route playback through the shared session.
 *
 * `playsInSilentModeIOS` is the whole point — see the file header. The
 * `shouldDuckAndroid` + `mixWithOthers` pair keeps an effect from pausing
 * whatever else is playing.
 */
/** Created lazily, not at module scope. */
const players = new Map<SoundName, ReturnType<typeof createSilentPlayer>>()

function playerFor(name: SoundName) {
  const existing = players.get(name)
  if (existing) return existing
  try {
    const player = createSilentPlayer({ uri: CLIPS[name] } as AudioSource)
    players.set(name, player)
    return player
  } catch {
    return null
  }
}

export async function playSound(name: SoundName): Promise<void> {
  if (!prefs.enabled) return
  try {
    const player = playerFor(name)
    if (!player) return
    await playFromStart(player)
  } catch {
    // Silence beats an exception on a tap handler.
  }
}

export async function unloadSounds(): Promise<void> {
  for (const player of players.values()) {
    removePlayer(player)
  }
  players.clear()
}
