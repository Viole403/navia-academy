import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { resolveMediaConfig, storageConfigured } from "./config";
import { OUTPUT_AUDIO_DIR, OUTPUT_IMAGE_DIR, loadManifest } from "./manifest";
import { generateAudioBatch } from "./runner-audio";
import { generateImageBatch } from "./runner-image";

export async function status() {
  const cfg = await resolveMediaConfig();
  const manifest = await loadManifest();

  const audioCount = await countFiles(OUTPUT_AUDIO_DIR);
  const imageCount = await countFiles(OUTPUT_IMAGE_DIR);

  return {
    manifestEntries: manifest.length,
    audioFiles: audioCount,
    imageFiles: imageCount,
    storage: {
      configured: storageConfigured(cfg),
      provider: cfg.storageProvider,
      bucket: cfg.bucket,
      endpoint: cfg.endpoint || "(default region endpoint)",
      publicUrl: cfg.publicUrl || "(bucket URL)",
    },
    ttsEngine: cfg.ttsEngine,
    imageProvider: cfg.imageProvider,
    byLocale: manifest.reduce<Record<string, number>>((acc, e) => {
      acc[e.locale] = (acc[e.locale] ?? 0) + 1;
      return acc;
    }, {}),
  };
}

async function countFiles(dir: string): Promise<number> {
  try {
    const files = await readdir(dir);
    let n = 0;
    for (const f of files) {
      const s = await stat(join(dir, f));
      if (s.isFile()) n++;
    }
    return n;
  } catch {
    return 0;
  }
}

export { generateAudioBatch, generateImageBatch };
