"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"

interface StoredKey {
  id: string
  provider: string
  name: string
  api_key: string
  api_base_url?: string | null
  model?: string | null
  cf_account_id?: string | null
  region?: string | null
  enabled: boolean
  cooldown_until?: string | null
  last_error?: string | null
  last_used_at?: string | null
}

interface SettingsData {
  overrides: {
    imageProvider?: string
    ttsEngine?: string
    visionProvider?: string
  }
  env: { imageProvider: string; ttsEngine: string; visionProvider: string }
}

const IMAGE_PROVIDERS = ["openai", "gemini", "deepai", "cloudflare"]
const GENERATE_CAPABLE = ["openai", "gemini", "deepai", "cloudflare", "nvidia"]
const VISION_CAPABLE = ["gemini", "openai", "cloudflare"]
const TTS_PROVIDERS = ["google", "azure"]
const TTS_ENGINES = ["edge", "google", "azure"]
const VISION_PROVIDERS = ["gemini", "openai", "cloudflare"]

const IMAGE_EMPTY: StoredKey = {
  id: "",
  provider: "cloudflare",
  name: "",
  api_key: "",
  enabled: true,
}
const TTS_EMPTY: StoredKey = {
  id: "",
  provider: "google",
  name: "",
  api_key: "",
  enabled: true,
}

type Tab = "image" | "tts" | "provider"

export default function KeysPage() {
  const [tab, setTab] = useState<Tab>("image")
  const [imageKeys, setImageKeys] = useState<StoredKey[] | null>(null)
  const [ttsKeys, setTtsKeys] = useState<StoredKey[] | null>(null)
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [imageForm, setImageForm] = useState<StoredKey>({ ...IMAGE_EMPTY })
  const [ttsForm, setTtsForm] = useState<StoredKey>({ ...TTS_EMPTY })
  const [imgProviderSel, setImgProviderSel] = useState("")
  const [ttsEngineSel, setTtsEngineSel] = useState("")
  const [visionProviderSel, setVisionProviderSel] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [imagePurpose, setImagePurpose] = useState<
    "generate" | "vision" | "both"
  >("generate")

  const fetchKeysData = useCallback(
    async (kind: "image" | "tts"): Promise<StoredKey[]> => {
      const res = await fetch(`/api/keys?kind=${kind}`)
      const data = await res.json()
      if (!data?.success)
        throw new Error(data?.error?.message ?? "failed to load keys")
      return data.data as StoredKey[]
    },
    []
  )

  const fetchSettingsData = useCallback(async (): Promise<SettingsData> => {
    const res = await fetch("/api/settings")
    const data = await res.json()
    if (!data?.success)
      throw new Error(data?.error?.message ?? "failed to load settings")
    return data.data as SettingsData
  }, [])

  const refreshKeys = useCallback(
    async (kind: "image" | "tts") => {
      try {
        const list = await fetchKeysData(kind)
        if (kind === "tts") setTtsKeys(list)
        else setImageKeys(list)
      } catch (err) {
        setError(err instanceof Error ? err.message : "failed to load keys")
      }
    },
    [fetchKeysData]
  )

  const refreshSettings = useCallback(async () => {
    try {
      const s = await fetchSettingsData()
      setSettings(s)
      setImgProviderSel(s.overrides?.imageProvider ?? "")
      setTtsEngineSel(s.overrides?.ttsEngine ?? "")
      setVisionProviderSel(s.overrides?.visionProvider ?? "")
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to load settings")
    }
  }, [fetchSettingsData])

  useEffect(() => {
    if (tab === "image" && imageKeys === null) {
      fetchKeysData("image")
        .then((list) => setImageKeys(list))
        .catch((err: unknown) =>
          setError(err instanceof Error ? err.message : "failed to load keys")
        )
    }
    if (tab === "tts" && ttsKeys === null) {
      fetchKeysData("tts")
        .then((list) => setTtsKeys(list))
        .catch((err: unknown) =>
          setError(err instanceof Error ? err.message : "failed to load keys")
        )
    }
    if (tab === "provider" && settings === null) {
      fetchSettingsData()
        .then((s) => {
          setSettings(s)
          setImgProviderSel(s.overrides?.imageProvider ?? "")
          setTtsEngineSel(s.overrides?.ttsEngine ?? "")
          setVisionProviderSel(s.overrides?.visionProvider ?? "")
        })
        .catch((err: unknown) =>
          setError(
            err instanceof Error ? err.message : "failed to load settings"
          )
        )
    }
  }, [tab, imageKeys, ttsKeys, settings, fetchKeysData, fetchSettingsData])

  async function saveKey(kind: "image" | "tts") {
    const form = kind === "tts" ? ttsForm : imageForm
    setBusy(true)
    setError("")
    setMessage("")
    try {
      const res = await fetch(`/api/keys?kind=${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: form.provider,
          name: form.name.trim(),
          api_key: form.api_key.trim(),
          api_base_url: form.api_base_url?.trim() || undefined,
          model: form.model?.trim() || undefined,
          cf_account_id: form.cf_account_id?.trim() || undefined,
          region: form.region?.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!data?.success) {
        setError(data?.error?.message ?? "save failed")
      } else {
        setMessage(`Saved ${form.provider}:${form.name}`)
        if (kind === "tts") setTtsForm({ ...TTS_EMPTY })
        else setImageForm({ ...IMAGE_EMPTY })
        await refreshKeys(kind)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "save failed")
    } finally {
      setBusy(false)
    }
  }

  async function toggle(kind: Tab, k: StoredKey) {
    await fetch(`/api/keys/${k.id}?kind=${kind}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !k.enabled }),
    })
    await refreshKeys(kind as "image" | "tts")
  }

  async function clearCooldown(kind: Tab, k: StoredKey) {
    await fetch(`/api/keys/${k.id}?kind=${kind}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clear_cooldown: true }),
    })
    await refreshKeys(kind as "image" | "tts")
  }

  async function remove(kind: Tab, k: StoredKey) {
    if (!confirm(`Delete ${k.provider}:${k.name}?`)) return
    await fetch(`/api/keys/${k.id}?kind=${kind}`, { method: "DELETE" })
    await refreshKeys(kind as "image" | "tts")
  }

  async function saveProviderSetting(
    key: "image_provider" | "tts_engine" | "vision_provider",
    value: string
  ) {
    setBusy(true)
    setError("")
    setMessage("")
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      })
      const data = await res.json()
      if (!data?.success) setError(data?.error?.message ?? "save failed")
      else {
        setMessage(
          `Saved ${key}${value ? ` → ${value}` : " (reset ke env/default)"}`
        )
        await refreshSettings()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "save failed")
    } finally {
      setBusy(false)
    }
  }

  const effectiveImageProvider =
    settings?.env.imageProvider || settings?.overrides.imageProvider || "openai"
  const effectiveTtsEngine =
    settings?.env.ttsEngine || settings?.overrides.ttsEngine || "edge"
  const effectiveVisionProvider =
    settings?.env.visionProvider ||
    settings?.overrides.visionProvider ||
    "gemini"

  const generateKeys = (imageKeys ?? []).filter((k) =>
    GENERATE_CAPABLE.includes(k.provider)
  )
  const visionKeys = (imageKeys ?? []).filter((k) =>
    VISION_CAPABLE.includes(k.provider)
  )

  const purposeProviders =
    imagePurpose === "generate"
      ? GENERATE_CAPABLE
      : imagePurpose === "vision"
        ? VISION_CAPABLE
        : IMAGE_PROVIDERS

  function onImagePurposeChange(purpose: "generate" | "vision" | "both") {
    setImagePurpose(purpose)
    const next =
      purpose === "generate"
        ? GENERATE_CAPABLE[0]
        : purpose === "vision"
          ? VISION_CAPABLE[0]
          : IMAGE_PROVIDERS[0]
    setImageForm({ ...imageForm, provider: next })
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">
            Media Studio Settings
          </h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            API keys &amp; provider — diedit di sini, dipakai CLI &amp; GitHub
            Actions.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg px-3 py-1.5 text-sm"
          style={{
            border: "1px solid var(--border)",
            background: "var(--panel)",
          }}
        >
          ← Dashboard
        </Link>
      </header>

      <nav className="mt-6 flex gap-2">
        {(
          [
            ["image", "Image Keys"],
            ["tts", "TTS Keys"],
            ["provider", "Provider"],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            onClick={() => {
              setTab(t)
              setError("")
              setMessage("")
            }}
            className="rounded-lg px-3 py-1.5 text-sm font-medium"
            style={{
              border: "1px solid var(--border)",
              background: tab === t ? "var(--accent)" : "var(--panel)",
              color: tab === t ? "#0e1420" : "var(--text)",
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {error && (
        <p
          className="mt-4 rounded-lg p-3 text-sm"
          style={{ background: "var(--panel)", border: "1px solid #e5484d" }}
        >
          {error}
        </p>
      )}
      {message && (
        <p
          className="mt-4 rounded-lg p-3 text-sm"
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
          }}
        >
          {message}
        </p>
      )}

      {tab === "image" && (
        <>
          <div
            className="rounded-xl p-5"
            style={{
              background: "var(--panel)",
              border: "1px solid var(--border)",
            }}
          >
            <h2 className="font-semibold">Add image key</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              Pilih purpose: <b style={{ color: "var(--text)" }}>Generate</b> =
              image generator (provider kapabel: {GENERATE_CAPABLE.join(", ")}),{" "}
              <b style={{ color: "var(--text)" }}>Vision</b> = validate-images (
              {VISION_CAPABLE.join(", ")}). Key provider yang kapabel keduanya
              muncul di kedua list.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  ["generate", "Generate"],
                  ["vision", "Vision"],
                  ["both", "Both"],
                ] as [typeof imagePurpose, string][]
              ).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => onImagePurposeChange(v)}
                  className="rounded-lg px-3 py-2 text-sm font-medium"
                  style={{
                    border: "1px solid var(--border)",
                    background:
                      imagePurpose === v ? "var(--accent)" : "var(--bg)",
                    color: imagePurpose === v ? "#0e1420" : "var(--text)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <KeyForm
                providers={purposeProviders}
                form={imageForm}
                setForm={setImageForm}
                onSubmit={() => saveKey("image")}
                busy={busy}
                purpose={imagePurpose}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <h2 className="font-semibold">
                Generate keys ({generateKeys.length})
              </h2>
              <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                Image generation — provider kapabel:{" "}
                {GENERATE_CAPABLE.join(", ")}. Provider aktif:{" "}
                <b style={{ color: "var(--text)" }}>{effectiveImageProvider}</b>
                .
              </p>
              <KeyList
                kind="image"
                keys={generateKeys}
                toggle={toggle}
                clearCooldown={clearCooldown}
                remove={remove}
                activeProviders={[effectiveImageProvider]}
              />
            </div>
            <div>
              <h2 className="font-semibold">
                Vision keys ({visionKeys.length})
              </h2>
              <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                Image validation — provider kapabel: {VISION_CAPABLE.join(", ")}
                . Provider aktif:{" "}
                <b style={{ color: "var(--text)" }}>
                  {effectiveVisionProvider}
                </b>
                .
              </p>
              <KeyList
                kind="image"
                keys={visionKeys}
                toggle={toggle}
                clearCooldown={clearCooldown}
                remove={remove}
                activeProviders={[effectiveVisionProvider]}
              />
            </div>
          </div>
          <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
            Key yang providernya kapabel untuk generate dan vision
            (gemini/openai/cloudflare) muncul di kedua list. Provider aktif
            (generate = {effectiveImageProvider}, vision ={" "}
            {effectiveVisionProvider}) ditandai badge hijau/kuning pada key.
          </p>
        </>
      )}

      {tab === "tts" && (
        <>
          <KeyForm
            providers={TTS_PROVIDERS}
            form={ttsForm}
            setForm={setTtsForm}
            onSubmit={() => saveKey("tts")}
            busy={busy}
            tts
          />
          <KeyList
            kind="tts"
            keys={ttsKeys}
            toggle={toggle}
            clearCooldown={clearCooldown}
            remove={remove}
          />
        </>
      )}

      {tab === "provider" && (
        <section className="mt-6 space-y-6">
          <div
            className="rounded-xl p-5"
            style={{
              background: "var(--panel)",
              border: "1px solid var(--border)",
            }}
          >
            <h2 className="font-semibold">Image provider</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              Dipakai generate-images. Precedence: env &gt; setting ini &gt;
              default.{" "}
              <span style={{ color: "var(--text)" }}>
                Efektif: {effectiveImageProvider}
              </span>
              {settings?.env.imageProvider && (
                <span style={{ color: "var(--muted)" }}>
                  {" "}
                  (env aktif: {settings.env.imageProvider})
                </span>
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <select
                value={imgProviderSel}
                onChange={(e) => setImgProviderSel(e.target.value)}
                className="rounded-lg px-3 py-2 text-sm"
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                }}
              >
                <option value="">Auto (env / default)</option>
                {IMAGE_PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button
                onClick={() =>
                  saveProviderSetting("image_provider", imgProviderSel)
                }
                disabled={busy}
                className="rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50"
                style={{ background: "var(--accent)", color: "#0e1420" }}
              >
                Save
              </button>
            </div>
          </div>

          <div
            className="rounded-xl p-5"
            style={{
              background: "var(--panel)",
              border: "1px solid var(--border)",
            }}
          >
            <h2 className="font-semibold">TTS engine</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              Dipakai generate-audio. Edge gratis tanpa key; google/azure pakai
              pool key. Precedence: env &gt; setting &gt; default.{" "}
              <span style={{ color: "var(--text)" }}>
                Efektif: {effectiveTtsEngine}
              </span>
              {settings?.env.ttsEngine && (
                <span style={{ color: "var(--muted)" }}>
                  {" "}
                  (env aktif: {settings.env.ttsEngine})
                </span>
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <select
                value={ttsEngineSel}
                onChange={(e) => setTtsEngineSel(e.target.value)}
                className="rounded-lg px-3 py-2 text-sm"
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                }}
              >
                <option value="">Auto (env / default)</option>
                {TTS_ENGINES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button
                onClick={() => saveProviderSetting("tts_engine", ttsEngineSel)}
                disabled={busy}
                className="rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50"
                style={{ background: "var(--accent)", color: "#0e1420" }}
              >
                Save
              </button>
            </div>
          </div>

          <div
            className="rounded-xl p-5"
            style={{
              background: "var(--panel)",
              border: "1px solid var(--border)",
            }}
          >
            <h2 className="font-semibold">Vision provider</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              Dipakai validate-images (Gemini vision / OpenAI-compatible /
              Cloudflare Workers AI). Precedence: env &gt; setting &gt; default.{" "}
              <span style={{ color: "var(--text)" }}>
                Efektif: {effectiveVisionProvider}
              </span>
              {settings?.env.visionProvider && (
                <span style={{ color: "var(--muted)" }}>
                  {" "}
                  (env aktif: {settings.env.visionProvider})
                </span>
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <select
                value={visionProviderSel}
                onChange={(e) => setVisionProviderSel(e.target.value)}
                className="rounded-lg px-3 py-2 text-sm"
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                }}
              >
                <option value="">Auto (env / default)</option>
                {VISION_PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button
                onClick={() =>
                  saveProviderSetting("vision_provider", visionProviderSel)
                }
                disabled={busy}
                className="rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50"
                style={{ background: "var(--accent)", color: "#0e1420" }}
              >
                Save
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}

function KeyForm({
  providers,
  form,
  setForm,
  onSubmit,
  busy,
  tts = false,
  purpose,
}: {
  providers: string[]
  form: StoredKey
  setForm: (k: StoredKey) => void
  onSubmit: () => void
  busy: boolean
  tts?: boolean
  purpose?: "generate" | "vision" | "both"
}) {
  return (
    <section
      className="rounded-xl p-5"
      style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
    >
      <h2 className="font-semibold">
        {tts
          ? "Add / update TTS key"
          : purpose === "vision"
            ? "Add vision key"
            : purpose === "both"
              ? "Add key (both)"
              : "Add generate key"}
      </h2>
      <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
        {tts
          ? "Google / Azure (keyed). Edge gratis tanpa key — atur di tab Provider."
          : purpose === "vision"
            ? "Key ini dipakai validate-images (vision/validation)."
            : purpose === "both"
              ? "Provider dipilih manual — key muncul di list yang providernya cocok."
              : "Key ini dipakai generate-images."}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
        className="mt-3 grid gap-3 sm:grid-cols-2"
      >
        <label className="text-sm">
          Provider
          <select
            value={form.provider}
            onChange={(e) => setForm({ ...form, provider: e.target.value })}
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
            style={{
              border: "1px solid var(--border)",
              background: "var(--bg)",
            }}
          >
            {providers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Name (label)
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="main"
            required
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
            style={{
              border: "1px solid var(--border)",
              background: "var(--bg)",
            }}
          />
        </label>
        <label className="text-sm sm:col-span-2">
          API key
          <input
            value={form.api_key}
            onChange={(e) => setForm({ ...form, api_key: e.target.value })}
            placeholder="(masked — menimpa bila diisi)"
            required
            type="password"
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
            style={{
              border: "1px solid var(--border)",
              background: "var(--bg)",
            }}
          />
        </label>
        {tts ? (
          form.provider === "azure" && (
            <label className="text-sm sm:col-span-2">
              Region (azure)
              <input
                value={form.region ?? ""}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                placeholder="eastasia"
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                }}
              />
            </label>
          )
        ) : (
          <>
            <label className="text-sm">
              Base URL (optional)
              <input
                value={form.api_base_url ?? ""}
                onChange={(e) =>
                  setForm({ ...form, api_base_url: e.target.value })
                }
                placeholder="https://api.openai.com/v1"
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                }}
              />
            </label>
            <label className="text-sm">
              Model (optional)
              <input
                value={form.model ?? ""}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="@cf/black-forest-labs/flux-1-schnell"
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                }}
              />
            </label>
            {form.provider === "cloudflare" && (
              <label className="text-sm sm:col-span-2">
                Cloudflare Account ID
                <input
                  value={form.cf_account_id ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, cf_account_id: e.target.value })
                  }
                  placeholder="(wajib untuk provider cloudflare)"
                  className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
                  style={{
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                  }}
                />
              </label>
            )}
          </>
        )}
        <button
          type="submit"
          disabled={busy || !form.name || !form.api_key}
          className="sm:col-span-2 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#0e1420" }}
        >
          {busy ? "Saving…" : "Save key"}
        </button>
      </form>
    </section>
  )
}

function KeyList({
  kind,
  keys,
  toggle,
  clearCooldown,
  remove,
  activeProviders,
}: {
  kind: "image" | "tts"
  keys: StoredKey[] | null
  toggle: (kind: Tab, k: StoredKey) => void
  clearCooldown: (kind: Tab, k: StoredKey) => void
  remove: (kind: Tab, k: StoredKey) => void
  activeProviders?: string[]
}) {
  const label = kind === "tts" ? "TTS" : "Image"
  return (
    <section className="mt-6">
      <h2 className="font-semibold">Keys ({keys ? keys.length : "…"})</h2>
      {keys && keys.length === 0 && (
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          Belum ada {label} key. Tambah di atas; kalau tabel tidak tersedia,
          pipeline fallback ke env flat.
        </p>
      )}
      <div className="mt-3 space-y-2">
        {keys?.map((k) => {
          const inCooldown =
            k.cooldown_until && new Date(k.cooldown_until) > new Date()
          const isActive =
            kind === "image" && !!activeProviders?.includes(k.provider)
          return (
            <div
              key={k.id}
              className="flex flex-wrap items-center gap-3 rounded-lg p-3 text-sm"
              style={{
                background: "var(--panel)",
                border: "1px solid var(--border)",
              }}
            >
              <span
                className="rounded px-2 py-0.5 text-xs font-medium"
                style={{ background: "var(--bg)" }}
              >
                {k.provider}
              </span>
              {isActive && (
                <span
                  className="rounded px-2 py-0.5 text-xs font-medium"
                  style={{ background: "#1e3a2f", color: "#4ade80" }}
                >
                  aktif
                </span>
              )}
              <span className="font-medium">{k.name}</span>
              <code
                className="font-mono text-xs"
                style={{ color: "var(--muted)" }}
              >
                {k.api_key}
              </code>
              {kind === "tts" ? (
                k.region && (
                  <code
                    className="font-mono text-xs"
                    style={{ color: "var(--muted)" }}
                  >
                    {k.region}
                  </code>
                )
              ) : (
                <>
                  {k.model && (
                    <code
                      className="font-mono text-xs"
                      style={{ color: "var(--muted)" }}
                    >
                      {k.model}
                    </code>
                  )}
                </>
              )}
              {inCooldown && (
                <span
                  className="rounded px-2 py-0.5 text-xs"
                  style={{ background: "#5c3b1e", color: "#ffb86b" }}
                >
                  cooldown until{" "}
                  {new Date(k.cooldown_until!).toLocaleTimeString()}
                </span>
              )}
              {k.last_error && (
                <span
                  className="max-w-[300px] truncate font-mono text-xs"
                  style={{ color: "#e5484d" }}
                  title={k.last_error}
                >
                  {k.last_error}
                </span>
              )}
              <div className="ml-auto flex items-center gap-2">
                {inCooldown && (
                  <button
                    onClick={() => clearCooldown(kind, k)}
                    className="text-xs underline"
                    style={{ color: "var(--accent)" }}
                  >
                    clear cooldown
                  </button>
                )}
                <button
                  onClick={() => toggle(kind, k)}
                  className="text-xs"
                  style={{ color: k.enabled ? "#4ade80" : "#e5484d" }}
                >
                  {k.enabled ? "enabled" : "disabled"}
                </button>
                <button
                  onClick={() => remove(kind, k)}
                  className="text-xs underline"
                  style={{ color: "#e5484d" }}
                >
                  delete
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
