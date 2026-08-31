/**
 * ANKI (.apkg) importer.
 *
 * A .apkg file is a ZIP containing a SQLite database (`collection.anki2`)
 * plus a `media` JSON map of attachment filenames. Notes live in the `notes`
 * table; each note's `fields` is a tab-separated string. This module parses
 * them into a normalized shape so an updater can merge them into the central
 * JSON data (e.g. HSK/HSKK decks).
 *
 * Because decks use different field layouts, each source in
 * `data/anki-sources.json` declares a field mapping (which index holds hanzi,
 * pinyin, translation, …) via {@link AnkiFieldMap}.
 *
 * Both deps (`adm-zip`, `better-sqlite3`) are loaded lazily so the Next.js
 * dashboard build on Vercel never executes native/zip code. The importer is
 * intended to run via the CLI (`npm run import-anki`) or GitHub Actions.
 */

export interface AnkiNote {
  id: number
  deck: string
  fields: string[]
  tags: string[]
  raw: string
}

export interface AnkiDeck {
  name: string
  notes: AnkiNote[]
}

export interface AnkiFieldMap {
  /** Index of the field holding the hanzi (required). */
  hanzi: number
  pinyin?: number
  translation?: number
  zhuyin?: number
  /** Extra fields to keep, keyed by a stable name. */
  extras?: Record<string, number>
}

export interface AnkiSource {
  /** Stable id used by `import-anki --source <id>`. */
  id: string
  name: string
  /** Optional: download the .apkg from this URL. */
  url?: string
  /** Optional: local .apkg path (relative to `apps/media`). */
  file?: string
  /** Optional: only import notes whose deck name contains this. */
  deckMatch?: string
  /** Where merged content should go: vocabulary | characters | grammar. */
  target?: "vocabulary" | "characters" | "grammar"
  fields: AnkiFieldMap
}

export interface NormalizedNote {
  hanzi: string
  pinyin?: string
  translation?: string
  zhuyin?: string
  extras: Record<string, string>
  tags: string[]
}

/** Map a raw note's tab-separated fields into a normalized shape using the source's field map. */
export function normalizeNote(
  note: AnkiNote,
  map: AnkiFieldMap
): NormalizedNote | null {
  const at = (i: number | undefined): string | undefined => {
    if (i === undefined || i < 0) return undefined
    const v = note.fields[i]?.trim()
    return v || undefined
  }
  const hanzi = at(map.hanzi)
  if (!hanzi) return null
  const extras: Record<string, string> = {}
  for (const [k, i] of Object.entries(map.extras ?? {})) {
    const v = at(i)
    if (v) extras[k] = v
  }
  return {
    hanzi,
    pinyin: at(map.pinyin),
    translation: at(map.translation),
    zhuyin: at(map.zhuyin),
    extras,
    tags: note.tags,
  }
}

export async function parseApkg(buffer: Buffer): Promise<AnkiDeck[]> {
  const [{ default: AdmZip }, Database] = await Promise.all([
    import("adm-zip"),
    import("better-sqlite3").then((m) => m.default),
  ])

  const zip = new AdmZip(buffer)
  const entry = zip.getEntry("collection.anki2")
  if (!entry) throw new Error("collection.anki2 not found in .apkg")
  const db = new Database(entry.getData() as unknown as string)
  try {
    const decksRaw = db.prepare("SELECT id, name FROM decks").all() as {
      id: number
      name: string
    }[]
    const deckById = new Map(decksRaw.map((d) => [d.id, d.name]))

    const rows = db
      .prepare("SELECT id, mid, did, flds, tags FROM notes ORDER BY id")
      .all() as {
      id: number
      mid: number
      did: number
      flds: string
      tags: string
    }[]

    const byDeck = new Map<number, AnkiNote[]>()
    for (const row of rows) {
      const note: AnkiNote = {
        id: row.id,
        deck: deckById.get(row.did) ?? `deck-${row.did}`,
        fields: row.flds.split("\x1f"),
        tags: (row.tags ?? "").split(" ").filter(Boolean),
        raw: row.flds,
      }
      if (!byDeck.has(row.did)) byDeck.set(row.did, [])
      byDeck.get(row.did)!.push(note)
    }

    return [...byDeck.entries()].map(([did, notes]) => ({
      name: deckById.get(did) ?? `deck-${did}`,
      notes,
    }))
  } finally {
    db.close()
  }
}
