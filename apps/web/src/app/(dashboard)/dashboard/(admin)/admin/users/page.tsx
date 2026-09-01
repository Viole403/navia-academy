"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Button, Badge, Spinner } from "@/components/ui"
import { Input, Select } from "@/components/ui/form"
import { admin } from "@/lib/api-client"
import { useTranslation } from "@/i18n/locale-context"

const ROLES = ["student", "contributor", "reviewer", "admin"] as const
type Role = (typeof ROLES)[number]

interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  created_at: string
}

export default function AdminUsersPage() {
  const { t } = useTranslation()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [created, setCreated] = useState(false)

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student" as Role,
  })

  const fetchData = useCallback(() => {
    setLoading(true)
    admin
      .users()
      .then(setUsers)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const id = setTimeout(fetchData, 0)
    return () => clearTimeout(id)
  }, [fetchData])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError("")
    try {
      await admin.createUser(form)
      setCreated(true)
      setForm({ name: "", email: "", password: "", role: "student" })
      fetchData()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const changeRole = async (id: string, role: string) => {
    await admin.setRole(id, role).catch((err: Error) => setError(err.message))
    fetchData()
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-bold text-ink">
        {t("admin.users.title")}
      </h1>
      <p className="mb-6 text-sm text-ink-faint">{t("admin.users.hint")}</p>

      <form
        onSubmit={handleCreate}
        className="mb-8 space-y-4 rounded-xl border border-line bg-sunken p-5"
      >
        <h2 className="font-display text-base font-semibold text-ink">
          {t("admin.users.createTitle")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label={t("admin.users.name")}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label={t("admin.users.email")}
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            label={t("admin.users.password")}
            type="password"
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <Select
            label={t("admin.users.role")}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" loading={busy}>
            {t("admin.users.create")}
          </Button>
          {created && (
            <span className="text-sm text-success">
              {t("admin.users.success")}
            </span>
          )}
          {error && <span className="text-sm text-danger">{error}</span>}
        </div>
      </form>

      {loading ? (
        <Spinner />
      ) : users.length === 0 ? (
        <p className="text-sm text-ink-faint">{t("admin.users.empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sunken text-left text-xs font-medium tracking-wide text-ink-faint uppercase">
                <th className="px-4 py-3">{t("admin.users.colName")}</th>
                <th className="px-4 py-3">{t("admin.users.colEmail")}</th>
                <th className="px-4 py-3">{t("admin.users.colRole")}</th>
                <th className="px-4 py-3">{t("admin.users.colJoined")}</th>
                <th className="px-4 py-3 text-right">
                  {t("admin.users.changeRole")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => (
                <tr key={u.id} className="bg-bg hover:bg-sunken/60">
                  <td className="px-4 py-3 text-ink">
                    {u.name || <span className="text-ink-faint">—</span>}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={
                        u.role === "admin"
                          ? "danger"
                          : u.role === "reviewer"
                            ? "warn"
                            : u.role === "contributor"
                              ? "accent"
                              : "neutral"
                      }
                    >
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-faint">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      className="cursor-pointer rounded-md border border-line bg-raised px-2.5 py-1.5 text-xs text-ink transition-colors outline-none hover:border-line-strong"
                      aria-label={t("admin.users.changeRole")}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
