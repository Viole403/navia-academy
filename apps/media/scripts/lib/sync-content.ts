/**
 * Content export bridge core: fetch published content_items from the Go API
 * (`GET /api/v1/content/export`, shared CONTENT_EXPORT_TOKEN bearer) and merge
 * them into data/json so the existing generate-manifest → publish-data → CDN
 * pipeline picks contributor content up.
 *
 * STRICTLY ONE-WAY: apps/backend → data/json. The two apps intentionally use
 * SEPARATE database projects; this module talks HTTP to the backend's public
 * API and holds NO backend-side database credential.
 *
 * Merge semantics per target file data/json/<lang>/<domain>/<ref||"contributor">.json:
 *   - Export payloads are already data/json-shaped entries (the backend's
 *     validatePayload normalizes language/id + required fields on write).
 *   - Replace-in-place by entry id — DB wins on conflict (a published row has
 *     passed human review); every conflict is logged loudly.
 *   - New ids append at the end, sorted by (pos, id) ascending.
 *   - Ids present in the file but ABSENT from the export are never touched,
 *     so hand-maintained seed content coexists safely.
 *
 * KNOWN v1 GAP: an item synced here and later rejected/unpublished upstream
 * simply stops being returned by the export — its merged JSON entry is NOT
 * removed. A future --prune mode (diff each file's ids against a full export)
 * would close this gap; deliberately not built yet.
 *
 * Idempotency: correctness comes solely from the idempotent replace-by-id
 * merge — re-running always converges to identical files. The watermark
 * (.output/sync-state.json) is a reporting aid only, never load-bearing.
 */

import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { loadMediaConfig, storageConfigured } from "../../src/lib/config"
import { createStorageClient } from "../../src/lib/storage"
import {
  CONTENT_LANGS,
  JSON_DIR,
  LIST_GROUPS,
  ROOT,
  buildJsonBundles,
  buildLandingDemoBundle,
  publishBundles,
  writeLandingDemoStatic,
} from "./content"

const PAGE_LIMIT = 500
const HEALTH_TIMEOUT_MS = 1500
const WATERMARK_PATH = join(ROOT, ".output", "sync-state.json")

export interface SyncOptions {
  /** After merging, chain into generate-manifest/publish-data equivalents. */
  publish?: boolean
  /** Dry-run: fetch, validate, report — write nothing. */
  checkOnly?: boolean
  /** Optional passthrough filters for the export call. */
  lang?: string
  domain?: string
}

export interface SyncStats {
  filesTouched: number
  added: number
  updated: number
  unchanged: number
  conflicts: number
  totalPublished: number
}

interface ExportRow {
  id: string
  lang: string
  domain: string
  ref?: string
  pos?: number
  payload: unknown
  updated_at: string
}

interface ExportEnvelope {
  success: boolean
  data?: ExportRow[]
  meta?: { count?: number; total_published?: number; generated_at?: string }
  error?: { code?: string; message?: string }
}

function apiBaseUrl(): string {
  return (process.env.CONTENT_API_BASE_URL ?? "http://localhost:8080").replace(
    /\/+$/,
    ""
  )
}

function relPath(absPath: string): string {
  return absPath.slice(JSON_DIR.length + 1)
}

function fatal(msg: string): never {
  console.error(`FATAL: ${msg}`)
  process.exit(1)
}

function shortHash(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 8)
}

/** Step 1 — the API MUST be up; unreachable is the failure case here. */
export async function preflightApi(): Promise<void> {
  const url = `${apiBaseUrl()}/api/v1/health`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  } catch (err) {
    console.error(
      [
        "",
        `FATAL: apps/backend is not reachable at ${url} (${err instanceof Error ? err.message : err}).`,
        "The sync bridge needs the API up — start it first:",
        "  cd apps/backend && make dev",
        "No files were touched.",
        "",
      ].join("\n")
    )
    process.exit(1)
  } finally {
    clearTimeout(timer)
  }
}

/** Step 2 — page through the export until a short page ends the stream. */
export async function fetchPublishedRows(
  opts: { lang?: string; domain?: string } = {}
): Promise<{ rows: ExportRow[]; totalPublished: number }> {
  const token = process.env.CONTENT_EXPORT_TOKEN ?? ""
  if (!token) {
    fatal(
      "CONTENT_EXPORT_TOKEN not set (see .env.example — must match apps/backend/.env)."
    )
  }

  const base = apiBaseUrl()
  const rows: ExportRow[] = []
  let totalPublished = -1
  let offset = 0

  for (;;) {
    const params = new URLSearchParams({
      limit: String(PAGE_LIMIT),
      offset: String(offset),
    })
    if (opts.lang) params.set("lang", opts.lang)
    if (opts.domain) params.set("domain", opts.domain)

    const res = await fetch(`${base}/api/v1/content/export?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      fatal(`export request failed: HTTP ${res.status} ${body.slice(0, 300)}`)
    }
    const body = (await res.json()) as ExportEnvelope
    if (!body.success || !Array.isArray(body.data)) {
      fatal(
        `unexpected export envelope (success=${String(body.success)}, error=${body.error?.code ?? "none"})`
      )
    }
    if (typeof body.meta?.total_published === "number") {
      totalPublished = body.meta.total_published
    }
    rows.push(...body.data)
    if (body.data.length < PAGE_LIMIT) break
    offset += PAGE_LIMIT
  }

  return { rows, totalPublished }
}

/** Step 3 — validate every row BEFORE anything is written. Any bad row aborts. */
export function validateRows(rows: ExportRow[]): void {
  for (const row of rows) {
    const where = `${row.lang}/${row.domain}/${row.id}`
    if (!CONTENT_LANGS.includes(row.lang)) {
      fatal(`row ${where}: lang "${row.lang}" is not a known content language`)
    }
    if (!LIST_GROUPS.includes(row.domain)) {
      fatal(`row ${where}: domain "${row.domain}" is not a list-group domain`)
    }
    if (
      typeof row.payload !== "object" ||
      row.payload === null ||
      Array.isArray(row.payload)
    ) {
      fatal(`row ${where}: payload must be a JSON object`)
    }
    const pid = (row.payload as { id?: unknown }).id
    if (pid !== row.id) {
      fatal(`row ${where}: payload.id (${String(pid)}) does not match row id`)
    }
  }
}

interface FilePlan {
  absPath: string
  existed: boolean
  added: number
  updated: number
  unchanged: number
  conflicts: number
  /** Serialized replacement content — null when the file needs no change. */
  nextContent: string | null
}

function groupRowsByFile(rows: ExportRow[]): Map<string, ExportRow[]> {
  const groups = new Map<string, ExportRow[]>()
  for (const row of rows) {
    const ref =
      row.ref && row.ref.trim() !== ""
        ? row.ref.replace(/\.json$/, "")
        : "contributor"
    const absPath = join(JSON_DIR, row.lang, row.domain, `${ref}.json`)
    const list = groups.get(absPath) ?? []
    list.push(row)
    groups.set(absPath, list)
  }
  return groups
}

/** Steps 4-5 — compute the merged result for one file without writing. */
async function buildFilePlan(
  absPath: string,
  rows: ExportRow[]
): Promise<FilePlan> {
  let existed = true
  let current: unknown[]
  try {
    current = JSON.parse(await readFile(absPath, "utf-8"))
  } catch {
    current = []
    existed = false
  }
  if (!Array.isArray(current)) {
    throw new Error(
      `${relPath(absPath)} exists but is not a JSON array — refusing to merge. Fix it manually.`
    )
  }

  const indexById = new Map<string, number>()
  current.forEach((entry, i) => {
    const id = (entry as { id?: unknown } | null)?.id
    if (typeof id === "string") indexById.set(id, i)
  })

  const sorted = [...rows].sort(
    (a, b) => (a.pos ?? 0) - (b.pos ?? 0) || a.id.localeCompare(b.id)
  )

  let added = 0
  let updated = 0
  let unchanged = 0
  let conflicts = 0
  const appends: unknown[] = []

  for (const row of sorted) {
    const payloadStr = JSON.stringify(row.payload)
    const idx = indexById.get(row.id)
    if (idx === undefined) {
      appends.push(row.payload)
      added++
      continue
    }
    const existingStr = JSON.stringify(current[idx])
    if (existingStr === payloadStr) {
      unchanged++
      continue
    }
    // Conflict: same ID edited directly in the file AND published in the DB.
    // Policy: DB wins — a published row passed human review.
    console.log(
      `  ⚠ conflict ${relPath(absPath)} · ${row.id}: ${shortHash(existingStr)} → ${shortHash(payloadStr)} (DB wins)`
    )
    current[idx] = row.payload
    updated++
    conflicts++
  }

  const changed = added > 0 || updated > 0
  return {
    absPath,
    existed,
    added,
    updated,
    unchanged,
    conflicts,
    nextContent: changed
      ? JSON.stringify([...current, ...appends], null, 2) + "\n"
      : null,
  }
}

/** Steps 7-8 — reporting watermark (never load-bearing) + optional publish. */
async function writeWatermark(
  stats: SyncStats,
  lastSyncedAt: string | null
): Promise<void> {
  await mkdir(dirname(WATERMARK_PATH), { recursive: true })
  await writeFile(
    WATERMARK_PATH,
    JSON.stringify({ lastSyncedAt, stats }, null, 2) + "\n",
    "utf-8"
  )
}

/** Identical to scripts/publish-data.ts main() — imported, not duplicated. */
export async function publishData(): Promise<void> {
  const cfg = loadMediaConfig()

  const landingDemo = await buildLandingDemoBundle()
  await writeLandingDemoStatic(landingDemo)

  if (!storageConfigured(cfg)) {
    console.error(
      "Storage not configured. Set MEDIA_STORAGE_* (see .env.local / config.ts). Skipping CDN publish."
    )
    process.exit(0)
  }

  const client = createStorageClient(cfg)
  const bundles = await buildJsonBundles()
  await publishBundles(cfg, client, bundles)
}

export async function runSync(opts: SyncOptions): Promise<SyncStats> {
  await preflightApi()

  const { rows, totalPublished } = await fetchPublishedRows(opts)
  const scope =
    opts.lang || opts.domain
      ? ` (filters: ${[opts.lang, opts.domain].filter(Boolean).join("/")})`
      : ""
  console.log(
    `✓ fetched ${rows.length} published row(s)${scope}, total published: ${totalPublished}`
  )

  validateRows(rows)

  // Compute ALL file plans before touching disk — any corruption or bad row
  // aborts before the first write.
  const plans: FilePlan[] = []
  for (const [absPath, groupRows] of groupRowsByFile(rows)) {
    plans.push(await buildFilePlan(absPath, groupRows))
  }

  const stats: SyncStats = plans.reduce(
    (acc, p) => ({
      filesTouched: acc.filesTouched + (p.nextContent !== null ? 1 : 0),
      added: acc.added + p.added,
      updated: acc.updated + p.updated,
      unchanged: acc.unchanged + p.unchanged,
      conflicts: acc.conflicts + p.conflicts,
      totalPublished,
    }),
    {
      filesTouched: 0,
      added: 0,
      updated: 0,
      unchanged: 0,
      conflicts: 0,
      totalPublished,
    }
  )

  console.log(
    `✓ ${plans.length} file(s) · +added ${stats.added} · ~updated ${stats.updated} · =unchanged ${stats.unchanged}` +
      (stats.conflicts ? ` · ⚠ conflicts ${stats.conflicts}` : "")
  )
  for (const p of plans) {
    if (p.nextContent === null) continue
    console.log(
      `  ${p.existed ? "~" : "+"} ${relPath(p.absPath)} (+${p.added} ~${p.updated})`
    )
  }

  if (opts.checkOnly) {
    console.log("check-only: no files were written.")
    return stats
  }

  for (const p of plans) {
    if (p.nextContent === null) continue
    await mkdir(dirname(p.absPath), { recursive: true })
    await writeFile(p.absPath, p.nextContent, "utf-8")
    console.log(`✓ wrote ${relPath(p.absPath)}`)
  }

  const lastSyncedAt = rows.reduce<string | null>(
    (max, r) => (!max || r.updated_at > max ? r.updated_at : max),
    null
  )
  await writeWatermark(stats, lastSyncedAt)

  if (opts.publish) {
    await publishData()
  } else if (stats.filesTouched > 0) {
    console.log(
      "\nNext: run `pnpm publish-data` to release to the CDN (or re-run with --publish)."
    )
  }

  return stats
}
