import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveMediaConfig, storageConfigured, type MediaConfig } from "./config";
import { createStorageClient, listKeys, uploadBuffer } from "./storage";
import { synthesizeAudioWithRotation } from "./tts-keys";
import type { MediaGender, MediaLocale } from "./tts";
import { OUTPUT_AUDIO_DIR, audioObjectKey, contentHash, loadManifest, type ManifestEntry } from "./manifest";

interface GenerateRecord {
  key: string;
  text: string;
  locale: string;
  gender: string;
  hash: string;
  generatedAt: string;
  audioRef?: string;
}

const RECORDS_PATH = join(OUTPUT_AUDIO_DIR, ".generate-records.json");
const RATE_LIMIT_MS = 350;
const RETRY_BACKOFF_MS = 2000;
const GENDERS = ["female", "male"] as const;

export interface BatchResult {
  generated: number;
  copied: number;
  skipped: number;
  errors: number;
  total: number;
  upload: boolean;
}

async function loadRecords(): Promise<Map<string, GenerateRecord>> {
  try {
    const raw = await readFile(RECORDS_PATH, "utf-8");
    const list = JSON.parse(raw) as GenerateRecord[];
    return new Map(list.map((r) => [r.key, r]));
  } catch {
    return new Map();
  }
}

async function saveRecords(records: GenerateRecord[]) {
  await mkdir(OUTPUT_AUDIO_DIR, { recursive: true });
  await writeFile(RECORDS_PATH, JSON.stringify(records, null, 2), "utf-8");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Check if a local audio file exists on disk.
 * Used to skip storage LIST calls when the file is already present locally.
 */
async function localAudioExists(key: string, locale: string, gender: string): Promise<boolean> {
  try {
    const file = join(OUTPUT_AUDIO_DIR, `${key}__${locale}__${gender}.mp3`);
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

/**
 * Build a Set of all object keys already in storage under the audio prefix.
 * Uses a single LIST call instead of per-entry HEAD requests — much faster
 * for bulk operations, especially on ephemeral runners.
 */
async function existingAudioKeys(
  cfg: MediaConfig,
  client: ReturnType<typeof createStorageClient>,
): Promise<Set<string>> {
  const keys = await listKeys(cfg, client, "audio/");
  return new Set(keys);
}

/** True for transient edge-tts failures that deserve a single retry. */
function isTransient(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("504") || msg.includes("WSServerHandshakeError");
}

/**
 * Generate audio for every manifest entry, per gender.
 *
 * Dedup guarantee: the SAME text+locale+gender is synthesized at most ONCE.
 * Every other manifest key that points to identical text+locale+gender reuses
 * (copies) that audio — never calls TTS twice, never stores duplicated bytes
 * beyond the per-key object every consumer needs.
 *
 * Skip logic is robust against ephemeral runners (GitHub Actions):
 * 1. First check local records (.generate-records.json) for fast skip.
 * 2. Then check filesystem — if the .mp3 file exists locally and hash matches, skip.
 * 3. Then check a pre-fetched Set of storage keys (single LIST call) —
 *    this replaces the old per-entry HEAD request approach which was slow.
 * 4. Finally check dedupIndex for same-text reuse within this run.
 *
 * Concurrency: tasks run through a manual in-flight queue (default 5,
 * `MEDIA_TTS_CONCURRENCY`) because TTS is I/O-bound — several WebSocket
 * syntheses overlap instead of serializing. The dedup slot is reserved
 * synchronously when each task is enqueued (before any `await`), so two
 * parallel tasks with the same text::locale::gender can never both synthesize:
 * the first reserves the combo, the rest become copies of the first.
 *
 * Progress is checkpointed to disk every `MEDIA_TTS_CHECKPOINT` (default 200)
 * new records, so a crash mid-batch never re-synthesizes finished items.
 */
export async function generateAudioBatch(opts: { limit?: number; dryRun?: boolean; lang?: string } = {}): Promise<BatchResult> {
  const cfg = await resolveMediaConfig();
  const manifest = await loadManifest();
  const records = await loadRecords();
  const upload = storageConfigured(cfg);
  const client = upload ? createStorageClient(cfg) : null;

  const concurrency = Math.max(1, Number(process.env.MEDIA_TTS_CONCURRENCY) || 5);
  const checkpointEvery = Math.max(1, Number(process.env.MEDIA_TTS_CHECKPOINT) || 200);

  await mkdir(OUTPUT_AUDIO_DIR, { recursive: true });

  // Pre-fetch all existing audio keys in one LIST call instead of N HEAD requests.
  const storageKeys = client ? await existingAudioKeys(cfg, client) : new Set<string>();

  // text::locale::gender -> record key that owns the synthesized audio.
  // Pre-populated from previous runs so renamed/relocated ids copy from the
  // old local file instead of re-synthesizing.
  const ownerByCombo = new Map<string, string>();
  for (const rec of records.values()) {
    if (!rec.audioRef) {
      ownerByCombo.set(`${rec.text}::${rec.locale}::${rec.gender}`, rec.key);
    }
  }

  const recordKey = (e: ManifestEntry, gender: string) => `${e.key}__${e.locale}__${gender}`;

  interface Task {
    entry: ManifestEntry;
    gender: MediaGender;
    key: string;
    combo: string;
    hash: string;
    objectKey: string;
    owner: string;
  }

  // Build the task list up-front and reserve dedup slots synchronously, before
  // any synthesis starts. This is what fixes the dedup race.
  const tasks: Task[] = [];
  const ownerDone = new Map<string, () => void>();
  const ownerPromise = new Map<string, Promise<void>>();
  for (const entry of manifest) {
    if (opts.lang && entry.language !== opts.lang) continue;
    for (const gender of GENDERS) {
      const key = recordKey(entry, gender);
      const combo = `${entry.text}::${entry.locale}::${gender}`;
      const owner = ownerByCombo.get(combo) ?? key;
      if (!ownerByCombo.has(combo)) {
        ownerByCombo.set(combo, key);
        let resolve!: () => void;
        ownerPromise.set(combo, new Promise<void>((r) => (resolve = r)));
        ownerDone.set(combo, resolve);
      }
      tasks.push({
        entry,
        gender,
        key,
        combo,
        hash: contentHash(entry.text, entry.locale, gender),
        objectKey: audioObjectKey(entry, gender),
        owner,
      });
    }
  }

  let generated = 0;
  let copied = 0;
  let skipped = 0;
  let errors = 0;
  const newRecords: GenerateRecord[] = [];
  let lastCheckpoint = 0;

  const checkpoint = async (force = false) => {
    if (force || newRecords.length - lastCheckpoint >= checkpointEvery) {
      await saveRecords(newRecords);
      lastCheckpoint = newRecords.length;
    }
  };

  const synthWithRetry = async (task: Task): Promise<Buffer> => {
    try {
      return await synthesizeAudioWithRotation(cfg, task.entry.text, task.entry.locale as MediaLocale, task.gender);
    } catch (err) {
      if (isTransient(err)) {
        await sleep(RETRY_BACKOFF_MS);
        return synthesizeAudioWithRotation(cfg, task.entry.text, task.entry.locale as MediaLocale, task.gender);
      }
      throw err;
    }
  };

  const processTask = async (task: Task) => {
    const done = ownerDone.get(task.combo);
    try {
      const existing = records.get(task.key);

      // Fast path: local records say this entry is unchanged.
      if (existing && existing.hash === task.hash) {
        // Check filesystem first — no storage call needed.
        if (await localAudioExists(task.entry.key, task.entry.locale, task.gender)) {
          skipped++;
          newRecords.push(existing);
          return;
        }
        // File missing from storage — fall through to re-generate.
        if (storageKeys.has(task.objectKey)) {
          skipped++;
          newRecords.push(existing);
          return;
        }
      }

      // Unconditional R2 dedup — NOT gated on checkpoint state. Ephemeral
      // runners (GitHub Actions) start with no records file at all; without
      // this check a cold run would re-synthesize everything and silently
      // overwrite existing objects at their immutable-cached keys.
      if (storageKeys.has(task.objectKey)) {
        skipped++;
        newRecords.push({
          key: task.key,
          text: task.entry.text,
          locale: task.entry.locale,
          gender: task.gender,
          hash: task.hash,
          generatedAt: new Date().toISOString(),
          audioRef: existing?.audioRef ?? (task.owner !== task.key ? task.owner : undefined),
        });
        return;
      }
      if (opts.limit !== undefined && generated >= opts.limit) return;

      // Same text already synthesized under another key → copy that file.
      if (task.owner !== task.key) {
        try {
          // If the owner is a task in this run, wait for its synthesis to land
          // on disk before copying. Owners from previous runs already exist.
          await ownerPromise.get(task.combo);
          const src = join(OUTPUT_AUDIO_DIR, `${task.owner}.mp3`);
          const audio = await readFile(src);
          const localPath = join(OUTPUT_AUDIO_DIR, `${task.key}.mp3`);
          await writeFile(localPath, audio);
          if (client) {
            await uploadBuffer(cfg, client, task.objectKey, audio, "audio/mpeg");
          }
          newRecords.push({
            key: task.key,
            text: task.entry.text,
            locale: task.entry.locale,
            gender: task.gender,
            hash: task.hash,
            generatedAt: new Date().toISOString(),
            audioRef: task.owner,
          });
          copied++;
          await checkpoint();
          return;
        } catch {
          // source file missing — fall through to a real synthesis
        }
      }

      try {
        if (!opts.dryRun) {
          const audio = await synthWithRetry(task);
          const localPath = join(OUTPUT_AUDIO_DIR, `${task.key}.mp3`);
          await writeFile(localPath, audio);
          if (client) {
            await uploadBuffer(cfg, client, task.objectKey, audio, "audio/mpeg");
          }
        }
        newRecords.push({
          key: task.key,
          text: task.entry.text,
          locale: task.entry.locale,
          gender: task.gender,
          hash: task.hash,
          generatedAt: new Date().toISOString(),
        });
        generated++;
        await checkpoint();
      } catch (err) {
        errors++;
        console.error(`  ✗ ${task.key}: ${err instanceof Error ? err.message : err}`);
      }
    } finally {
      // Release any waiting copy tasks even on failure, so they can either
      // copy (if the file landed) or fall through and synthesize themselves.
      done?.();
    }
  };

  // Manual in-flight queue. Each worker pulls the next task, processes it, then
  // paces before pulling again — so the RATE_LIMIT sleep runs per worker instead
  // of serializing the whole batch.
  let next = 0;
  const worker = async () => {
    while (true) {
      if (opts.limit !== undefined && generated >= opts.limit) return;
      const task = tasks[next++];
      if (!task) return;
      const before = generated + copied;
      await processTask(task);
      // Pace only after work that did I/O (synth/copy). Pure skips never touch
      // the TTS service, so they don't need the throttle — this keeps
      // incremental runs (mostly skips) fast.
      if (!opts.dryRun && generated + copied > before) await sleep(RATE_LIMIT_MS);
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);

  await checkpoint(true);
  return { generated, copied, skipped, errors, total: manifest.length, upload };
}
