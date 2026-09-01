import { readFile } from "node:fs/promises";
import { join, dirname, isAbsolute } from "node:path";
import { JSON_DIR, CONTENT_LANGS, LIST_GROUPS, collectJsonFiles } from "./lib/content";

/**
 * Universal dedup check for content JSON (read-only).
 *
 * Scans every `data/json/<lang>/<group>/**.json` across all CONTENT_LANGS ×
 * LIST_GROUPS (vocabulary, grammar, readings, characters, conversations) and
 * reports:
 *   - DUP_ID  : same `id` in more than one file (or twice within one file)
 *               — bundles are combined per (lang, group), so this breaks
 *               React keying and the id-uniqueness invariant.
 *  - DUP_TEXT: same normalized `text` in more than one file/row within the
 *               same containing directory — authoring bug (a word already
 *               exists in a lower level under a new id). Per-directory scope
 *               means zh per-exam dirs (hsk/, tocfl/, ...) are checked
 *               independently: the same word legitimately appears across
 *               exams (e.g. HSK L1 vs TOCFL L2), but never twice within one.
 *               Langs with flat layouts (de/en/ja) stay whole-group. DUP_ID
 *               remains global — bundles combine per (lang, group).
 *   - NON_ASCII_ID / SPACE_ID: ids that violate the id convention
 *               (ASCII transliteration of the text, no spaces).
 *
 * Optionally pass a candidate JSON file (e.g. freshly authored vocab_c2 → json)
 * with --lang/--group so it is checked AGAINST the existing tree BEFORE it is
 * merged — prevents duplicate ids/texts from ever landing.
 *
 * Exit code: 0 = clean, 2 = duplicates/naming issues found.
 *
 * Usage:
 *   bun run --filter @navia/media check-dedup
 *   bun run --filter @navia/media check-dedup -- --lang de --group vocabulary \
 *       --candidate data/json/de/vocabulary/c2.json
 */

const UMLAUT: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };

function norm(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äöüß]/g, (ch) => UMLAUT[ch])
    .replace(/[\s\-„“”«»…?!.,:;'()]/g, "")
    .normalize("NFKC");
}

interface Row {
  file: string;
  id: string;
  text: string;
  norm: string;
  scope: string;
}

interface Report {
  dupIds: string[];
  dupTexts: string[];
  nonAsciiIds: string[];
  spaceIds: string[];
}

async function rowsFromJson(file: string): Promise<Row[]> {
  const parsed = JSON.parse(await readFile(file, "utf-8")) as unknown;
  const arr = Array.isArray(parsed) ? parsed : ((parsed as Record<string, unknown>).items as unknown[]);
  if (!Array.isArray(arr)) return [];
  const rows: Row[] = [];
  for (const item of arr as Record<string, unknown>[]) {
    if (!item || typeof item !== "object") continue;
    const id = String(item.id ?? "");
    const text = String(item.text ?? "");
    if (!id && !text) continue;
    rows.push({ file, id, text, norm: norm(text), scope: dirname(file) });
  }
  return rows;
}

function analyze(rows: Row[]): Report {
  const byId = new Map<string, string[]>();
  const byScopeNorm = new Map<string, string[]>();
  const nonAsciiIds: string[] = [];
  const spaceIds: string[] = [];
  for (const r of rows) {
    if (r.id) {
      byId.set(r.id, [...(byId.get(r.id) ?? []), r.file]);
      if (!/^[\x20-\x7E]+$/.test(r.id)) nonAsciiIds.push(r.id);
      if (/\s/.test(r.id)) spaceIds.push(r.id);
    }
    if (r.text) {
      const key = `${r.scope}\u0000${r.norm}`;
      byScopeNorm.set(key, [...(byScopeNorm.get(key) ?? []), `${r.file}#${r.id}`]);
    }
  }
  return {
    dupIds: [...byId].filter(([, v]) => v.length > 1).map(([id, files]) => `${id} (${files.join(", ")})`),
    dupTexts: [...byScopeNorm].filter(([, v]) => v.length > 1).map(([t, locs]) => `${t} (${locs.join(", ")})`),
    nonAsciiIds: [...new Set(nonAsciiIds)],
    spaceIds: [...new Set(spaceIds)],
  };
}

function args(): { lang?: string; group?: string; candidate?: string } {
  const argv = process.argv.slice(2);
  const get = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : undefined;
  };
  return { lang: get("lang"), group: get("group"), candidate: get("candidate") };
}

async function main() {
  const { lang: candLang, group: candGroup, candidate } = args();
  if (candidate && (!candLang || !candGroup || !CONTENT_LANGS.includes(candLang) || !LIST_GROUPS.includes(candGroup))) {
    console.error("--candidate requires --lang (zh|de|en|ja) and --group (vocabulary|grammar|readings|characters|conversations).");
    process.exit(1);
  }

  let issues = 0;
  let scanned = 0;

  for (const lang of CONTENT_LANGS) {
    for (const group of LIST_GROUPS) {
      const dir = join(JSON_DIR, lang, group);
      const files = await collectJsonFiles(dir);
      const candidateRows: Row[] = [];
      if (candidate && candLang === lang && candGroup === group) {
        candidateRows.push(...(await rowsFromJson(isAbsolute(candidate) ? candidate : join(process.cwd(), candidate))));
      }
      if (files.length === 0 && candidateRows.length === 0) continue;

      const all: string[] = [...files, ...(candidate ? [candidate] : [])];
      const rows: Row[] = [];
      for (const f of all) {
        const path = candidate && f === candidate && !isAbsolute(f) ? join(process.cwd(), candidate) : f;
        rows.push(...(await rowsFromJson(path)));
      }
      scanned += rows.length;

      const rep = analyze(rows);
      const label = `${lang}/${group}`;
      let dirty = false;
      for (const [tag, list] of [
        ["DUP_ID", rep.dupIds],
        ["DUP_TEXT", rep.dupTexts],
        ["NON_ASCII_ID", rep.nonAsciiIds],
        ["SPACE_ID", rep.spaceIds],
      ] as const) {
        if (list.length) {
          dirty = true;
          console.log(`${tag} ${label}:`);
          for (const line of list) console.log(`  - ${line}`);
        }
      }
      if (dirty) issues++;
    }
  }

  if (issues === 0) {
    console.log(`No duplicates found across ${scanned} items.`);
  } else {
    console.log(`Found issues in ${issues} (lang/group) bucket(s), ${scanned} items scanned.`);
  }
  process.exit(issues > 0 ? 2 : 0);
}

void main();
