"use client"

import { useEffect, useState } from "react"
import { API_BASE_URL } from "@/lib/api"
import { Coffee, HeartHandshake } from "lucide-react"
import { Button, Card, EmptyState, Reveal, Spinner } from "@/components/ui"
import { useTranslation } from "@/i18n/locale-context"
import Image from "next/image"

const TRAKTEER_URL = "https://trakteer.id/navia-academy"
const KOFI_URL = "https://ko-fi.com/naviaacademy"

interface SupporterData {
  name: string
  avatar_url: string | null
  platform: string
  message: string | null
  donated_at: string
}

const PLATFORM_LABEL: Record<string, string> = {
  kofi: "Ko-fi",
  trakteer: "Trakteer",
}

export default function SupportPage() {
  const { t } = useTranslation()
  const [data, setData] = useState<SupporterData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/supporters?limit=100`)
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((json: { data?: SupporterData[] }) => setData(json.data ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const initials = (name: string) => name.trim().charAt(0).toUpperCase() || "?"
  const messages = data.filter((s) => s.message).slice(0, 6)

  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <Reveal>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
          {t("support.title")}
        </h1>
        <p className="mt-2 text-ink-soft">{t("support.subtitle")}</p>
      </Reveal>

      <Reveal className="mt-10">
        <div className="rounded-xl border border-line bg-sunken/50 p-8 text-center">
          <div className="mx-auto inline-flex flex-wrap items-center justify-center gap-3">
            <a href={TRAKTEER_URL} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="lg">
                <Coffee className="h-5 w-5" />
                {t("support.donateTrakteer")}
              </Button>
            </a>
            <HeartHandshake className="h-8 w-8 shrink-0 text-accent" />
            <a href={KOFI_URL} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="lg">
                <Coffee className="h-5 w-5" />
                {t("support.donateKofi")}
              </Button>
            </a>
          </div>
        </div>
      </Reveal>

      <Reveal className="mt-10">
        <p className="text-sm text-ink-soft">{t("support.why")}</p>
      </Reveal>

      <Reveal className="mt-16">
        <h2 className="font-display text-xl font-semibold text-ink">
          {t("support.supportersTitle")}
        </h2>

        {loading ? (
          <Spinner />
        ) : error ? (
          <EmptyState
            title={t("support.wallErrorTitle")}
            description={t("support.wallErrorSubtitle")}
          />
        ) : data.length === 0 ? (
          <EmptyState
            icon={<HeartHandshake className="h-10 w-10" />}
            title={t("support.wallEmptyTitle")}
            description={t("support.wallEmptySubtitle")}
          />
        ) : (
          <>
            <div className="mt-6 grid grid-cols-4 gap-4 sm:grid-cols-6 md:grid-cols-8">
              {data.map((s, i) => (
                <div
                  key={`${s.platform}-${s.name}-${i}`}
                  className="flex flex-col items-center justify-center"
                  title={`${s.name} · ${PLATFORM_LABEL[s.platform] ?? s.platform}`}
                >
                  {s.avatar_url ? (
                    <Image
                      src={s.avatar_url}
                      alt={s.name}
                      unoptimized
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                      {initials(s.name)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {messages.length > 0 && (
              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {messages.map((s, i) => (
                  <Card key={`msg-${i}`} className="flex flex-col p-5">
                    <p className="flex-1 text-sm text-ink">{s.message}</p>
                    <p className="mt-3 text-xs text-ink-soft">
                      {s.name} · {PLATFORM_LABEL[s.platform] ?? s.platform}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </Reveal>
    </main>
  )
}
