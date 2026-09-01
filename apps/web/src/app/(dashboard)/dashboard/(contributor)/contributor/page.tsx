"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useAllowedRefs } from "@/lib/content-levels"
import { content } from "@/lib/api"
import {
  Button,
  Badge,
  Spinner,
  Modal,
  Input,
  Textarea,
  Select,
} from "@/components/ui"
import { Plus, Pencil, Send, RefreshCw, Search } from "lucide-react"

const DOMAINS = [
  "vocabulary",
  "grammar",
  "readings",
  "conversations",
  "characters",
] as const
const LANGS = ["zh", "de", "en", "ja"] as const

interface ContentRow {
  lang: string
  domain: string
  ref: string
  pos: number
  id: string
  kind: "list" | "object"
  payload: unknown
  status: string
  created_by: string | null
  created_at: string
  updated_at: string
  review_note?: string | null
}

const STATUS_TONE: Record<string, "success" | "neutral" | "warn"> = {
  published: "success",
  review: "warn",
  rejected: "warn",
  draft: "neutral",
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function payloadSummary(p: unknown): string {
  if (!isObject(p)) return JSON.stringify(p)
  const s = p.translation ?? p.text ?? p.hanzi ?? p.title ?? p.char ?? p.id
  return typeof s === "string" ? s : JSON.stringify(p).slice(0, 80)
}

export default function ContributorPage() {
  const { user, isReviewer } = useAuth()
  const [rows, setRows] = useState<ContentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [domain, setDomain] = useState<(typeof DOMAINS)[number]>("vocabulary")
  const [lang, setLang] = useState<(typeof LANGS)[number]>("zh")
  const [showOnlyMine, setShowOnlyMine] = useState(false)
  const [query, setQuery] = useState("")
  const [editing, setEditing] = useState<ContentRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")
  const [toast, setToast] = useState("")

  const fetchRows = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const q = new URLSearchParams({ domain, lang, limit: "200" })
      const rows = await content.list(q)
      setRows(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed")
    } finally {
      setLoading(false)
    }
  }, [domain, lang])

  useEffect(() => {
    const id = setTimeout(fetchRows, 0)
    return () => clearTimeout(id)
  }, [fetchRows])

  const mine = useMemo(
    () => rows.filter((r) => !showOnlyMine || r.created_by === user?.uid),
    [rows, showOnlyMine, user]
  )
  const filtered = useMemo(() => {
    if (!query) return mine
    const q = query.toLowerCase()
    return mine.filter((r) => {
      const s = payloadSummary(r.payload).toLowerCase()
      return s.includes(q) || r.id.toLowerCase().includes(q)
    })
  }, [mine, query])

  const notify = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(""), 2500)
  }

  const submitForReview = async (row: ContentRow) => {
    try {
      await content.update(row.lang, row.domain, row.id, {
        status: "review",
        expected_updated_at: row.updated_at,
      })
      notify("Submitted for review")
      fetchRows()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed")
    }
  }

  const statusCount = useMemo(() => {
    const c: Record<string, number> = {}
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1
    return c
  }, [rows])

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            Content Studio
          </h1>
          <p className="text-sm text-ink-soft">
            {isReviewer
              ? "Reviewer: you can publish or reject submitted items."
              : "Create and submit content — a reviewer approves it for the CDN."}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> New item
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          value={lang}
          onChange={(e) => setLang(e.target.value as (typeof LANGS)[number])}
        >
          {LANGS.map((l) => (
            <option key={l} value={l}>
              {l.toUpperCase()}
            </option>
          ))}
        </Select>
        <Select
          value={domain}
          onChange={(e) =>
            setDomain(e.target.value as (typeof DOMAINS)[number])
          }
        >
          {DOMAINS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={showOnlyMine}
            onChange={(e) => setShowOnlyMine(e.target.checked)}
            className="accent-accent"
          />
          Only mine
        </label>
        <div className="relative ml-auto">
          <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-ink-faint" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="pl-8"
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchRows}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {Object.keys(statusCount).length > 0 && (
        <div className="mb-4 flex gap-2 text-xs">
          {Object.entries(statusCount).map(([s, n]) => (
            <Badge key={s} tone={STATUS_TONE[s] ?? "neutral"}>
              {s}: {n}
            </Badge>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-10 text-center text-ink-soft">
          No items here yet. Click{" "}
          <span className="font-medium text-accent">New item</span> to
          contribute.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sunken text-left text-xs font-medium tracking-wide text-ink-faint uppercase">
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="w-48 px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((r) => (
                <tr
                  key={`${r.lang}/${r.domain}/${r.id}`}
                  className="hover:bg-sunken/50"
                >
                  <td className="px-4 py-3 font-medium text-ink">
                    {payloadSummary(r.payload)}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-faint">{r.id}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[r.status] ?? "neutral"}>
                      {r.status}
                    </Badge>
                    {r.status === "rejected" && r.review_note && (
                      <p className="mt-1 text-xs text-amber-700">
                        {r.review_note}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-faint">
                    {new Date(r.updated_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditing(r)}
                        className="cursor-pointer rounded p-1.5 text-ink-faint hover:bg-hover hover:text-ink"
                        title="Edit"
                        disabled={r.status === "review"}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {r.status !== "review" && (
                        <button
                          onClick={() => submitForReview(r)}
                          className="cursor-pointer rounded p-1.5 text-ink-faint hover:bg-hover hover:text-accent"
                          title="Submit for review"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <ContentEditor
          lang={lang}
          domain={domain}
          onClose={() => {
            setCreating(false)
            fetchRows()
          }}
        />
      )}
      {editing && (
        <ContentEditor
          lang={editing.lang}
          domain={editing.domain}
          row={editing}
          onClose={() => {
            setEditing(null)
            fetchRows()
          }}
        />
      )}

      {toast && (
        <div className="fixed right-4 bottom-4 rounded-lg bg-ink px-4 py-2 text-sm text-accent-ink shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

// ─── Editor ────────────────────────────────────────────────────────────

interface GuidedField {
  key: string
  label: string
  list?: boolean
}

// Matches the canonical JSON schema in apps/media/data/json. The guided form
// only exposes fields that exist in the published bundles per lang/domain.
function guidedFields(lang: string, domain: string): GuidedField[] {
  switch (domain) {
    case "vocabulary":
      if (lang === "zh") {
        return [
          { key: "text", label: "Hanzi / Text" },
          { key: "pinyin", label: "Pinyin" },
          { key: "zhuyin", label: "Zhuyin (Bopomofo)" },
          { key: "translation", label: "Translation (English)" },
        ]
      }
      if (lang === "ja") {
        return [
          { key: "text", label: "Text / Kanji" },
          { key: "romanization", label: "Romanization" },
          { key: "translation", label: "Translation (English)" },
        ]
      }
      return [
        { key: "text", label: "Text" },
        { key: "pronunciation", label: "Pronunciation" },
        { key: "translation", label: "Translation (English)" },
      ]
    case "characters":
      return lang === "zh"
        ? [
            { key: "char", label: "Character" },
            { key: "pinyin", label: "Pinyin" },
            { key: "zhuyin", label: "Zhuyin" },
            { key: "meaning", label: "Meaning" },
          ]
        : [
            { key: "char", label: "Character" },
            { key: "meaning", label: "Meaning" },
          ]
    case "grammar":
      return [
        { key: "title", label: "Title" },
        { key: "pattern", label: "Pattern" },
        { key: "simpleExplanation", label: "Simple explanation" },
      ]
    case "readings":
      return [
        { key: "title", label: "Title" },
        { key: "summary", label: "Summary" },
        { key: "paragraphs", label: "Paragraphs (JSON array)", list: true },
      ]
    case "conversations":
      return lang === "zh"
        ? [
            { key: "title", label: "Title" },
            { key: "context", label: "Context" },
            { key: "turns", label: "Turns (JSON array)", list: true },
          ]
        : [
            { key: "title", label: "Title" },
            { key: "scenario", label: "Scenario" },
            { key: "dialogue", label: "Dialogue (JSON array)", list: true },
          ]
  }
  return []
}

function ContentEditor({
  lang,
  domain,
  row,
  onClose,
}: {
  lang: string
  domain: string
  row?: ContentRow
  onClose: () => void
}) {
  const [id, setId] = useState(row?.id ?? "")
  const [ref, setRef] = useState(row?.ref ?? "")
  const [payloadText, setPayloadText] = useState(
    row ? JSON.stringify(row.payload, null, 2) : ""
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")
  const isEdit = !!row

  const fields = guidedFields(lang, domain)
  const levels = useAllowedRefs()
  const levelOptions = levels[lang]?.[domain] ?? []
  const initial = isObject(row?.payload) ? row!.payload : {}
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {}
    for (const f of fields) {
      const s = initial[f.key]
      v[f.key] =
        typeof s === "string" || typeof s === "number"
          ? String(s)
          : Array.isArray(s)
            ? JSON.stringify(s)
            : ""
    }
    return v
  })

  const setVal = (key: string, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }))

  const buildPayload = useCallback(() => {
    if (payloadText.trim()) {
      try {
        return JSON.parse(payloadText)
      } catch {
        throw new Error("Invalid JSON payload")
      }
    }
    const base: Record<string, unknown> = { id, language: lang }
    for (const f of fields) {
      const raw = (values[f.key] ?? "").trim()
      if (!raw) continue
      if (f.list) {
        try {
          base[f.key] = JSON.parse(raw)
        } catch {
          throw new Error(`Field "${f.label}" must be a valid JSON array`)
        }
      } else {
        base[f.key] = raw
        // zh vocabulary items carry both text and hanzi in the published schema.
        if (domain === "vocabulary" && lang === "zh" && f.key === "text") {
          base.hanzi = raw
        }
      }
    }
    return base
  }, [id, lang, domain, fields, values, payloadText])

  const save = async () => {
    setSaving(true)
    setErr("")
    let payload: unknown
    try {
      payload = buildPayload()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid JSON")
      setSaving(false)
      return
    }

    try {
      if (isEdit) {
        await content.update(row!.lang, row!.domain, row!.id, {
          payload,
          expected_updated_at: row!.updated_at,
          ref: ref || undefined,
        })
      } else {
        await content.create({
          lang,
          domain,
          id,
          payload,
          ref: ref || undefined,
        })
      }
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed"
      setErr(
        (e as { code?: string } | null)?.code === "duplicate-id"
          ? `ID "${id}" already exists in ${lang}/${domain}. Pick a unique id.`
          : msg
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? "Edit item" : `New ${domain} item (${lang})`}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink-soft">
            ID (unique per lang/domain)
          </label>
          <Input
            value={id}
            onChange={(e) => setId(e.target.value)}
            disabled={isEdit}
            placeholder="e.g. new-word"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-soft">
            Suggested level (reviewer will confirm)
          </label>
          <Select value={ref} onChange={(e) => setRef(e.target.value)}>
            <option value="">— none —</option>
            {levelOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-ink-faint">
            Optional proposal — the reviewer assigns the final target file on
            approval.
          </p>
        </div>

        {!payloadText &&
          fields.map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-ink-soft">
                {f.label}
              </label>
              {f.list ? (
                <Textarea
                  value={values[f.key] ?? ""}
                  onChange={(e) => setVal(f.key, e.target.value)}
                  rows={3}
                  className="font-mono text-xs"
                  placeholder='[{"speaker": "...", "line": "..."}]'
                />
              ) : (
                <Input
                  value={values[f.key] ?? ""}
                  onChange={(e) => setVal(f.key, e.target.value)}
                  placeholder={f.key === "translation" ? "English" : ""}
                />
              )}
            </div>
          ))}

        <div>
          <label className="block text-sm font-medium text-ink-soft">
            Payload JSON (advanced)
          </label>
          <Textarea
            value={payloadText}
            onChange={(e) => setPayloadText(e.target.value)}
            rows={10}
            className="font-mono text-xs"
            placeholder='{"text": "...", "translation": "..."}'
          />
          <p className="mt-1 text-xs text-ink-faint">
            Fill the guided fields above, or paste the full item payload as
            JSON.
          </p>
        </div>

        {err && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {err}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={save}>
            {isEdit ? "Save" : "Create draft"}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
