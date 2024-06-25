/**
 * Generate a markdown validation report for generated images — one row per
 * unique image with its native word(s), translation(s), language, prompt and
 * vision-check status, so images can be eyeballed manually.
 *
 *   npm run image-report [--out path.md] [--validation check.json]
 *
 * Reads `.output/images/.generate-image-records.json` and joins vocab items
 * from data/json to attach the native word (hanzi/kana/...) to each image.
 * Image refs are written relative to the report location (default: next to
 * the images, so `./<hash>.webp` resolves in any markdown viewer).
 * `--validation` accepts the JSON from `validate-images --json out.json` to
 * add ✅/❌ vision results per image.
 */
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { createHash } from "node:crypto";
import { collectVocabItems, type VocabEntry } from "../src/lib/runner-image";
import { OUTPUT_IMAGE_DIR } from "../src/lib/manifest";

interface ImageRecord {
  hash: string;
  prompt: string;
  translation: string;
  translationId?: string;
  language: string;
  generatedAt: string;
  ext?: string;
}

interface CheckResult {
  hash: string;
  match: boolean;
  reason: string;
}

interface Row {
  hash: string;
  ext?: string;
  words: string[];
  translations: string[];
  languages: string[];
  pos: string[];
  prompt: string;
  vision?: CheckResult;
  missing: boolean;
}

const RECORDS_PATH = join(OUTPUT_IMAGE_DIR, ".generate-image-records.json");
const LANG_ORDER = ["zh", "de", "en", "ja"] as const;

const contentHash = (t: string) =>
  createHash("md5").update(t.toLowerCase().trim()).digest("hex").slice(0, 12);

function parseFlags(): { out?: string; validation?: string } {
  const outIdx = process.argv.indexOf("--out");
  const valIdx = process.argv.indexOf("--validation");
  return {
    out: outIdx > -1 ? process.argv[outIdx + 1] : undefined,
    validation: valIdx > -1 ? process.argv[valIdx + 1] : undefined,
  };
}

async function loadRecords(): Promise<ImageRecord[]> {
  return JSON.parse(await readFile(RECORDS_PATH, "utf-8")) as ImageRecord[];
}

function langRank(l: string): number {
  const i = LANG_ORDER.indexOf(l as (typeof LANG_ORDER)[number]);
  return i === -1 ? LANG_ORDER.length : i;
}

function esc(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function itemFor(rec: ImageRecord, byTrans: Map<string, VocabEntry>, byId: Map<string, VocabEntry>): VocabEntry | undefined {
  if (rec.translationId) {
    const id = byId.get(`${rec.language}::${rec.translationId.toLowerCase().trim()}`);
    if (id) return id;
  }
  return rec.translation ? byTrans.get(`${rec.language}::${rec.translation.toLowerCase().trim()}`) : undefined;
}

async function main() {
  const { out, validation } = parseFlags();
  const records = await loadRecords();
  const items = await collectVocabItems();

  const byTrans = new Map<string, VocabEntry>();
  const byId = new Map<string, VocabEntry>();
  for (const i of items) {
    byTrans.set(`${i.language}::${i.translation.toLowerCase().trim()}`, i);
    if (i.translationId) byId.set(`${i.language}::${i.translationId.toLowerCase().trim()}`, i);
  }

  const byHash = new Map<string, Row>();
  for (const rec of records) {
    if (!rec.ext) continue;
    let row = byHash.get(rec.hash);
    if (!row) {
      row = { hash: rec.hash, ext: rec.ext, words: [], translations: [], languages: [], pos: [], prompt: rec.prompt, missing: false };
      byHash.set(rec.hash, row);
    }
    const it = itemFor(rec, byTrans, byId);
    const word = it?.word ?? rec.translation;
    if (word && !row.words.includes(word)) row.words.push(word);
    row.translations.push(`${rec.translation}${rec.translationId ? ` (${rec.translationId})` : ""}`);
    if (!row.languages.includes(rec.language)) row.languages.push(rec.language);
    if (it?.pos && !row.pos.includes(it.pos)) row.pos.push(it.pos);
    if (rec.prompt && !row.prompt) row.prompt = rec.prompt;
  }

  const vision = new Map<string, CheckResult>();
  if (validation) {
    for (const c of JSON.parse(await readFile(validation, "utf-8")) as CheckResult[]) {
      if (!vision.has(c.hash)) vision.set(c.hash, c);
    }
  }
  for (const row of byHash.values()) {
    if (!row.ext) continue;
    try {
      await stat(join(OUTPUT_IMAGE_DIR, `${row.hash}.${row.ext}`));
    } catch {
      row.missing = true;
    }
  }

  const rows = [...byHash.values()].filter((r) => !r.missing);
  rows.sort(
    (a, b) =>
      langRank(a.languages[0] ?? "") - langRank(b.languages[0] ?? "") ||
      (a.translations[0] ?? "").localeCompare(b.translations[0] ?? ""),
  );

  const outPath = out ?? join(OUTPUT_IMAGE_DIR, "image-report.md");
  const outRel = (row: Row) => (row.ext ? relative(dirname(outPath), join(OUTPUT_IMAGE_DIR, `${row.hash}.${row.ext}`)) : "");

  const langCounts = new Map<string, number>();
  for (const r of records) langCounts.set(r.language, (langCounts.get(r.language) ?? 0) + 1);

  const lines: string[] = [];
  lines.push("# Image Validation Report");
  lines.push("");
  lines.push(`- Generated: ${new Date().toISOString()}`);
  lines.push(`- Images: ${rows.length}/${byHash.size} on disk (records: ${records.length})`);
  lines.push(`- Languages: ${[...langCounts.entries()].map(([l, n]) => `${l}(${n})`).join(", ")}`);
  lines.push(`- Vision check: ${vision.size ? "yes" : "none — run `validate-images --json` and pass via --validation"}`);
  lines.push("");
  lines.push("| # | Image | Word | Translation | Lang | Pos | Prompt | Vision |");
  lines.push("|---|-------|------|-------------|------|-----|--------|--------|");
  rows.forEach((row, i) => {
    const it = vision.get(row.hash);
    const place = outRel(row);
    const img = `<img src="${esc(place)}" width="96" alt="${esc(row.words[0] ?? row.hash)}"/>`;
    const vis = it ? (it.match ? "✅" : `❌ ${esc(it.reason)}`) : "—";
    lines.push(
      [
        i + 1,
        img,
        esc(row.words.join(", ")),
        esc(row.translations.join(" / ")),
        esc(row.languages.join(",")),
        esc(row.pos.join(",") || "—"),
        esc(row.prompt.length > 140 ? row.prompt.slice(0, 140) + "…" : row.prompt),
        vis,
      ]
        .join(" | "),
    );
  });
  lines.push("");
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, lines.join("\n"), "utf-8");
  console.log(`Report written: ${outPath} (${rows.length} images)`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});