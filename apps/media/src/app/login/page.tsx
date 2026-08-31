"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get("next") ?? "/"
  const [token, setToken] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError("")
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!data?.success) {
        setError(data?.error?.message ?? "Login failed")
        setBusy(false)
        return
      }
      router.push(next)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div
        className="w-full max-w-sm rounded-2xl p-6"
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
        }}
      >
        <h1 className="text-xl font-bold">Media Studio</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Masukkan admin token untuk mengelola dashboard pipeline.
        </p>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="MEDIA_ADMIN_TOKEN"
            autoFocus
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{
              border: "1px solid var(--border)",
              background: "var(--bg)",
            }}
          />
          {error && (
            <p className="text-sm" style={{ color: "#e5484d" }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || !token}
            className="w-full rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#0e1420" }}
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
