"use client"

import { useCallback, useEffect, useState } from "react"
import { useAllowedRefs } from "@/lib/content-levels"
import { content } from "@/lib/api-client"
import {
  Button,
  Badge,
  Spinner,
  Modal,
  Textarea,
  Select,
} from "@/components/ui"
import { Check, X, RefreshCw, Eye } from "lucide-react"

interface ContentRow {
  lang: string
  domain: string
  ref: string
  id: string
  payload: unknown
  status: string
  created_by: string | null
  created_at: string
  updated_at: string
  review_note?: string | null
}

const DOMAINS = [
  "vocabulary",
  "grammar",
  "readings",
  "conversations",
  "characters",
]

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function summary(p: unknown): string {
  if (!isObj(p)) return JSON.stringify(p)
  return String(
    p.text ??
      p.hanzi ??
      p.char ??
      p.translation ??
      p.title ??
      JSON.stringify(p).slice(0, 60)
  )
}

export default function AdminContentPage() {
  const [rows, setRows] = useState<ContentRow[]>([])
  const levels = useAllowedRefs()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState("review")
  const [domain, setDomain] = useState("")
  const [error, setError] = useState("")
  const [reviewing, setReviewing] = useState<ContentRow | null>(null)
  const [note, setNote] = useState("")
  const [refChoice, setRefChoice] = useState("")
  const [deciding, setDeciding] = useState(false)

  const fetchRows = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const q = new URLSearchParams({ status, limit: "200" })
      if (domain) q.set("domain", domain)
      const rows = await content.list(q)
      setRows(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed")
    } finally {
      setLoading(false)
    }
  }, [status, domain])

  useEffect(() => {
    const id = setTimeout(fetchRows, 0)
    return () => clearTimeout(id)
  }, [fetchRows])

  const openReview = (row: ContentRow) => {
    setReviewing(row)
    setRefChoice(row.ref ?? "")
    setNote("")
  }

  const decide = async (row: ContentRow, next: "published" | "rejected") => {
    setDeciding(true)
    try {
      await content.review(row.lang, row.domain, row.id, {
        status: next,
        review_note: note.trim() || undefined,
        ref: next === "published" ? refChoice || undefined : undefined,
      })
      setReviewing(null)
      setNote("")
      setRefChoice("")
      fetchRows()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed")
    } finally {
      setDeciding(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            Content Review
          </h1>
          <p className="text-sm text-ink-soft">
            Approve or reject submitted items. Published items go to the CDN on
            the next release.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRows}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          {["review", "draft", "published", "rejected"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select value={domain} onChange={(e) => setDomain(e.target.value)}>
          <option value="">All domains</option>
          {DOMAINS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
        <Badge tone="neutral">{rows.length} items</Badge>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-10 text-center text-ink-soft">
          No items in this view.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sunken text-left text-xs font-medium tracking-wide text-ink-faint uppercase">
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Lang</th>
                <th className="px-4 py-3">Domain</th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Updated</th>
                <th className="w-48 px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr
                  key={`${r.lang}/${r.domain}/${r.id}`}
                  className="hover:bg-sunken/50"
                >
                  <td className="px-4 py-3 font-medium text-ink">
                    {summary(r.payload)}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{r.lang}</td>
                  <td className="px-4 py-3 text-ink-soft">{r.domain}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-faint">
                    {r.id}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-faint">
                    {new Date(r.updated_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => openReview(r)}
                        className="cursor-pointer rounded p-1.5 text-ink-faint hover:bg-hover hover:text-ink"
                        title="Review"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openReview(r)}
                        className="cursor-pointer rounded p-1.5 text-ink-faint hover:bg-emerald-500/10 hover:text-emerald-600"
                        title="Approve (assign level first)"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => decide(r, "rejected")}
                        className="cursor-pointer rounded p-1.5 text-ink-faint hover:bg-danger/10 hover:text-danger"
                        title="Reject"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!reviewing}
        onClose={() => setReviewing(null)}
        title={`Review: ${reviewing?.id ?? ""}`}
      >
        <div className="space-y-4">
          <pre className="max-h-64 overflow-auto rounded-lg border border-line bg-sunken p-3 text-xs whitespace-pre-wrap text-ink">
            {JSON.stringify(reviewing?.payload, null, 2)}
          </pre>
          {reviewing && (
            <div>
              <label className="block text-sm font-medium text-ink-soft">
                Assign level (required to publish)
                {reviewing.ref ? " — contributor suggested one" : ""}
              </label>
              <Select
                value={refChoice}
                onChange={(e) => setRefChoice(e.target.value)}
              >
                <option value="">— choose a target file —</option>
                {(levels[reviewing.lang]?.[reviewing.domain] ?? []).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-ink-faint">
                The item is published into this level&apos;s JSON file on the
                next CDN release ({reviewing.lang}/{reviewing.domain}).
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-ink-soft">
              Review note (required when rejecting)
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Why rejected / what to fix"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setReviewing(null)}>
              Close
            </Button>
            {reviewing && (
              <>
                <Button
                  variant="danger"
                  loading={deciding}
                  onClick={() => decide(reviewing, "rejected")}
                >
                  <X className="h-4 w-4" /> Reject
                </Button>
                <Button
                  loading={deciding}
                  disabled={!refChoice}
                  onClick={() => decide(reviewing, "published")}
                >
                  <Check className="h-4 w-4" /> Approve
                  {!refChoice ? " (pick a level)" : ""}
                </Button>
              </>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
