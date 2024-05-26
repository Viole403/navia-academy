import { createHash } from "node:crypto";
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { S3Client } from "@aws-sdk/client-s3";
import type { MediaConfig } from "../../src/lib/config";
import { uploadBuffer, deleteKeys } from "../../src/lib/storage";

/**
 * Shared bundle-building + publishing core used by:
 *   - scripts/publish-data.ts    (JSON source: apps/media/data/json)
 *
 * A bundle is an immutable, content-hashed JSON object. Clients resolve logical
 * names through a TTL'd version manifest, so a release = new hashed URLs →
 * no CDN purge, cache forever on the read path.
 */

export const ROOT = join(__dirname, "..", "..");
export const JSON_DIR = join(ROOT, "data", "json");
export const DATA_PREFIX = "data";

/** Languages that have content under data/json/<code>/. */
export const CONTENT_LANGS = ["zh", "de", "en", "ja"];

/** List-type content groups (combined into a single array bundle). */
export const LIST_GROUPS = [
  "vocabulary",
  "grammar",
  "readings",
  "characters",
  "conversations",
];

/** App-level config bundles (published once, not per language). */
export const APP_BUNDLES = [
  "achievements",
  "exam-cards",
  "exam-definitions",
  "exam-display-names",
  "exam-abbreviations",
  "exam-types",
  "exam-badge-colors",
];

/** App bundles whose JSON is a standalone object shipped as-is (id='config'). */
export const APP_OBJECT_BUNDLES = new Set([
  "exam-definitions",
  "exam-display-names",
  "exam-abbreviations",
  "exam-badge-colors",
  "exam-types",
]);

export interface Bundle {
  name: string;
  content: string;
}

export interface Manifest {
  [bundle: string]: string;
}

export function hashOf(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

export async function collectJsonFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true }).catch(
    () => [] as import("node:fs").Dirent[],
  );
  for (const e of entries) {
    const abs = join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await collectJsonFiles(abs)));
    } else if (e.name.endsWith(".json")) {
      out.push(abs);
    }
  }
  return out;
}

/** Combined array for a language content group (vocabulary, grammar, …). */
export async function combineJsonGroup(
  lang: string,
  group: string,
  ...subs: string[]
): Promise<string> {
  const out: unknown[] = [];
  const files = await collectJsonFiles(join(JSON_DIR, lang, group, ...subs));
  for (const f of files) {
    const parsed = JSON.parse(await readFile(f, "utf-8")) as unknown[];
    out.push(...parsed);
  }
  return JSON.stringify(out);
}

/**
 * Deterministically sample `n` items from a content group, spread across the
 * source files (so preview vocab spans different levels/exams instead of the
 * first file's run). When fewer than 3 files exist (e.g. en/ja have one file),
 * falls back to the first `n` items in file order. Pure read — no extra cost.
 */
export async function sampleAcrossFiles(
  lang: string,
  group: string,
  n: number,
): Promise<unknown[]> {
  const files = await collectJsonFiles(join(JSON_DIR, lang, group));
  const arrays = await Promise.all(
    files.map(async (f) => JSON.parse(await readFile(f, "utf-8")) as unknown[]),
  );
  const out: unknown[] = [];
  if (arrays.length >= 3) {
    let i = 0;
    while (out.length < n && arrays.some((a) => i < a.length)) {
      for (const a of arrays) {
        if (out.length >= n) break;
        if (i < a.length) out.push(a[i]);
      }
      i++;
    }
  } else {
    for (const a of arrays) out.push(...a);
  }
  return out.slice(0, n);
}

/** Curriculum bundle = { course, levels, units, lessons } (single object). */
export async function buildCurriculumBundle(lang: string): Promise<string> {
  const base = join(JSON_DIR, lang, "curriculum");
  const read = async (name: string): Promise<unknown> =>
    JSON.parse(await readFile(join(base, name), "utf-8")) as unknown;
  return JSON.stringify({
    course: await read("course.json"),
    levels: await read("levels.json"),
    units: await read("units.json"),
    lessons: await read("lessons.json"),
  });
}

/** App-level config bundles from the JSON tree (published once, not per language). */
export async function appBundlesFromJson(): Promise<Bundle[]> {
  const files = await collectJsonFiles(JSON_DIR);
  const out: Bundle[] = [];
  for (const f of files) {
    const rel = f.replace(`${JSON_DIR}/`, "").replace(/\.json$/, "");
    // Skip content-language trees (zh/de/en/ja) — they publish via CONTENT_LANGS.
    if (CONTENT_LANGS.some((l) => rel.startsWith(`${l}/`))) continue;
    const raw = await readFile(f, "utf-8");
    // App configs use the `/index` suffix, same logical shape as group bundles
    // (e.g. `achievements` → `achievements/index`), matching the web data client.
    out.push({ name: `${rel}/index`, content: raw });
  }
  return out;
}

/**
 * Single tiny landing bundle: the whole marketing demo in one fetch.
 * Carries preview vocab per language, lesson-count stats, the exam config
 * (types/definitions/display names/badge colors) and the audio-manifest
 * entries for those preview words — so the landing page never pulls the
 * ~14 MB audio manifest or per-bundle exam configs.
 *
 * Also written to disk as a static module (see `writeLandingDemoStatic`)
 * so `apps/web` can import it at build time instead of fetching it from
 * the CDN at runtime — the landing page's first paint should never depend
 * on storage/CDN availability.
 */
const LANDING_PREVIEW_WORDS_PER_LANG = 3;

/**
 * Vocabulary source roots per exam type under `data/json`. The zh tree holds
 * both `hsk/` and `tocfl/` subfolders; the other languages have no per-exam
 * subfolder. Counting the real entries here (what eventually gets published
 * to R2) lets the landing show actual seeded word totals instead of the
 * curriculum targets in exam-definitions.
 */
const VOCAB_ROOTS: Record<string, string> = {
  hsk: "zh/vocabulary/hsk",
  tocfl: "zh/vocabulary/tocfl",
  goethe: "de/vocabulary",
  jlpt: "ja/vocabulary",
  toefl: "en/vocabulary",
};

async function countVocabWords(rootRel: string): Promise<number> {
  const dir = join(JSON_DIR, rootRel);
  let total = 0;
  async function walk(d: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(d, e.name);
      if (e.isDirectory()) {
        await walk(p);
      } else if (e.name.endsWith(".json")) {
        try {
          const data = JSON.parse(await readFile(p, "utf-8"));
          total += Array.isArray(data)
            ? data.length
            : Array.isArray((data as { words?: unknown[] }).words)
              ? (data as { words: unknown[] }).words.length
              : 0;
        } catch {
          // skip malformed file
        }
      }
    }
  }
  await walk(dir);
  return total;
}

export async function buildLandingDemoBundle(): Promise<Bundle[]> {
  const preview: Record<string, unknown[]> = {};
  const stats: Record<string, number> = {};
  let placementTotal = 0;
  const audioManifest = JSON.parse(
    await readFile(join(ROOT, "data", "audio", "audio-manifest.json"), "utf-8"),
  ) as { key: string; text: string; locale: string; audioPath?: string }[];
  const entryByKey = new Map(audioManifest.map((e) => [e.key, e]));
  const wantedAudio = new Set<string>(["char:c-ma3", "vocab:ren2", "vocab:ni3"]);
  for (const lang of CONTENT_LANGS) {
    const sample = (await sampleAcrossFiles(
      lang,
      "vocabulary",
      LANDING_PREVIEW_WORDS_PER_LANG,
    )) as {
      id: string;
      audio?: string;
    }[];
    preview[lang] = sample;
    for (const w of sample) wantedAudio.add(w.audio ?? `v:${w.id}`);
    const curriculum = JSON.parse(await buildCurriculumBundle(lang)) as {
      lessons: unknown[];
    };
    stats[lang] = curriculum.lessons.length;
    placementTotal += (JSON.parse(await readFile(join(JSON_DIR, lang, "placement.json"), "utf-8")) as unknown[]).length;
  }
  const audio = [...wantedAudio]
    .map((key) => entryByKey.get(key))
    .filter(
      (
        e,
      ): e is {
        key: string;
        text: string;
        locale: string;
        audioPath?: string;
      } => Boolean(e),
    )
    .map((e) => ({
      key: e.key,
      text: e.text,
      locale: e.locale,
      audioPath: e.audioPath,
    }));
  const readApp = async (name: string): Promise<unknown> =>
    JSON.parse(await readFile(join(JSON_DIR, `${name}.json`), "utf-8"));
  const examTypes = (await readApp("exam-types")) as string[];
  // Real seeded word totals per exam (see VOCAB_ROOTS) — the landing shows
  // these instead of the curriculum-target wordCountPerLevel sums.
  const wordTotals: Record<string, number> = {};
  for (const type of examTypes) {
    const root = VOCAB_ROOTS[type];
    wordTotals[type] = root ? await countVocabWords(root) : 0;
  }
  const demo = {
    preview,
    stats,
    placementTotal,
    exams: {
      types: examTypes,
      definitions: await readApp("exam-definitions"),
      displayNames: await readApp("exam-display-names"),
      abbreviations: await readApp("exam-abbreviations"),
      badgeColors: await readApp("exam-badge-colors"),
      wordTotals,
    },
    audio,
  };
  return [{ name: "landing/demo", content: JSON.stringify(demo) }];
}

/**
 * Path to the static landing-demo module inside `apps/web`. Assumes the
 * standard monorepo layout (`apps/media` next to `apps/web`) — adjust if
 * your layout differs.
 */
export const WEB_LANDING_DEMO_PATH = join(
  ROOT,
  "..",
  "web",
  "src",
  "lib",
  "landing-demo.generated.ts",
);

/**
 * Write the landing demo bundle as a static, typed TS module directly into
 * `apps/web`. This is the file the landing page imports at build time —
 * no CDN, no manifest lookup, no runtime retry loop for first paint.
 * Content is baked in at publish/build time and only changes on redeploy,
 * which is fine for marketing preview content.
 */
export async function writeLandingDemoStatic(bundles: Bundle[]): Promise<void> {
  const demoBundle = bundles.find((b) => b.name === "landing/demo");
  if (!demoBundle)
    throw new Error(
      "landing/demo bundle missing — run buildLandingDemoBundle first",
    );
  await mkdir(join(WEB_LANDING_DEMO_PATH, ".."), { recursive: true });
  const banner =
    "// AUTO-GENERATED by apps/media/scripts/publish-data.ts — do not edit by hand.\n" +
    "// Regenerate with `pnpm --filter media publish-data` (or the CI publish step).\n";
  const body = `${banner}import type { LandingDemo } from "@/lib/data-client";\n\nexport const landingDemo: LandingDemo = ${demoBundle.content} as unknown as LandingDemo;\n`;
  await writeFile(WEB_LANDING_DEMO_PATH, body, "utf-8");
  console.log(`✓ landing demo (static) → ${WEB_LANDING_DEMO_PATH}`);
}

/** Build the full bundle set from the JSON seed (no storage/DB required). */
export async function buildJsonBundles(): Promise<Bundle[]> {
  const bundles: Bundle[] = [];
  // Landing demo first — it is small and must be available before the large
  // per-language bundles finish publishing, so the SSR shell never hangs on it.
  bundles.push(...(await buildLandingDemoBundle()));
  for (const lang of CONTENT_LANGS) {
    for (const group of LIST_GROUPS) {
      bundles.push({
        name: `${lang}/${group}/index`,
        content: await combineJsonGroup(lang, group),
      });
      const subs = await readdir(join(JSON_DIR, lang, group), {
        withFileTypes: true,
      }).catch(() => [] as import("node:fs").Dirent[]);
      for (const sub of subs.filter((e) => e.isDirectory())) {
        // per-subdir splits (e.g. zh/vocabulary/{hsk,tocfl}) so consumers can
        // browse/load one exam system without pulling the merged bundle.
        bundles.push({
          name: `${lang}/${group}/${sub.name}/index`,
          content: await combineJsonGroup(lang, group, sub.name),
        });
      }
    }
    bundles.push({
      name: `${lang}/curriculum/index`,
      content: await buildCurriculumBundle(lang),
    });
    bundles.push({
      name: `${lang}/placement/index`,
      content: await readFile(join(JSON_DIR, lang, "placement.json"), "utf-8"),
    });
  }
  bundles.push({
    name: "audio/manifest",
    content: await readFile(
      join(ROOT, "data", "audio", "audio-manifest.json"),
      "utf-8",
    ),
  });
  bundles.push({
    name: "images/manifest",
    content: await readFile(
      join(ROOT, "data", "images", "images-manifest.json"),
      "utf-8",
    ),
  });
  bundles.push(...(await appBundlesFromJson()));
  return bundles;
}

/**
 * Upload bundles to storage as content-hashed objects and write the version
 * manifest. Only changed bundles get new URLs; identical content reuses the
 * same object (no CDN purge ever needed).
 */
export async function publishBundles(
  cfg: MediaConfig,
  client: S3Client,
  bundles: Bundle[],
  localOutDir = join(ROOT, ".output", "data"),
): Promise<Manifest> {
  const manifest: Manifest = {};

  const publish = async (name: string, content: string) => {
    const hash = hashOf(content);
    const parts = name.split("/");
    const dir = parts.length === 3 ? parts.slice(0, 2).join("/") : parts[0];
    const key = `${DATA_PREFIX}/${dir}/${hash}.json`;
    await uploadBuffer(
      cfg,
      client,
      key,
      Buffer.from(content),
      "application/json",
    );
    manifest[name] = `${dir}/${hash}.json`;
    console.log(
      `✓ ${name} → ${key} (${(content.length / 1024).toFixed(1)} KB)`,
    );
  };

  for (const b of bundles) {
    await publish(b.name, b.content);
  }

  const manifestKey = `${DATA_PREFIX}/data-manifest.json`;
  // Manifest is the "catalog" resolving every bundle URL student apps fetch
  // to study from. Edge TTL is 1 day: a content fix or newly-approved
  // contributor publish can take up to a day to become visible to students
  // (down from ~5 minutes) — a deliberate, confirmed tradeoff favoring
  // reduced origin load over near-real-time freshness. Bundles themselves
  // stay immutable/content-hashed.
  // Write atomically: upload to a temp key first, then to the final key, so an
  // interrupted publish never leaves the final manifest pointing at bundles
  // that have not been uploaded yet — clients keep using the previous valid one.
  const manifestBody = Buffer.from(JSON.stringify(manifest, null, 2));
  const tmpKey = `${DATA_PREFIX}/data-manifest.json.tmp`;
  await uploadBuffer(
    cfg,
    client,
    tmpKey,
    manifestBody,
    "application/json",
    "public, max-age=86400",
  );
  await uploadBuffer(
    cfg,
    client,
    manifestKey,
    manifestBody,
    "application/json",
    "public, max-age=86400",
  );
  await deleteKeys(cfg, client, [tmpKey]).catch(() => {});
  console.log(`✓ manifest → ${manifestKey}`);

  await mkdir(localOutDir, { recursive: true });
  await writeFile(
    join(localOutDir, "data-manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf-8",
  );
  console.log(`✓ manifest copy → ${join(localOutDir, "data-manifest.json")}`);

  return manifest;
}
