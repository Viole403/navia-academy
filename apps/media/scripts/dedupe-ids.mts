import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Universal duplicate-id fixer for content JSON.
 *
 * Scans every `data/json/<lang>/<domain>/**.json` (all CONTENT_LANGS × all
 * list groups — not hardcoded to one language). When two different items share
 * the same `id` (authoring bug, e.g. de vocab `gehen` A1 and `aufgehen` B2
 * both keyed `de_gehen`), the later occurrence is renamed to a slug of its
 * `text`/`translation`, with a `-<n>` suffix if that slug is also taken.
 *
 * React grids key by `id`, so duplicates produce "two children with the same
 * key" errors once bundles are combined. This keeps id uniqueness invariant.
 *
 * Idempotent: no-ops when every id is already unique.
 *
 * Run: pnpm --filter @navia/media dedupe-ids
 */

const ROOT = join(process.cwd(), "data", "json");
const LANGS = ["zh", "de", "en", "ja"];
const GROUPS = ["vocabulary", "grammar", "readings", "conversations", "characters"];

const UMLAUT: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äöüß]/g, (ch) => UMLAUT[ch])
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

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

let totalRenamed = 0;

for (const lang of LANGS) {
  for (const group of GROUPS) {
    const dir = join(ROOT, lang, group);
    const files = await collectJsonFiles(dir);
    if (files.length === 0) continue;

    const seen = new Map<string, string>();
    let renamed = 0;

    for (const file of files) {
      const items = JSON.parse(await readFile(file, "utf-8")) as Record<string, unknown>[];
      let changed = false;
      for (const item of items) {
        if (!item.id) continue;
        const id = String(item.id);
        if (seen.has(id)) {
          const text = String(item.text ?? item.translation ?? "");
          let base = slug(text);
          if (!base) base = id;
          let next = `${id}_${base}`;
          while (seen.has(next)) next = `${id}_${base}_${++renamed}`;
          item.id = next;
          seen.set(next, next);
          renamed++;
          changed = true;
        } else {
          seen.set(id, id);
        }
      }
      if (changed) await writeFile(file, JSON.stringify(items, null, 2) + "\n", "utf-8");
    }

    if (renamed > 0) {
      totalRenamed += renamed;
      console.log(`✎ ${lang}/${group}: ${renamed} duplicate id(s) renamed`);
    }
  }
}

console.log(totalRenamed > 0 ? `Done: ${totalRenamed} items renamed.` : "No duplicates found — all ids unique.");