import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadMediaConfig, storageConfigured } from "../src/lib/config";
import { createStorageClient, uploadBuffer } from "../src/lib/storage";
import {
  buildJsonBundles,
  buildLandingDemoBundle,
  publishBundles,
  writeLandingDemoStatic,
} from "./lib/content";
import { buildContentLevels, CONTENT_LEVELS_PATH } from "./lib/content-levels";

/**
 * Publish content JSON bundles from the local source of truth
 * (`apps/media/data/json`) to storage (R2/CDN) under the `data/` prefix.
 *
 * Bundles are content-hashed (immutable, long TTL) and referenced through a
 * version manifest `data/data-manifest.json`, so a new release uploads new
 * hashed bundles + a new manifest — no CDN purge required.
 *
 * The landing/demo bundle is additionally written as a static TS module
 * straight into `apps/web` (see `writeLandingDemoStatic`) — the landing
 * page imports it at build time, so its first paint never depends on
 * storage/CDN being reachable. This runs even when storage isn't
 * configured, so local/dev builds of `apps/web` always have fresh demo data.
 *
 * Env: see src/lib/config.ts (MEDIA_STORAGE_*).
 */

async function main() {
  const cfg = loadMediaConfig();

  // Static landing demo for apps/web — independent of storage config.
  const landingDemo = await buildLandingDemoBundle();
  await writeLandingDemoStatic(landingDemo);

  if (!storageConfigured(cfg)) {
    console.error(
      "Storage not configured. Set MEDIA_STORAGE_* (see .env.local / config.ts). Skipping CDN publish.",
    );
    process.exit(0);
  }

  // Content-levels whitelist: regenerate fresh here too (not only in
  // generate-manifest) so a publish never ships a stale whitelist just
  // because the manifest step was skipped. Long TTL (1 month): this file
  // only feeds internal contributor/reviewer form dropdowns and backend
  // review validation — students never see it and it changes rarely, so a
  // month-long CDN cache meaningfully cuts origin requests with no
  // student-facing impact.
  const levels = await buildContentLevels();
  const levelsBody = Buffer.from(JSON.stringify(levels, null, 2) + "\n");
  await import("node:fs/promises").then((fs) =>
    fs.writeFile(CONTENT_LEVELS_PATH, levelsBody, "utf-8"),
  );

  const client = createStorageClient(cfg);
  await uploadBuffer(
    cfg,
    client,
    "data/content-levels.json",
    levelsBody,
    "application/json",
    "public, max-age=2592000",
  );
  console.log(
    `✓ content-levels.json → data/content-levels.json (${(levelsBody.length / 1024).toFixed(1)} KB, ${Object.keys(levels).length} langs)`,
  );

  const bundles = await buildJsonBundles();
  await publishBundles(cfg, client, bundles);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
