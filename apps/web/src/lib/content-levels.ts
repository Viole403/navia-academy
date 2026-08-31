/**
 * Content-levels whitelist — fetched from the CDN (`data/content-levels.json`,
 * auto-generated + published by apps/media from its data/json tree). No
 * hardcoded level lists anymore: adding a selectable level is a placeholder
 * file in apps/media + a publish — zero web code changes.
 *
 * Consumers are client components, so Next.js's server-side
 * `{ next: { revalidate } }` fetch caching does not apply here. Freshness is
 * governed by the module singleton (one fetch per full page load) plus the
 * CDN object's Cache-Control (max-age=2592000 = 1 month, set by publish-data)
 * for repeat loads within a session.
 */

import { useEffect, useState } from "react"

export type ContentLevels = Record<string, Record<string, string[]>>

const BASE = (process.env.NEXT_PUBLIC_DATA_CDN_URL ?? "").replace(/\/+$/, "")
const LEVELS_URL = `${BASE}/data/content-levels.json`

let cache: ContentLevels | null = null
let inflight: Promise<ContentLevels> | null = null

/** Fetch (once per page load) and cache the published whitelist. */
export function loadContentLevels(): Promise<ContentLevels> {
  if (cache) return Promise.resolve(cache)
  inflight ??= fetch(LEVELS_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json() as Promise<ContentLevels>
    })
    .then((levels) => {
      cache = levels
      return levels
    })
    .catch((err) => {
      inflight = null
      throw err
    })
  return inflight
}

/**
 * Sync accessor over whatever has loaded so far (empty until the fetch
 * resolves). Kept with the same signature as before; React call sites should
 * prefer useAllowedRefs so they re-render once data arrives.
 */
export function refsFor(lang: string, domain: string): string[] {
  return cache?.[lang]?.[domain] ?? []
}

/** React hook: the whitelist map (empty object until loaded). */
export function useAllowedRefs(): ContentLevels {
  const [levels, setLevels] = useState<ContentLevels | null>(cache)
  useEffect(() => {
    let on = true
    loadContentLevels()
      .then((l) => {
        if (on) setLevels(l)
      })
      .catch(() => {})
    return () => {
      on = false
    }
  }, [])
  return levels ?? {}
}
