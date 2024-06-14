/**
 * Targeted re-generation of images flagged as MISMATCH by `validate-images`.
 *
 * Reads the JSON report written by `validate-images --json`, then re-generates
 * each mismatched image. The prompt is built from the canonical content item
 * via `buildImagePrompt` — which honors a contributor-authored `imagePrompt`
 * field in the content JSON (data-driven, no code changes for tricky abstract
 * concepts) and falls back to a POS-aware default. If no content item is
 * found for a hash, the original record prompt is kept.
 *
 * Overwrites local file + storage object, then updates the image records +
 * manifest. Hash is content-based (translation), so URLs stay stable — no CDN
 * purge needed.
 *
 *   MEDIA_IMAGE_PROVIDER must be a working provider (e.g. gemini, cloudflare).
 *   npm run regenerate-images -- [--json path-to-check-report.json] [--limit N]
 */
import { mkdir, readFile, writeFile, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { resolveMediaConfig, storageConfigured } from "../src/lib/config";
import { buildImagePrompt, closeDeepaiBrowser } from "../src/lib/image";
import { compressImage } from "../src/lib/image-compress";
import { generateImageWithRotation } from "../src/lib/image-keys";
import { collectVocabItems, conceptKey } from "../src/lib/runner-image";
import { DATA_DIR, OUTPUT_IMAGE_DIR } from "../src/lib/manifest";
import { createStorageClient, listKeys, uploadBuffer, deleteKeys } from "../src/lib/storage";

const RECORDS_PATH = join(OUTPUT_IMAGE_DIR, ".generate-image-records.json");
const IMAGES_MANIFEST_PATH = join(DATA_DIR, "images", "images-manifest.json");

interface CheckReport {
  mismatches: { hash: string; translation: string; translationId?: string; reason: string }[];
}

interface ImageRecord {
  hash: string;
  prompt: string;
  translation: string;
  translationId?: string;
  language: string;
  generatedAt: string;
  ext?: string;
}

function detectImageFormat(buf: Buffer): { ext: string; mime: string } {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { ext: "png", mime: "image/png" };
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") {
    return { ext: "webp", mime: "image/webp" };
  }
  return { ext: "png", mime: "image/png" };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseFlags(): { json: string; limit?: number } {
  const jsonIdx = process.argv.indexOf("--json");
  const limitIdx = process.argv.indexOf("--limit");
  return {
    // Same default validate-images writes to — bare validate → regenerate works.
    json: jsonIdx > -1 ? process.argv[jsonIdx + 1] : join(OUTPUT_IMAGE_DIR, "vision-mismatches.json"),
    limit: limitIdx > -1 ? Number(process.argv[limitIdx + 1]) : undefined,
  };
}

async function main() {
  const { json, limit } = parseFlags();
  const cfg = await resolveMediaConfig();
  const upload = storageConfigured(cfg);
  const client = upload ? createStorageClient(cfg) : null;

  const report = JSON.parse(await readFile(json, "utf-8")) as CheckReport;
  const records = JSON.parse(await readFile(RECORDS_PATH, "utf-8")) as ImageRecord[];
  const byHash = new Map(records.map((r) => [r.hash, r]));
  const targets = report.mismatches.slice(0, limit);
  if (targets.length === 0) {
    console.log("No mismatches to regenerate.");
    return;
  }

  // Build the canonical prompt per concept from the content JSON. The content
  // item (with optional `imagePrompt` + POS frame) is the source of truth;
  // records only carry the last prompt for reuse fallback.
  const items = await collectVocabItems();
  const byConcept = new Map(items.map((it) => [conceptKey(it), it]));

  const storageKeys = client ? new Set(await listKeys(cfg, client, "images/")) : new Set<string>();
  const updated: ImageRecord[] = [];
  let ok = 0;
  let failed = 0;

  for (const m of targets) {
    const rec = byHash.get(m.hash);
    if (!rec) {
      console.log(`  ✗ ${m.hash.slice(0, 8)}: no record`);
      failed++;
      continue;
    }
    const concept = conceptKey(rec);
    const item = byConcept.get(concept);
    const prompt = item ? buildImagePrompt(item) : rec.prompt;
    console.log(`  [${m.hash.slice(0, 8)}] ${m.translation} (${m.translationId ?? "-"})`);
    console.log(`    prompt: ${prompt}`);
    try {
      const image = await generateImageWithRotation(cfg, prompt);
      // Layer 2: universal post-compress → WebP 512 (displayed at ~192px).
      const compressed = await compressImage(image);
      const { ext, mime } = compressed ?? detectImageFormat(image);
      const toStore = compressed?.buf ?? image;
      // Remove any previously stored object for this hash, then upload the new one.
      if (client) {
        for (const k of storageKeys) {
          if (k.startsWith(`images/${m.hash}.`)) {
            await deleteKeys(cfg, client, [k]);
            storageKeys.delete(k);
          }
        }
        await uploadBuffer(cfg, client, `images/${m.hash}.${ext}`, toStore, mime);
        storageKeys.add(`images/${m.hash}.${ext}`);
      }
      await mkdir(OUTPUT_IMAGE_DIR, { recursive: true });
      await writeFile(join(OUTPUT_IMAGE_DIR, `${m.hash}.${ext}`), toStore);
      // Clean up old-extension local files for the same hash.
      const oldExt = rec.ext && rec.ext !== ext ? rec.ext : "";
      if (oldExt) {
        try {
          await stat(join(OUTPUT_IMAGE_DIR, `${m.hash}.${oldExt}`));
          await unlink(join(OUTPUT_IMAGE_DIR, `${m.hash}.${oldExt}`));
        } catch {
          // ignore
        }
      }
      rec.prompt = prompt;
      rec.ext = ext;
      rec.generatedAt = new Date().toISOString();
      updated.push(rec);
      ok++;
      console.log(`    ✓ regenerated (${ext})`);
    } catch (err) {
      failed++;
      console.error(`    ✗ ${err instanceof Error ? err.message : err}`);
    }
    await sleep(cfg.imageRateLimitMs);
  }

  if (updated.length) {
    await writeFile(RECORDS_PATH, JSON.stringify(records, null, 2), "utf-8");
    // Rewrite manifest from records (same dedup-by-translation logic as runner).
    const seen = new Set<string>();
    const manifest: { hash: string; ext: string; translation: string; language: string }[] = [];
    for (const r of records) {
      if (!r.ext) continue;
      const tkey = r.translation.toLowerCase().trim();
      if (seen.has(tkey)) continue;
      seen.add(tkey);
      manifest.push({ hash: r.hash, ext: r.ext, translation: r.translation, language: r.language });
    }
    await mkdir(join(DATA_DIR, "images"), { recursive: true });
    await writeFile(IMAGES_MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");
  }

  await closeDeepaiBrowser();
  console.log(`\nDone! Regenerated: ${ok}, Failed: ${failed} | upload: ${upload ? "yes" : "no"}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
