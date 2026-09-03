"use client"

import { useEffect, useState, useCallback } from "react"
import { Button, Badge, Spinner, EmptyState } from "@/components/ui"
import { useAuth } from "@/lib/auth-context"
import { authFetch } from "@/lib/api"
import { CheckCircle2, XCircle } from "lucide-react"

interface Application {
  id: string
  name: string
  email: string
  contribution_area: string
  mandarin_level: string | null
  portfolio: string | null
  message: string | null
  status: string
  created_at: string
}

export default function AdminApplicationsPage() {
  const { user } = useAuth()
  const [data, setData] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(() => {
    authFetch(`/api/v1/contributors/applications`)
      .then((r) => r.json())
      .then((json: { data?: Application[] }) => setData(json.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const review = async (id: string, status: "APPROVED" | "REJECTED") => {
    await authFetch(`/api/v1/contributors/applications/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewed_by: user?.uid ?? "unknown" }),
    })
    fetchData()
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">
          Contributor Applications
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Review and manage pending applications.
        </p>
      </div>

      {loading ? (
        <Spinner />
      ) : data.length === 0 ? (
        <EmptyState title="No applications yet" />
      ) : (
        <div className="space-y-4">
          {data.map((app) => (
            <div
              key={app.id}
              className="rounded-xl border border-line bg-raised p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-ink">{app.name}</h3>
                    <Badge
                      tone={
                        app.status === "APPROVED"
                          ? "success"
                          : app.status === "REJECTED"
                            ? "danger"
                            : "warn"
                      }
                    >
                      {app.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">{app.email}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink-faint">
                    <span className="rounded-md bg-sunken px-2 py-1">
                      {app.contribution_area}
                    </span>
                    {app.mandarin_level && (
                      <span className="rounded-md bg-sunken px-2 py-1">
                        {app.mandarin_level}
                      </span>
                    )}
                    <span>{new Date(app.created_at).toLocaleDateString()}</span>
                  </div>
                  {app.message && (
                    <p className="mt-2 text-sm text-ink-soft italic">
                      &ldquo;{app.message}&rdquo;
                    </p>
                  )}
                  {app.portfolio && (
                    <a
                      href={app.portfolio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-sm text-accent hover:underline"
                    >
                      Portfolio →
                    </a>
                  )}
                </div>
                {app.status === "PENDING" && (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => review(app.id, "APPROVED")}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => review(app.id, "REJECTED")}
                    >
                      <XCircle className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
