/**
 * Validate generated images against their translation using a vision model.
 * Reads the image records produced by `generate-images`, sends each local
 * image + its concept to a vision provider, and reports images that do NOT
 * depict the concept.
 *
 * Vision keys come from the SAME pool as image generation (`image_api_keys`,
 * dashboard /keys) but under their own provider (`MEDIA_VISION_PROVIDER`,
 * default `gemini`) — round-robin rotation + per-key cooldown. Supported:
 * `gemini` (default, free vision) | `openai` | `cloudflare`.
 * Fallback: `GEMINI_API_KEY` / `MEDIA_IMAGE_API_KEY` env when DB has no key.
 *
 *   MEDIA_VISION_PROVIDER  — gemini (default) | openai | cloudflare
 *   MEDIA_VISION_OPENAI_MODEL / MEDIA_VISION_CF_MODEL / GEMINI_MODEL — model override
 *   npm run validate-images -- [--limit N] [--json out.json]
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { resolveMediaConfig } from "../src/lib/config";
import { checkImageWithRotation, visionProvider } from "../src/lib/vision";

const OUTPUT_IMAGE_DIR = join(import.meta.dirname ?? ".", "..", ".output", "images");
const RECORDS_PATH = join(OUTPUT_IMAGE_DIR, ".generate-image-records.json");
// Default report target — regenerate-images reads this same path by default,
// so the bare `validate-images` → `regenerate-images` pair works end to end.
const DEFAULT_JSON_OUT = join(OUTPUT_IMAGE_DIR, "vision-mismatches.json");

interface ImageRecord {
  hash: string;
  translation?: string;
  translationId?: string;
  language?: string;
  ext?: string;
  prompt?: string;
}

interface CheckResult {
  hash: string;
  translation: string;
  translationId?: string;
  match: boolean;
  reason: string;
}

function parseFlags(): { limit?: number; jsonOut: string } {
  const limitIdx = process.argv.indexOf("--limit");
  const jsonIdx = process.argv.indexOf("--json");
  return {
    limit: limitIdx > -1 ? Number(process.argv[limitIdx + 1]) : undefined,
    jsonOut: jsonIdx > -1 ? process.argv[jsonIdx + 1] : DEFAULT_JSON_OUT,
  };
}

async function loadRecords(): Promise<ImageRecord[]> {
  try {
    const raw = await readFile(RECORDS_PATH, "utf-8");
    return JSON.parse(raw) as ImageRecord[];
  } catch {
    return [];
  }
}

async function main() {
  const { limit, jsonOut } = parseFlags();
  const cfg = await resolveMediaConfig();
  const provider = await visionProvider();

  const records = await loadRecords();
  if (records.length === 0) {
    console.error("No records found at", RECORDS_PATH, "- run generate-images first.");
    process.exit(1);
  }

  // Resolve actual file extension from disk (record.ext may be empty for old rows).
  const files = new Map<string, string>();
  for (const f of await readdir(OUTPUT_IMAGE_DIR)) {
    if (f.startsWith(".")) continue;
    const m = /^([0-9a-f]{12})\.(png|jpe?g|webp)$/i.exec(f);
    if (m) files.set(m[1], join(OUTPUT_IMAGE_DIR, f));
  }

  const targets = records.filter((r) => files.has(r.hash));
  const slice = limit !== undefined ? targets.slice(0, limit) : targets;
  console.log(`Checking ${slice.length}/${targets.length} images with ${provider}...\n`);

  const results: CheckResult[] = [];
  const mismatches: CheckResult[] = [];
  for (let i = 0; i < slice.length; i++) {
    const r = slice[i];
    const concept = r.translation ?? r.translationId ?? r.hash;
    const label = [r.translationId, r.translation].filter(Boolean).join(" / ");
    process.stdout.write(`  [${i + 1}/${slice.length}] ${r.hash.slice(0, 8)} ${label} ... `);
    try {
      const path = files.get(r.hash)!;
      const image = await readFile(path);
      const mime = path.endsWith(".png") ? "image/png" : path.endsWith(".webp") ? "image/webp" : "image/jpeg";
      const verdict = await checkImageWithRotation(cfg, concept, image, mime);
      const res: CheckResult = {
        hash: r.hash,
        translation: concept,
        translationId: r.translationId,
        match: verdict.match,
        reason: verdict.reason,
      };
      results.push(res);
      if (res.match) {
        process.stdout.write("OK\n");
      } else {
        mismatches.push(res);
        process.stdout.write(`MISMATCH: ${res.reason}\n`);
      }
    } catch (err) {
      const res: CheckResult = {
        hash: r.hash,
        translation: concept,
        translationId: r.translationId,
        match: true,
        reason: `error: ${err instanceof Error ? err.message : err}`,
      };
      results.push(res);
      process.stdout.write(`ERROR: ${res.reason}\n`);
    }
    // Free tier: ~15 RPM; pace a bit to stay well under limits.
    if (i < slice.length - 1) await new Promise((res2) => setTimeout(res2, 2000));
  }

  console.log(`\n--- Summary: ${mismatches.length} mismatch${mismatches.length === 1 ? "" : "es"} / ${results.length} checked ---`);
  await mkdir(dirname(jsonOut), { recursive: true });
  await writeFile(jsonOut, JSON.stringify({ results, mismatches }, null, 2), "utf-8");
  console.log(`✓ report → ${jsonOut} (regenerate-images reads this by default)`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
