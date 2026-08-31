/**
 * Locale-aware content gloss. Content items carry a canonical English
 * `translation` (plus optional `translation_en`) and an optional Indonesian
 * `translation_id`. Indonesian surface shows `translation_id` when present,
 * otherwise falls back to English (null-safe). UI default locale = Indonesian.
 */
export function translationFor<
  T extends {
    translation?: string
    translation_id?: string
    translation_en?: string
  },
>(item: T | null | undefined, locale: string): string {
  if (!item) return ""
  if (locale === "id") {
    const id = item.translation_id
    if (typeof id === "string" && id.trim()) return id
  }
  return item.translation_en ?? item.translation ?? ""
}

/**
 * Locale-aware prose field. Content explanation fields (simpleExplanation,
 * usage, summary, context, title, …) may carry an Indonesian variant as
 * `${field}_id` and an explicit English one as `${field}_en`. Resolves by UI
 * locale with null-safe fallback to the canonical English value.
 */
export function locText<T>(
  obj: T | null | undefined,
  field: string | string[],
  locale: string
): string {
  if (!obj) return ""
  const v = obj as unknown as Record<string, unknown>
  const fields = Array.isArray(field) ? field : [field]
  for (const f of fields) {
    const id = v[`${f}_id`]
    if (locale === "id" && typeof id === "string" && id.trim()) return id
  }
  for (const f of fields) {
    const en = v[`${f}_en`]
    if (typeof en === "string" && en.trim()) return en
  }
  for (const f of fields) {
    const base = v[f]
    if (typeof base === "string" && base.trim()) return base
  }
  return ""
}

/** Locale-aware string array (e.g. `commonMistakes` with `_id`/`_en` variants). */
export function locArray<T>(
  obj: T | null | undefined,
  field: string,
  locale: string
): string[] {
  if (!obj) return []
  const v = obj as unknown as Record<string, unknown>
  const pick = (val: unknown): string[] =>
    Array.isArray(val)
      ? (val as string[]).filter((s) => typeof s === "string")
      : []
  if (locale === "id") {
    const id = pick(v[`${field}_id`])
    if (id.length) return id
  }
  const en = pick(v[`${field}_en`])
  if (en.length) return en
  return pick(v[field])
}
