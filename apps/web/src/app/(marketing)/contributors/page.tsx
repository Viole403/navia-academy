"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Users } from "lucide-react"
import { NaviaChip } from "@/components/marketing/navia-chip"
import { Reveal } from "@/components/ui"
import { community } from "@/lib/api-client"
import { useTranslation } from "@/i18n/locale-context"

interface Contributor {
  id: string
  name: string
  avatar: string | null
  contributions: string[]
  mandarin_level: string | null
  portfolio: string | null
  bio: string | null
  is_active: boolean
  joined_at: string
}

export default function ContributorsPage() {
  const { t } = useTranslation()
  const [contributors, setContributors] = useState<Contributor[] | null>(null)
  const [error, setError] = useState(false)

  const fetchContributors = useCallback(() => {
    setError(false)
    setContributors(null)
    community
      .contributors()
      .then(setContributors)
      .catch(() => setError(true))
  }, [])

  useEffect(() => {
    const id = setTimeout(fetchContributors, 0)
    return () => clearTimeout(id)
  }, [fetchContributors])

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0" aria-hidden>
        <div className="absolute top-[-18%] left-[-14%] h-[28rem] w-[28rem] rounded-full bg-[var(--bauhaus-red)]/20 blur-3xl" />
        <div className="absolute top-[12%] right-[-12%] h-[26rem] w-[26rem] rounded-full bg-[var(--bauhaus-blue)]/20 blur-3xl" />
        <div className="absolute bottom-[-28%] left-[35%] h-80 w-80 rounded-full bg-[var(--bauhaus-yellow)]/20 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(20,22,27,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(20,22,27,0.045)_1px,transparent_1px)] bg-[size:56px_56px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 pt-16 pb-20 sm:px-6 md:pt-24 md:pb-28">
        <Reveal>
          <span className="bauhaus-chip bauhaus-chip-ink inline-flex items-center gap-2">
            <NaviaChip className="h-4 w-6" />
            {t("nav.contributors")}
          </span>
          <h1 className="text-display-xl mt-6 max-w-3xl font-display leading-[0.98] tracking-tight text-ink">
            {t("contributors.title")}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
            {t("contributors.subtitle")}
          </p>
        </Reveal>

        {contributors === null && !error && (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="shadow-neo animate-pulse border border-line bg-sunken p-6"
              >
                <div className="h-3 w-28 rounded bg-ink/10" />
                <div className="mt-4 h-3 w-full rounded bg-ink/10" />
                <div className="mt-2 h-3 w-3/4 rounded bg-ink/10" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="shadow-neo mt-10 border border-line bg-sunken p-8 text-center">
            <p className="text-sm text-ink-soft">{t("contributors.error")}</p>
            <button
              onClick={fetchContributors}
              className="mt-4 inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius)] border border-line bg-raised px-5 py-2.5 text-sm font-medium text-ink transition-transform hover:-translate-y-0.5"
            >
              {t("contributors.retry")}
            </button>
          </div>
        )}

        {contributors !== null && contributors.length === 0 && (
          <div className="shadow-neo mt-10 border border-line bg-sunken">
            <div className="border-b border-line p-6">
              <span className="bauhaus-chip bauhaus-chip-yellow inline-flex">
                <Users className="h-4 w-4" />
              </span>
              <h2 className="mt-5 font-display text-xl font-semibold tracking-tight text-ink">
                {t("contributors.emptyTitle")}
              </h2>
            </div>
            <p className="p-6 pt-4 text-sm leading-relaxed text-ink-soft">
              {t("contributors.emptySubtitle")}
            </p>
            <div className="flex flex-wrap gap-3 px-6 pb-6">
              <Link
                href="/contributors/apply"
                className="text-paper inline-flex items-center justify-center gap-2 rounded-[var(--radius)] bg-ink px-5 py-2.5 text-sm font-medium transition-transform hover:-translate-y-0.5"
              >
                {t("contributors.join")}
              </Link>
            </div>
          </div>
        )}

        {contributors !== null && contributors.length > 0 && (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contributors.map((c) => (
              <div
                key={c.id}
                className="shadow-neo border border-line bg-sunken p-6"
              >
                <div className="flex items-center gap-3">
                  {c.avatar ? (
                    <Image
                      src={c.avatar}
                      alt={c.name}
                      unoptimized
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-paper flex h-10 w-10 items-center justify-center rounded-full bg-ink text-sm font-semibold">
                      {c.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <h2 className="font-display font-semibold text-ink">
                      {c.name}
                    </h2>
                    {c.mandarin_level && (
                      <p className="text-xs text-ink-soft">
                        {c.mandarin_level}
                      </p>
                    )}
                  </div>
                </div>
                {c.bio && (
                  <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                    {c.bio}
                  </p>
                )}
                {c.contributions.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {c.contributions.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-line bg-raised px-2.5 py-0.5 text-xs text-ink-soft"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
