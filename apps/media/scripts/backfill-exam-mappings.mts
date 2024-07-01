import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Universal exam-mapping backfill for list-type content bundles.
 *
 * Adds an `examMappings[exam]` entry to items that carry a generic `level`
 * (1..N) but no mapping for the target exam. Used when content is authored
 * level-first (e.g. German A1–C1 vocab) and the exam ladder maps linearly.
 *
 * Idempotent: items that already have the exam key are left untouched.
 * Extend CONFIGS for new languages/exams — no per-language script needed.
 */
const ROOT = join(process.cwd(), "data", "json");

interface Config {
  lang: string;
  exam: string;
  /** level (from item.level) → exam band/label. */
  levelToBand: Record<number, string>;
  /** Which content dirs to scan. */
  groups: string[];
}

const CONFIGS: Config[] = [
  {
    lang: "de",
    exam: "goethe",
    levelToBand: { 1: "A1", 2: "A2", 3: "B1", 4: "B2", 5: "C1" },
    groups: ["vocabulary", "grammar", "readings", "conversations"],
  },
];

async function collectJsonFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [] as import("node:fs").Dirent[]);
  for (const e of entries) {
    const abs = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await collectJsonFiles(abs)));
    else if (e.name.endsWith(".json")) out.push(abs);
  }
  return out;
}

let totalAdded = 0;
let skippedNoLevel = 0;

for (const cfg of CONFIGS) {
  const dirs = cfg.groups.map((g) => join(ROOT, cfg.lang, g));
  for (const dir of dirs) {
    for (const file of await collectJsonFiles(dir)) {
      const items = JSON.parse(await readFile(file, "utf-8")) as Record<string, unknown>[];
      let changed = false;
      for (const item of items) {
        const mappings = (item.examMappings ?? {}) as Record<string, unknown>;
        if (cfg.exam in mappings) continue;
        const band = cfg.levelToBand[(item.level as number) ?? 0];
        if (!band) { skippedNoLevel++; continue; }
        mappings[cfg.exam] = band;
        item.examMappings = mappings;
        totalAdded++;
        changed = true;
      }
      if (changed) await writeFile(file, JSON.stringify(items, null, 2) + "\n", "utf-8");
    }
  }
  console.log(`✓ ${cfg.lang}/${cfg.exam}: ${cfg.groups.join(", ")}`);
}

console.log(`Done: ${totalAdded} items mapped, ${skippedNoLevel} skipped (no matching level).`);