import { readFile } from "node:fs/promises"
import { join } from "node:path"
import type { AnkiSource } from "@/lib/anki"

const SOURCES_PATH = join(process.cwd(), "data", "anki-sources.json")

export async function GET() {
  try {
    const raw = await readFile(SOURCES_PATH, "utf-8")
    const sources = JSON.parse(raw) as AnkiSource[]
    return Response.json({
      configPath: "apps/media/data/anki-sources.json",
      sources: sources.map((s) => ({
        id: s.id,
        name: s.name,
        url: s.url || "",
        file: s.file || "",
        target: s.target ?? "?",
        fields: s.fields,
      })),
    })
  } catch (err) {
    return Response.json(
      {
        error: err instanceof Error ? err.message : "cannot read anki sources",
      },
      { status: 500 }
    )
  }
}
