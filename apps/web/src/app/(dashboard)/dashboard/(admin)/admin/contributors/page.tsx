"use client"

import { useEffect, useState, useCallback } from "react"
import { authFetch } from "@/lib/api"
import { Button, Badge, Spinner, Modal } from "@/components/ui"
import { Pencil, Trash2, Plus } from "lucide-react"
import { useTranslation } from "@/i18n/locale-context"

interface Contributor {
  id: string
  name: string
  email: string
  contributions: string[]
  is_active: boolean
  bio: string | null
  mandarin_level: string | null
  portfolio: string | null
  joined_at: string
}

export default function AdminContributorsPage() {
  const [data, setData] = useState<Contributor[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all")
  const [edit, setEdit] = useState<Contributor | null>(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    authFetch(`/api/v1/contributors?limit=100`)
      .then((r) => r.json())
      .then((env: { data?: Contributor[] }) => {
        const all = env.data ?? []
        return Promise.all(
          all.map((c) =>
            authFetch(`/api/v1/contributors/${c.id}`)
              .then((r) => r.json())
              .then((e2: { data?: Contributor }) => e2.data ?? c)
              .catch(() => c)
          )
        )
      })
      .then((full) => setData(full))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const id = setTimeout(fetchData, 0)
    return () => clearTimeout(id)
  }, [fetchData])

  const toggleActive = async (id: string, current: boolean) => {
    await authFetch(`/api/v1/contributors/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !current }),
    })
    fetchData()
  }

  const softDelete = async (id: string) => {
    await authFetch(`/api/v1/contributors/${id}`, {
      method: "DELETE",
    })
    fetchData()
  }

  const filtered = data.filter((c) => {
    if (filter === "active") return c.is_active
    if (filter === "inactive") return !c.is_active
    return true
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-ink">
          Contributors
        </h1>
        <div className="flex gap-2">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-line bg-sunken text-ink-soft hover:bg-hover"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sunken text-left text-xs font-medium tracking-wide text-ink-faint uppercase">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Contributions</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="w-24 px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-sunken/50">
                  <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                  <td className="px-4 py-3 text-ink-soft">{c.email}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {c.contributions?.join(", ") || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={c.is_active ? "success" : "neutral"}>
                      {c.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-faint">
                    {new Date(c.joined_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEdit(c)}
                        className="cursor-pointer rounded p-1.5 text-ink-faint hover:bg-hover hover:text-ink"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleActive(c.id, c.is_active)}
                        className="cursor-pointer rounded p-1.5 text-ink-faint hover:bg-hover hover:text-ink"
                        title="Toggle active"
                      >
                        <Plus
                          className={`h-4 w-4 ${!c.is_active ? "rotate-45" : ""}`}
                        />
                      </button>
                      <button
                        onClick={() => softDelete(c.id)}
                        className="cursor-pointer rounded p-1.5 text-ink-faint hover:bg-danger/10 hover:text-danger"
                        title="Soft delete"
                      >
                        <Trash2 className="h-4 w-4" />
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
        open={!!edit}
        onClose={() => setEdit(null)}
        title="Edit Contributor"
      >
        {edit && (
          <EditForm
            contributor={edit}
            onClose={() => {
              setEdit(null)
              fetchData()
            }}
          />
        )}
      </Modal>
    </div>
  )
}

function EditForm({
  contributor,
  onClose,
}: {
  contributor: Contributor
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(contributor.name)
  const [bio, setBio] = useState(contributor.bio ?? "")
  const [languageLevel, setLanguageLevel] = useState(
    contributor.mandarin_level ?? ""
  )
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    await authFetch(`/api/v1/contributors/${contributor.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, bio, mandarin_level: languageLevel }),
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-ink-soft">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-line bg-raised px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-ink-soft">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-line bg-raised px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-ink-soft">
          Language Level
        </label>
        <input
          value={languageLevel}
          onChange={(e) => setLanguageLevel(e.target.value)}
          className="mt-1 w-full rounded-md border border-line bg-raised px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button loading={saving} onClick={save}>
          {t("common.save")}
        </Button>
      </div>
    </div>
  )
}
