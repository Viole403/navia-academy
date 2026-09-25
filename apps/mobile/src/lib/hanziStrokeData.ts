import { Asset } from "expo-asset"
import { Platform } from "react-native"
import { HANZI_SHARDS, SHARD_COUNT } from "../../assets/hanzi/shards"

/**
 * hanzi-writer's stroke data for one character.
 *
 * Declared locally rather than imported from `hanzi-writer`: the library itself
 * never runs in React Native (its drawing happens inside a WebView), so the app
 * would otherwise take a runtime dependency purely for a type.
 */
export interface CharacterJson {
  strokes: string[]
  medians: number[][][]
}

/**
 * Stroke data, read from a bundled shard rather than the JS bundle.
 *
 * The dataset ships as 64 asset files that are read on demand. An imported
 * `.json` is inlined into the module graph by Metro, and a single multi-
 * megabyte dataset becomes the majority of the Hermes bytecode and every launch
 * pays to construct thousands of nested [x,y] arrays before anyone has asked to
 * see one character drawn.
 *
 * Three things worth knowing before changing this:
 *
 *  - **The shard is computed, never looked up.** `codePointAt(0) % SHARD_COUNT`
 *    matches the builder in `scripts/build-hanzi-shards.mjs`, so there is no
 *    character→shard table to bundle and keep in step. Change the bucketing in
 *    one place and it must change in both.
 *  - **Requires are static.** `HANZI_SHARDS` is a generated array of
 *    `require()` calls because Metro resolves those at build time; a computed
 *    `require('./shard-' + n)` resolves to nothing at all.
 *  - **In-flight loads are cached, not just finished ones.** A word is several
 *    characters mounting at once and each asks for its shard immediately;
 *    caching the promise means two characters in the same shard share one read
 *    instead of racing.
 */
const cache = new Map<number, Promise<Record<string, CharacterJson>>>()

function shardFor(character: string): number {
  const cp = character.codePointAt(0)
  if (cp === undefined) return 0
  return cp % SHARD_COUNT
}

async function readShard(
  index: number
): Promise<Record<string, CharacterJson>> {
  // The generated array holds thunks (one static `require` per shard, because
  // Metro resolves those at build time); `Asset.fromModule` takes the module
  // itself. Its parameter type is a module *id* shape, and a `require()`d JSON
  // module is neither, hence the cast.
  const asset = Asset.fromModule(HANZI_SHARDS[index]() as never)
  await asset.downloadAsync()
  const uri = asset.localUri ?? asset.uri

  /*
   * Two readers, because there is no one API that works on both. On native the
   * asset lands on disk and expo-file-system reads it — `fetch` on a file:// URL
   * is not reliable on Android. Web has no filesystem and the asset is a URL.
   */
  let text: string
  if (Platform.OS === "web") {
    const res = await fetch(uri)
    if (!res.ok) throw new Error(`Shard ${index} failed (${res.status})`)
    text = await res.text()
  } else {
    const { File } = await import("expo-file-system")
    text = await new File(uri).text()
  }

  return JSON.parse(text) as Record<string, CharacterJson>
}

function loadShard(index: number): Promise<Record<string, CharacterJson>> {
  const existing = cache.get(index)
  if (existing) return existing
  const pending = readShard(index).catch((error) => {
    // A failed read must not poison the cache — the next character wanting this
    // shard should get a fresh attempt rather than the same rejection for the
    // life of the process.
    cache.delete(index)
    throw error
  })
  cache.set(index, pending)
  return pending
}

/**
 * Stroke data for one character, or null if the bundled dataset doesn't have it.
 *
 * Null is the same "not covered" answer a character outside the dataset has
 * always had, and callers handle it the same way — HanziStage shows the
 * outlined character.
 */
export async function bundledCharacterData(
  character: string
): Promise<CharacterJson | null> {
  const shard = await loadShard(shardFor(character))
  return shard[character] ?? null
}
