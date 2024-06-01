import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { detectLocale } from "@navia/utils";
import { writeContentLevelsFile } from "./lib/content-levels";

/**
 * Build `data/audio/audio-manifest.json` — the list of every text that needs
 * audio synthesis — from the unified JSON content tree.
 *
 * Canonical schema (all languages share it):
 *   - Vocabulary:   { id, language, text, romanization?, translation, pos,
 *                     level, examMappings?, examples: [{ text, romanization?,
 *                     translation?, audio? }], audio?, textVariant?, ... }
 *   - Grammar:      examples: [{ text, romanization?, translation?, audio? }]
 *   - Readings:     paragraphs: [{ text, romanization?, translation?, audio? }]
 *   - Conversations:turns: [{ speaker, text, romanization?, translation?, audio? }]
 *   - Characters:   { id, language, char, romanization?, ... }
 *   - Placement:    { id, language, audioText?, audio? } (per-question audio)
 *   - Assessments:  { id, exercises[].audioText }
 *   - Assessments:  exercises: [{ id, audioText? }]
 *   - Curriculum:   lessons.steps[]: [{ exercise?: { audioText? } }]
 *
 * Legacy zh aliases (`hanzi`, `pinyin`, `turns[].hanzi`, …) are read as
 * fallbacks so a partially-migrated tree still produces the same manifest.
 *
 * Adding a language = drop files under `data/json/<lang>/<domain>/` with the
 * canonical schema — nothing else to change here.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

const JSON_DIR = join(ROOT, "data", "json");
const OUTPUT_MANIFEST = join(ROOT, "data", "audio", "audio-manifest.json");

const LANGUAGES = ["zh", "de", "en", "ja"] as const;
const CONTENT_DOMAINS = ["vocabulary", "grammar", "readings", "conversations", "characters"] as const;

/** Files never treated as content (demos, bundles, backups). */
const SKIP_FILE = /^(index|demo|\._)/;

interface ManifestEntry {
  key: string;
  text: string;
  locale: string;
  language: string;
  examSource?: string;
  audioPath?: string;
}

// ─── Unified field extraction (canonical-first, legacy fallback) ────────

const getText = (o: Record<string, unknown>): string =>
  String(o.text ?? o.hanzi ?? o.char ?? "");

/** Resolve the exam that owns an entry from its `examMappings`. */
function resolveExamSource(mappings?: Record<string, unknown>): string | undefined {
  if (!mappings) return undefined;
  const order = [
    "tocfl", "hsk",
    "goethe",
    "jlpt",
    "toefl",
  ] as const;
  return order.find((exam) => mappings[exam]) as string | undefined;
}

const EXAM_BY_FILE: Record<string, string> = {
  hsk: "hsk", tocfl: "tocfl",
  goethe: "goethe",
  jlpt: "jlpt",
  toefl: "toefl",
};

/**
 * The exam (and thus voice locale) is decided by the FILE the entry lives in,
 * not by examMappings. Shared words (e.g. 我) that map to several exams keep
 * the locale of their primary curriculum (hsk/hsk1.json → zh-CN) instead of
 * being mislabelled zh-TW just because they also carry a tocfl mapping.
 *
 * zh content is organised as `<lang>/<group>/<exam>/<level>.json` (e.g.
 * `zh/vocabulary/hsk/hsk1.json`), so the parent directory is the exam. Other
 * languages use level-named flat files (`de/vocabulary/a1.json`) with no exam
 * dir — those fall back to the filename, then to `examMappings`.
 */
function examForFile(file: string): string | undefined {
  const parts = file.split("/");
  const dir = parts[parts.length - 2];
  const name = parts[parts.length - 1].replace(/\.json$/, "");
  return EXAM_BY_FILE[dir] ?? EXAM_BY_FILE[name];
}

/** Recursively load every content JSON array under a directory (deterministic order). */
async function collectJsonArrays(dir: string): Promise<{ items: Record<string, unknown>[]; file: string }[]> {
  const out: { items: Record<string, unknown>[]; file: string }[] = [];
  const entries = (await readdir(dir, { withFileTypes: true }).catch(() => [] as import("node:fs").Dirent[])).sort(
    (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
  );
  for (const e of entries) {
    if (e.isDirectory()) {
      out.push(...(await collectJsonArrays(join(dir, e.name))));
    } else if (e.name.endsWith(".json") && !SKIP_FILE.test(e.name)) {
      const parsed = JSON.parse(await readFile(join(dir, e.name), "utf-8")) as unknown;
      if (Array.isArray(parsed)) out.push({ items: parsed as Record<string, unknown>[], file: join(dir, e.name) });
    }
  }
  return out;
}

/** Audio entries for one content domain of one language. */
async function collectContentDomain(lang: string, domain: string): Promise<ManifestEntry[]> {
  const entries: ManifestEntry[] = [];
  const arrays = await collectJsonArrays(join(JSON_DIR, lang, domain));

  for (const { items, file } of arrays) {
    const fileExam = examForFile(file);
    for (const item of items) {
      const langHint = (item.language as string) ?? lang;
      const src = fileExam ?? resolveExamSource(item.examMappings as Record<string, unknown> | undefined);
      const audioPath = (v: string, key: string): string | undefined =>
        v && v !== key ? v : undefined;

      if (domain === "vocabulary") {
        const text = getText(item);
        if (!text) continue;
        entries.push({ key: `vocab:${item.id}`, text, locale: detectLocale(text, src, langHint), language: lang, examSource: src, audioPath: audioPath(item.audio as string, `vocab:${item.id}`) });
        if (lang === "zh") {
          const trad = String(item.textVariant ?? item.traditional ?? "");
          if (trad && trad !== text) {
            entries.push({ key: `vocab:${item.id}:trad`, text: trad, locale: "zh-TW", language: lang, examSource: src });
          }
        }
        const examples = (item.examples as Record<string, unknown>[]) ?? [];
        for (let i = 0; i < examples.length; i++) {
          const exText = getText(examples[i]);
          if (!exText) continue;
          const key = `vocab:${item.id}:ex${i}`;
          entries.push({ key, text: exText, locale: detectLocale(exText, src, langHint), language: lang, examSource: src, audioPath: audioPath(examples[i].audio as string, key) });
        }
      } else if (domain === "grammar") {
        const examples = (item.examples as Record<string, unknown>[]) ?? [];
        for (let i = 0; i < examples.length; i++) {
          const exText = getText(examples[i]);
          if (!exText) continue;
          const key = `grammar:${item.id}:ex${i}`;
          entries.push({ key, text: exText, locale: detectLocale(exText, src, langHint), language: lang, examSource: src, audioPath: audioPath(examples[i].audio as string, key) });
        }
      } else if (domain === "readings") {
        const paragraphs = (item.paragraphs as Record<string, unknown>[]) ?? [];
        for (let i = 0; i < paragraphs.length; i++) {
          const pText = getText(paragraphs[i]);
          if (!pText) continue;
          const key = `reading:${item.id}:p${i}`;
          entries.push({ key, text: pText, locale: detectLocale(pText, src, langHint), language: lang, examSource: src, audioPath: audioPath(paragraphs[i].audio as string, key) });
        }
      } else if (domain === "conversations") {
        const turns = (item.turns as Record<string, unknown>[]) ?? (item.dialogue as Record<string, unknown>[]) ?? [];
        for (let i = 0; i < turns.length; i++) {
          const tText = getText(turns[i]);
          if (!tText) continue;
          const key = `conv:${item.id}:t${i}`;
          entries.push({ key, text: tText, locale: detectLocale(tText, src, langHint), language: lang, examSource: src, audioPath: audioPath(turns[i].audio as string, key) });
        }
      } else if (domain === "characters") {
        const text = getText(item);
        if (!text) continue;
        entries.push({ key: `char:${item.id}`, text, locale: detectLocale(text, src, langHint), language: lang, examSource: src, audioPath: audioPath(item.audio as string, `char:${item.id}`) });
      }
    }
  }
  return entries;
}

/** Placement audio (per-question; only array-style placements carry audioText). */
async function collectPlacement(lang: string): Promise<ManifestEntry[]> {
  const entries: ManifestEntry[] = [];
  const raw = JSON.parse(await readFile(join(JSON_DIR, lang, "placement.json"), "utf-8").catch(() => "[]")) as unknown;
  if (!Array.isArray(raw)) return entries; // object-shaped placement (de/ja/en) has no per-question audio
  for (const item of raw as Record<string, unknown>[]) {
    const audioText = (item.audioText as string) ?? "";
    if (!audioText) continue;
    const src = resolveExamSource(item.examMappings as Record<string, unknown> | undefined);
    entries.push({
      key: (item.audio as string) ?? `placement:${item.id}`,
      text: audioText,
      locale: detectLocale(audioText, src, (item.language as string) ?? lang),
      language: lang,
      examSource: src,
    });
  }
  return entries;
}

/** Assessments (zh-only): exercises with `audioText`. */
async function collectAssessments(lang: string): Promise<ManifestEntry[]> {
  const entries: ManifestEntry[] = [];
  for (const { items: exercises } of await collectJsonArrays(join(JSON_DIR, lang, "assessments"))) {
    for (const assessment of exercises) {
      for (const [i, ex] of (assessment.exercises as Record<string, unknown>[] ?? []).entries()) {
        const audioText = ex.audioText as string;
        if (!audioText) continue;
        entries.push({
          key: `assessment:${assessment.id}:ex${i}`,
          text: audioText,
          locale: detectLocale(audioText, "hsk", lang),
          language: lang,
          examSource: "hsk",
        });
      }
    }
  }
  return entries;
}

/** Curriculum audio: lessons.steps[].exercise.audioText. */
async function collectCurriculum(lang: string): Promise<ManifestEntry[]> {
  const entries: ManifestEntry[] = [];
  const lessonsFiles = await collectJsonArrays(join(JSON_DIR, lang, "curriculum"));
  for (const { items: lessons } of lessonsFiles) {
    for (const lesson of lessons) {
      const steps = (lesson.steps as Record<string, unknown>[]) ?? [];
      for (const step of steps) {
        const audioText = ((step.exercise as Record<string, unknown> | undefined)?.audioText as string) ?? "";
        if (!audioText) continue;
        entries.push({
          key: `curriculum:${lesson.id}:${step.id}`,
          text: audioText,
          locale: detectLocale(audioText, undefined, (lesson.language as string) ?? lang),
          language: lang,
        });
      }
    }
  }
  return entries;
}

const seen = new Set<string>();
function dedupe(entries: ManifestEntry[]): ManifestEntry[] {
  return entries.filter((e) => {
    const k = `${e.key}::${e.text}::${e.language}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

async function main() {
  const allEntries: ManifestEntry[] = [];
  let grandTotal = 0;

  for (const lang of LANGUAGES) {
    const entries: ManifestEntry[] = [];
    for (const domain of CONTENT_DOMAINS) {
      entries.push(...(await collectContentDomain(lang, domain)));
    }
    entries.push(...(await collectPlacement(lang)));
    entries.push(...(await collectAssessments(lang)));
    entries.push(...(await collectCurriculum(lang)));

    const byDomain: Record<string, number> = {};
    for (const e of entries) byDomain[e.key.split(":")[0]] = (byDomain[e.key.split(":")[0]] ?? 0) + 1;

    console.log(`\n=== Processing language: ${lang} ===`);
    console.log(`  ${Object.entries(byDomain).map(([k, v]) => `${k}: ${v}`).join(" | ")}`);
    console.log(`  Total: ${entries.length}`);
    allEntries.push(...entries);
    grandTotal += entries.length;
  }

  const deduped = dedupe(allEntries);
  await mkdir(dirname(OUTPUT_MANIFEST), { recursive: true });
  await writeFile(OUTPUT_MANIFEST, JSON.stringify(deduped, null, 2), "utf-8");

  console.log(`\n✓ Total manifest entries: ${deduped.length} (collected ${grandTotal})`);
  console.log(`✓ Written to: ${OUTPUT_MANIFEST}`);

  // Content-levels whitelist: scanned from the same tree, published to the
  // CDN by publish-data and fetched by apps/backend + apps/web.
  const levels = await writeContentLevelsFile();
  const langCount = Object.keys(levels).length;
  const refCount = Object.values(levels).reduce(
    (n, domains) => n + Object.values(domains).reduce((m, refs) => m + refs.length, 0),
    0,
  );
  console.log(`✓ content-levels.json: ${langCount} langs, ${refCount} refs → data/content-levels.json`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
