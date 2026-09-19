import { readFile, writeFile, mkdir, readdir } from "node:fs/promises"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { detectLocale } from "@navia/utils"
import {
  DIALOG_READINGS,
  hashGender,
  readingGender,
  speakerGender,
  type CastGender,
} from "../src/lib/voice-casting"
import { writeContentLevelsFile } from "./lib/content-levels"

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

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, "..")

const JSON_DIR = join(ROOT, "data", "json")
const OUTPUT_MANIFEST = join(ROOT, "data", "audio", "audio-manifest.json")

const LANGUAGES = ["zh", "de", "en", "ja"] as const
const CONTENT_DOMAINS = [
  "vocabulary",
  "grammar",
  "readings",
  "conversations",
  "characters",
] as const

/** Files never treated as content (demos, bundles, backups). */
const SKIP_FILE = /^(index|demo|\._)/

interface ManifestEntry {
  key: string
  text: string
  locale: string
  language: string
  examSource?: string
  audioPath?: string
  gender: CastGender
}

/** "Name：line" / "Name:line" → [name, line]; short prefix only (avoid enumerations). */
function splitDialogLine(text: string): [string, string] | undefined {
  const m = text.match(/^([^：:]{1,12})[：:]\s*(.+)$/)
  if (!m) return undefined
  return [m[1], m[2]]
}

// ─── Unified field extraction (canonical-first, legacy fallback) ────────

const getText = (o: Record<string, unknown>): string =>
  String(o.text ?? o.hanzi ?? o.char ?? "")

/** Resolve the exam that owns an entry from its `examMappings`. */
function resolveExamSource(
  mappings?: Record<string, unknown>
): string | undefined {
  if (!mappings) return undefined
  const order = ["tocfl", "hsk", "goethe", "jlpt", "toefl"] as const
  return order.find((exam) => mappings[exam]) as string | undefined
}

const EXAM_BY_FILE: Record<string, string> = {
  hsk: "hsk",
  tocfl: "tocfl",
  goethe: "goethe",
  jlpt: "jlpt",
  toefl: "toefl",
}

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
  const parts = file.split("/")
  const dir = parts[parts.length - 2]
  const name = parts[parts.length - 1].replace(/\.json$/, "")
  return EXAM_BY_FILE[dir] ?? EXAM_BY_FILE[name]
}

/** Recursively load every content JSON array under a directory (deterministic order). */
async function collectJsonArrays(
  dir: string
): Promise<{ items: Record<string, unknown>[]; file: string }[]> {
  const out: { items: Record<string, unknown>[]; file: string }[] = []
  const entries = (
    await readdir(dir, { withFileTypes: true }).catch(
      () => [] as import("node:fs").Dirent[]
    )
  ).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  for (const e of entries) {
    if (e.isDirectory()) {
      out.push(...(await collectJsonArrays(join(dir, e.name))))
    } else if (e.name.endsWith(".json") && !SKIP_FILE.test(e.name)) {
      const parsed = JSON.parse(
        await readFile(join(dir, e.name), "utf-8")
      ) as unknown
      if (Array.isArray(parsed))
        out.push({
          items: parsed as Record<string, unknown>[],
          file: join(dir, e.name),
        })
    }
  }
  return out
}

/** Audio entries for one content domain of one language. */
async function collectContentDomain(
  lang: string,
  domain: string
): Promise<ManifestEntry[]> {
  const entries: ManifestEntry[] = []
  const arrays = await collectJsonArrays(join(JSON_DIR, lang, domain))

  for (const { items, file } of arrays) {
    const fileExam = examForFile(file)
    for (const item of items) {
      const langHint = (item.language as string) ?? lang
      const src =
        fileExam ??
        resolveExamSource(
          item.examMappings as Record<string, unknown> | undefined
        )
      const audioPath = (v: string, key: string): string | undefined =>
        v && v !== key ? v : undefined

      if (domain === "vocabulary") {
        const text = getText(item)
        if (!text) continue
        const wordKey = `vocab:${item.id}`
        // Word voice: deterministic hash. Examples inherit it so a card
        // never switches voice mid-card (audit Q8).
        const wordGender = hashGender(wordKey)
        entries.push({
          key: wordKey,
          text,
          locale: detectLocale(text, src, langHint),
          language: lang,
          examSource: src,
          audioPath: audioPath(item.audio as string, wordKey),
          gender: wordGender,
        })
        if (lang === "zh") {
          const trad = String(item.textVariant ?? item.traditional ?? "")
          if (trad && trad !== text) {
            const tradKey = `vocab:${item.id}:trad`
            entries.push({
              key: tradKey,
              text: trad,
              locale: "zh-TW",
              language: lang,
              examSource: src,
              gender: hashGender(tradKey),
            })
          }
        }
        const examples = (item.examples as Record<string, unknown>[]) ?? []
        for (let i = 0; i < examples.length; i++) {
          const exText = getText(examples[i])
          if (!exText) continue
          const key = `vocab:${item.id}:ex${i}`
          entries.push({
            key,
            text: exText,
            locale: detectLocale(exText, src, langHint),
            language: lang,
            examSource: src,
            audioPath: audioPath(examples[i].audio as string, key),
            gender: wordGender,
          })
        }
      } else if (domain === "grammar") {
        const examples = (item.examples as Record<string, unknown>[]) ?? []
        for (let i = 0; i < examples.length; i++) {
          const exText = getText(examples[i])
          if (!exText) continue
          const key = `grammar:${item.id}:ex${i}`
          entries.push({
            key,
            text: exText,
            locale: detectLocale(exText, src, langHint),
            language: lang,
            examSource: src,
            audioPath: audioPath(examples[i].audio as string, key),
            gender: hashGender(key),
          })
        }
      } else if (domain === "readings") {
        const paragraphs = (item.paragraphs as Record<string, unknown>[]) ?? []
        const itemId = String(item.id ?? "")
        const isDialog = DIALOG_READINGS.has(itemId)
        for (let i = 0; i < paragraphs.length; i++) {
          const rawText = getText(paragraphs[i])
          if (!rawText) continue
          const key = `reading:${itemId}:p${i}`
          if (isDialog) {
            // Dialogue reading: one voice per speaker line (audit Q5).
            const split = splitDialogLine(rawText)
            if (split) {
              const [who, line] = split
              // First distinct speaker in this reading = male (order rule).
              const firstSeen = paragraphs
                .slice(0, i)
                .map((p) => splitDialogLine(getText(p))?.[0])
                .filter(Boolean) as string[]
              const firstSpoken = !firstSeen.length || firstSeen[0] === who
              entries.push({
                key,
                text: line,
                locale: detectLocale(line, src, langHint),
                language: lang,
                examSource: src,
                audioPath: audioPath(paragraphs[i].audio as string, key),
                gender: speakerGender(
                  `reading:${itemId}`,
                  who,
                  who,
                  firstSpoken
                ),
              })
              continue
            }
          }
          entries.push({
            key,
            text: rawText,
            locale: detectLocale(rawText, src, langHint),
            language: lang,
            examSource: src,
            audioPath: audioPath(paragraphs[i].audio as string, key),
            gender: readingGender(itemId),
          })
        }
      } else if (domain === "conversations") {
        const turns =
          (item.turns as Record<string, unknown>[]) ??
          (item.dialogue as Record<string, unknown>[]) ??
          []
        // Speaker order = first appearance in turns (NOT speakers[] order).
        const seenOrder: string[] = []
        for (const t of turns) {
          const s = String(t.speaker ?? "")
          if (s && !seenOrder.includes(s)) seenOrder.push(s)
        }
        const nameById = new Map<string, string>()
        for (const s of (item.speakers as Record<string, unknown>[]) ?? []) {
          nameById.set(String(s.id ?? ""), String(s.name ?? ""))
        }
        const convId = String(item.id ?? "")
        for (let i = 0; i < turns.length; i++) {
          const tText = getText(turns[i])
          if (!tText) continue
          const speakerId = String(turns[i].speaker ?? "")
          const key = `conv:${convId}:t${i}`
          entries.push({
            key,
            text: tText,
            locale: detectLocale(tText, src, langHint),
            language: lang,
            examSource: src,
            audioPath: audioPath(turns[i].audio as string, key),
            gender: speakerGender(
              lang === "zh" ? "zh" : convId,
              speakerId,
              nameById.get(speakerId),
              seenOrder[0] === speakerId
            ),
          })
        }
      } else if (domain === "characters") {
        const text = getText(item)
        if (!text) continue
        const key = `char:${item.id}`
        entries.push({
          key,
          text,
          locale: detectLocale(text, src, langHint),
          language: lang,
          examSource: src,
          audioPath: audioPath(item.audio as string, key),
          gender: hashGender(key),
        })
      }
    }
  }
  return entries
}

/** Placement audio (per-question; only array-style placements carry audioText). */
async function collectPlacement(lang: string): Promise<ManifestEntry[]> {
  const entries: ManifestEntry[] = []
  const raw = JSON.parse(
    await readFile(join(JSON_DIR, lang, "placement.json"), "utf-8").catch(
      () => "[]"
    )
  ) as unknown
  if (!Array.isArray(raw)) return entries // object-shaped placement (de/ja/en) has no per-question audio
  for (const item of raw as Record<string, unknown>[]) {
    const audioText = (item.audioText as string) ?? ""
    if (!audioText) continue
    const src = resolveExamSource(
      item.examMappings as Record<string, unknown> | undefined
    )
    const pKey = (item.audio as string) ?? `placement:${item.id}`
    entries.push({
      key: pKey,
      text: audioText,
      locale: detectLocale(audioText, src, (item.language as string) ?? lang),
      language: lang,
      examSource: src,
      gender: hashGender(pKey),
    })
  }
  return entries
}

/** Assessments (zh-only): exercises with `audioText`. */
async function collectAssessments(lang: string): Promise<ManifestEntry[]> {
  const entries: ManifestEntry[] = []
  for (const { items: exercises } of await collectJsonArrays(
    join(JSON_DIR, lang, "assessments")
  )) {
    for (const assessment of exercises) {
      for (const [i, ex] of (
        (assessment.exercises as Record<string, unknown>[]) ?? []
      ).entries()) {
        const audioText = ex.audioText as string
        if (!audioText) continue
        const aKey = `assessment:${assessment.id}:ex${i}`
        entries.push({
          key: aKey,
          text: audioText,
          locale: detectLocale(audioText, "hsk", lang),
          language: lang,
          examSource: "hsk",
          gender: hashGender(aKey),
        })
      }
    }
  }
  return entries
}

/** Curriculum audio: lessons.steps[].exercise.audioText. */
async function collectCurriculum(lang: string): Promise<ManifestEntry[]> {
  const entries: ManifestEntry[] = []
  const lessonsFiles = await collectJsonArrays(
    join(JSON_DIR, lang, "curriculum")
  )
  for (const { items: lessons } of lessonsFiles) {
    for (const lesson of lessons) {
      const steps = (lesson.steps as Record<string, unknown>[]) ?? []
      for (const step of steps) {
        const audioText =
          ((step.exercise as Record<string, unknown> | undefined)
            ?.audioText as string) ?? ""
        if (audioText) {
          const cKey = `curriculum:${lesson.id}:${step.id}`
          entries.push({
            key: cKey,
            text: audioText,
            locale: detectLocale(
              audioText,
              undefined,
              (lesson.language as string) ?? lang
            ),
            language: lang,
            gender: hashGender(cKey),
          })
        }
        // D2: dialogue steps were never in the manifest (played via on-demand
        // TTS). Include them as per-speaker entries, same rules as conv turns.
        if (step.type === "dialogue") {
          const lines = (step.dialogue as Record<string, unknown>[]) ?? []
          const seenOrder: string[] = []
          for (const ln of lines) {
            const s = String(ln.speaker ?? "")
            if (s && !seenOrder.includes(s)) seenOrder.push(s)
          }
          for (let i = 0; i < lines.length; i++) {
            const dText = getText(lines[i])
            if (!dText) continue
            const who = String(lines[i].speaker ?? "")
            const dKey = `curriculum:${lesson.id}:${step.id}:d${i}`
            entries.push({
              key: dKey,
              text: dText,
              locale: detectLocale(
                dText,
                undefined,
                (lesson.language as string) ?? lang
              ),
              language: lang,
              gender: speakerGender(
                "curriculum",
                who,
                who,
                seenOrder[0] === who
              ),
            })
          }
        }
      }
    }
  }
  return entries
}

const seen = new Set<string>()
function dedupe(entries: ManifestEntry[]): ManifestEntry[] {
  return entries.filter((e) => {
    const k = `${e.key}::${e.text}::${e.language}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

async function main() {
  const allEntries: ManifestEntry[] = []
  let grandTotal = 0

  for (const lang of LANGUAGES) {
    const entries: ManifestEntry[] = []
    for (const domain of CONTENT_DOMAINS) {
      entries.push(...(await collectContentDomain(lang, domain)))
    }
    entries.push(...(await collectPlacement(lang)))
    entries.push(...(await collectAssessments(lang)))
    entries.push(...(await collectCurriculum(lang)))

    const byDomain: Record<string, number> = {}
    for (const e of entries)
      byDomain[e.key.split(":")[0]] = (byDomain[e.key.split(":")[0]] ?? 0) + 1

    console.log(`\n=== Processing language: ${lang} ===`)
    console.log(
      `  ${Object.entries(byDomain)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" | ")}`
    )
    console.log(`  Total: ${entries.length}`)
    allEntries.push(...entries)
    grandTotal += entries.length
  }

  const deduped = dedupe(allEntries)
  await mkdir(dirname(OUTPUT_MANIFEST), { recursive: true })
  await writeFile(OUTPUT_MANIFEST, JSON.stringify(deduped, null, 2), "utf-8")

  console.log(
    `\n✓ Total manifest entries: ${deduped.length} (collected ${grandTotal})`
  )
  console.log(`✓ Written to: ${OUTPUT_MANIFEST}`)

  // Content-levels whitelist: scanned from the same tree, published to the
  // CDN by publish-data and fetched by apps/backend + apps/web.
  const levels = await writeContentLevelsFile()
  const langCount = Object.keys(levels).length
  const refCount = Object.values(levels).reduce(
    (n, domains) =>
      n + Object.values(domains).reduce((m, refs) => m + refs.length, 0),
    0
  )
  console.log(
    `✓ content-levels.json: ${langCount} langs, ${refCount} refs → data/content-levels.json`
  )
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
