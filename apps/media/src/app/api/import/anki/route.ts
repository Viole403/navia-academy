import { NextRequest } from "next/server"
import { parseApkg, normalizeNote, type AnkiFieldMap } from "@/lib/anki"

export const maxDuration = 60
export const runtime = "nodejs"

/**
 * Accept a `.apkg` upload and return a preview of its decks. Because decks use
 * different field layouts, pass `fields` (e.g. {hanzi:0,pinyin:1,translation:2})
 * to see normalized notes; the merge itself runs via the CLI / GitHub Actions.
 */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const file = form.get("file")
    if (!(file instanceof File)) {
      return Response.json(
        { error: "multipart field 'file' (.apkg) is required" },
        { status: 400 }
      )
    }
    const fieldsRaw = form.get("fields")
    const fieldMap: AnkiFieldMap | null =
      typeof fieldsRaw === "string" && fieldsRaw
        ? (JSON.parse(fieldsRaw) as AnkiFieldMap)
        : { hanzi: 0 }

    const buffer = Buffer.from(await file.arrayBuffer())
    const decks = await parseApkg(buffer)
    const notes = decks.flatMap((d) => d.notes)
    const normalized = notes
      .map((n) => normalizeNote(n, fieldMap))
      .filter((n): n is NonNullable<typeof n> => !!n)

    return Response.json({
      decks: decks.map((d) => ({ name: d.name, notes: d.notes.length })),
      total: notes.length,
      normalized: normalized.length,
      fieldMap,
      sample: normalized.slice(0, 5),
      hint: "Untuk merge ke dataset: `pnpm --filter @navia/media import-anki -- path/deck.apkg --fields hanzi=0,pinyin=1,translation=2 --dump out.json`",
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "anki import failed" },
      { status: 500 }
    )
  }
}
