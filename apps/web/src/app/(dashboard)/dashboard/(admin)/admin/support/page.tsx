"use client"

import { useCallback, useEffect, useState } from "react"
import { authFetch } from "@/lib/api"
import { Badge, Button, Spinner } from "@/components/ui"
import { Copy, RefreshCw } from "lucide-react"

interface WebhookInfo {
  endpoint: string
  configured: boolean
  instructions: string
}

interface Supporter {
  id: number
  name: string
  platform: string
  amount_minor: number | null
  currency: string | null
  is_public: boolean
  donated_at: string
  message: string | null
}

// formatAmount renders a minor-unit amount (USD cents / IDR rupiah) with its
// currency symbol. Returns "—" when there is no recorded amount.
function formatAmount(minor: number | null, currency: string | null): string {
  if (minor === null || minor === undefined) return "—"
  if (currency === "IDR") {
    // Trakteer sends whole rupiah; minor == rupiah already.
    return `Rp ${minor.toLocaleString("id-ID")}`
  }
  // Default USD: minor is cents.
  return `$${(minor / 100).toFixed(2)}`
}

export default function AdminSupportPage() {
  const [config, setConfig] = useState<{
    kofi: WebhookInfo
    trakteer: WebhookInfo
  } | null>(null)
  const [supporters, setSupporters] = useState<Supporter[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      authFetch(`/api/v1/admin/support/config`).then((r) => r.json()),
      authFetch(`/api/v1/admin/supporters?limit=100`).then((r) => r.json()),
    ])
      .then(([cfg, sup]) => {
        setConfig(cfg.data ?? null)
        setSupporters(sup.data ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const id = setTimeout(load, 0)
    return () => clearTimeout(id)
  }, [load])

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    } catch {}
  }

  if (loading && !config) {
    return (
      <div className="flex items-center justify-center gap-2 py-16">
        <Spinner /> <span className="text-sm text-ink-soft">Loading…</span>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            Support & Donations
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Donation webhooks (Ko-fi / Trakteer) + supporter wall data.
          </p>
        </div>
        <Button size="sm" onClick={load} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold text-ink">
          Webhook Setup
        </h2>
        <p className="text-sm text-ink-soft">
          Paste endpoint di bawah ini ke dashboard donasi masing-masing. Secret
          di-set lewat env backend (
          <code className="rounded bg-sunken px-1 py-0.5">
            KOFI_VERIFICATION_TOKEN
          </code>{" "}
          /{" "}
          <code className="rounded bg-sunken px-1 py-0.5">
            TRAKTEER_WEBHOOK_SECRET
          </code>
          ) — tidak diubah dari UI ini demi keamanan.
        </p>
        {config &&
          (Object.keys(config) as Array<keyof typeof config>).map(
            (platform) => {
              const info = config[platform]
              return (
                <div
                  key={platform}
                  className="bg-paper rounded-xl border border-line p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-base font-bold text-ink capitalize">
                        {platform}
                      </span>
                      <Badge tone={info.configured ? "success" : "neutral"}>
                        {info.configured ? "Configured" : "No secret set"}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <code className="rounded bg-sunken px-2 py-1 text-xs break-all text-ink">
                      {info.endpoint}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copy(info.endpoint, platform)}
                    >
                      <Copy className="mr-2 h-3.5 w-3.5" />{" "}
                      {copied === platform ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-ink-soft">
                    {info.instructions}
                  </p>
                </div>
              )
            }
          )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold text-ink">
          Supporters ({supporters.length})
        </h2>
        {supporters.length === 0 ? (
          <p className="bg-paper rounded-xl border border-line p-6 text-sm text-ink-soft">
            Belum ada donasi masuk. Webhook akan membuat entri di sini otomatis.
          </p>
        ) : (
          <div className="bg-paper overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-soft uppercase">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Platform</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Public</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {supporters.map((s) => (
                  <tr key={s.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-medium text-ink">{s.name}</td>
                    <td className="px-4 py-3 text-ink-soft capitalize">
                      {s.platform}
                    </td>
                    <td className="px-4 py-3 text-ink">
                      {formatAmount(s.amount_minor, s.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={s.is_public ? "success" : "neutral"}>
                        {s.is_public ? "Public" : "Private"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {new Date(s.donated_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
