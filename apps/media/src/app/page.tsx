"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"

interface Status {
  manifestEntries: number
  audioFiles: number
  imageFiles: number
  storage: {
    configured: boolean
    provider: string
    bucket: string
    endpoint: string
    publicUrl: string
  }
  ttsEngine: string
  imageProvider: string
  byLocale: Record<string, number>
}

interface RunResult {
  generated: number
  skipped: number
  errors: number
  total: number
  upload: boolean
}

interface AnkiSourceInfo {
  id: string
  name: string
  url: string
  file: string
  target: string
  fields: Record<string, number>
}

export default function MediaStudioPage() {
  const [status, setStatus] = useState<Status | null>(null)
  const [ankiSources, setAnkiSources] = useState<AnkiSourceInfo[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [result, setResult] = useState<string>("")

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/status")
      setStatus(await res.json())
    } catch {
      setStatus(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setStatus(d as Status)
      })
      .catch(() => {
        if (!cancelled) setStatus(null)
      })
    fetch("/api/anki/sources")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && Array.isArray(d?.sources))
          setAnkiSources(d.sources as AnkiSourceInfo[])
      })
      .catch(() => {
        if (!cancelled) setAnkiSources(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function run(kind: "audio" | "images", limit: number) {
    setBusy(kind)
    setResult("")
    try {
      const res = await fetch(`/api/generate/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit }),
      })
      const data = (await res.json()) as RunResult
      setResult(
        `${kind}: generated=${data.generated} skipped=${data.skipped} errors=${data.errors} upload=${data.upload ? "yes" : "no"}`
      )
    } catch (err) {
      setResult(`error: ${err instanceof Error ? err.message : "failed"}`)
    } finally {
      setBusy(null)
      refresh()
    }
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">
            Navia Media Studio
          </h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Pusat data + pipeline audio &amp; gambar · zh (HSK/TOCFL) · de
            (Goethe) · en (TOEFL) · ja (JLPT)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/keys"
            className="rounded-lg px-3 py-1.5 text-sm"
            style={{
              border: "1px solid var(--border)",
              background: "var(--panel)",
            }}
          >
            API Keys / Settings
          </Link>
          <button
            onClick={refresh}
            className="rounded-lg px-3 py-1.5 text-sm"
            style={{
              border: "1px solid var(--border)",
              background: "var(--panel)",
            }}
          >
            Refresh
          </button>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" })
              window.location.href = "/login"
            }}
            className="rounded-lg px-3 py-1.5 text-sm"
            style={{
              border: "1px solid var(--border)",
              background: "var(--panel)",
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Manifest entries"
          value={status ? String(status.manifestEntries) : "…"}
        />
        <Stat
          label="Audio files generated"
          value={status ? String(status.audioFiles) : "…"}
        />
        <Stat
          label="Image files generated"
          value={status ? String(status.imageFiles) : "…"}
        />
      </section>

      <section
        className="mt-6 rounded-xl p-5"
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
        }}
      >
        <h2 className="font-semibold">Storage</h2>
        <pre
          className="mt-2 text-sm whitespace-pre-wrap"
          style={{ color: "var(--muted)" }}
        >
          {status
            ? `provider : ${status.storage.provider}
bucket   : ${status.storage.bucket}
endpoint : ${status.storage.endpoint}
public   : ${status.storage.publicUrl}
configured: ${status.storage.configured ? "yes" : "NO"}
locale   : ${JSON.stringify(status.byLocale)}
tts      : ${status.ttsEngine}
images   : ${status.imageProvider}`
            : "loading…"}
        </pre>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <ActionCard
          title="Generate audio"
          desc="TTS (edge/google/azure) → .output/audio → upload ke storage. Jalan penuh disarankan lewat GitHub Actions."
          onRun={() => run("audio", 10)}
          busy={busy === "audio"}
        />
        <ActionCard
          title="Generate images"
          desc="AI illustration dari terjemahan → .output/images → upload ke storage."
          onRun={() => run("images", 3)}
          busy={busy === "images"}
        />
      </section>

      {result && (
        <p
          className="mt-4 rounded-lg p-3 text-sm"
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
          }}
        >
          {result}
        </p>
      )}

      <section
        className="mt-6 rounded-xl p-5"
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
        }}
      >
        <h2 className="font-semibold">Command (CLI / GitHub Actions)</h2>
        <pre
          className="mt-2 overflow-x-auto text-sm"
          style={{ color: "var(--muted)" }}
        >
          {`bun run data:generate-manifest   # rebuild manifest dari data/json
bun run data:generate-audio      # audio penuh + upload (≈30–45 menit)
bun run data:generate-images     # gambar penuh + upload
bun run data:import-anki -- file.apkg --dump out.json`}
        </pre>
      </section>

      <section
        className="mt-6 rounded-xl p-5"
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
        }}
      >
        <h2 className="font-semibold">Anki sources</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Tambahkan deck di{" "}
          <code className="font-mono text-xs">
            apps/media/data/anki-sources.json
          </code>{" "}
          — isi URL/file + pemetaan kolom (
          <code className="font-mono text-xs">hanzi</code>,{" "}
          <code className="font-mono text-xs">pinyin</code>,{" "}
          <code className="font-mono text-xs">translation</code>,{" "}
          <code className="font-mono text-xs">zhuyin</code>) sesuai format tiap
          deck.
        </p>
        {ankiSources && ankiSources.length > 0 ? (
          <div className="mt-3 space-y-2">
            {ankiSources.map((s) => (
              <div
                key={s.id}
                className="rounded-lg border border-line p-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>
                    → {s.target}
                  </span>
                </div>
                <p
                  className="mt-1 font-mono text-xs"
                  style={{ color: "var(--muted)" }}
                >
                  {s.url || s.file || "–"} · fields {JSON.stringify(s.fields)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
            Belum ada sumber. Tambah di{" "}
            <code className="font-mono text-xs">
              apps/media/data/anki-sources.json
            </code>
            .
          </p>
        )}
      </section>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--panel)", border: "1px solid var(--border)" }}
    >
      <p
        className="text-xs uppercase tracking-widest"
        style={{ color: "var(--muted)" }}
      >
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}

function ActionCard({
  title,
  desc,
  onRun,
  busy,
}: {
  title: string
  desc: string
  onRun: () => void
  busy: boolean
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "var(--panel)", border: "1px solid var(--border)" }}
    >
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
        {desc}
      </p>
      <button
        onClick={onRun}
        disabled={busy}
        className="mt-3 rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        style={{ background: "var(--accent)", color: "#0e1420" }}
      >
        {busy ? "Running…" : "Run sample (small)"}
      </button>
    </div>
  )
}
