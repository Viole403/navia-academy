#!/usr/bin/env node
/**
 * Print the height/width ratio of every art asset, ready to paste into
 * `src/components/study/art.ts`.
 *
 * These ratios are load-bearing: each illustration is positioned against a card
 * corner with `right: 0` / `bottom: 0`, so what those offsets measure from is
 * the asset's own trimmed box. Re-measure after re-trimming any asset.
 *
 *   node scripts/measure-art-ratios.mjs
 */
import { readdir, readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ART_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "assets",
  "study-art"
)

async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(p)))
    else if (entry.name.endsWith(".png")) out.push(p)
  }
  return out
}

const files = (await walk(ART_DIR)).sort()
for (const file of files) {
  const b = await readFile(file)
  // PNG layout: 8-byte signature, then the IHDR chunk whose payload starts at
  // byte 16 with width and height as big-endian uint32.
  if (b.slice(1, 4).toString() !== "PNG") {
    console.log(`${file.replace(ART_DIR + "/", "")}: not a PNG`)
    continue
  }
  const w = b.readUInt32BE(16)
  const h = b.readUInt32BE(20)
  console.log(
    `${file.replace(ART_DIR + "/", "").padEnd(38)} ${w}x${h}  ${(h / w).toFixed(3)}`
  )
}
