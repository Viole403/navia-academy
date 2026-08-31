"use client"

import Link from "next/link"
import { useTranslation } from "@/i18n/locale-context"
import { Logo } from "@/components/ui/logo"

export function SiteFooter() {
  const { t } = useTranslation()

  const COLUMNS = [
    {
      titleKey: "footer.product",
      links: [
        { href: "/features", labelKey: "footer.features" },
        { href: "/register", labelKey: "footer.createAccount" },
      ],
    },
    {
      titleKey: "footer.learning",
      links: [
        { href: "/register", labelKey: "footer.placementTest" },
        { href: "/features", labelKey: "footer.pronunciation" },
        { href: "/features", labelKey: "footer.writing" },
        { href: "/features", labelKey: "footer.spacedRepetition" },
      ],
    },
    {
      titleKey: "footer.community",
      links: [
        { href: "/contributors", labelKey: "footer.contributors" },
        { href: "/support", labelKey: "footer.support" },
        { href: "/contributors/apply", labelKey: "footer.becomeContributor" },
      ],
    },
    {
      titleKey: "footer.legal",
      links: [
        { href: "/about", labelKey: "footer.about" },
        { href: "/contact", labelKey: "footer.contact" },
        { href: "/terms", labelKey: "footer.terms" },
        { href: "/privacy", labelKey: "footer.privacy" },
        { href: "/cookies", labelKey: "footer.cookies" },
      ],
    },
  ]

  return (
    <footer className="border-t border-line bg-sunken">
      <div
        aria-hidden
        className="flex h-1 w-full overflow-hidden"
        style={{
          background:
            "repeating-linear-gradient(90deg, var(--bauhaus-red) 0 33.33%, var(--bauhaus-blue) 33.33% 66.66%, var(--bauhaus-yellow) 66.66% 100%)",
        }}
      />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <div>
            <div className="flex items-center gap-2.5">
              <Logo className="h-8 w-8" />
              <span className="font-display text-base font-bold tracking-tight">
                Navia
              </span>
            </div>
            <p className="mt-3 max-w-[15rem] text-sm leading-relaxed text-ink-faint">
              {t("footer.description")}
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.titleKey}>
              <h3 className="text-xs font-semibold tracking-[0.2em] text-ink-faint uppercase">
                {t(col.titleKey)}
              </h3>
              <ul className="mt-3 space-y-2.5">
                {col.links.map((l) => (
                  <li key={`${col.titleKey}:${l.labelKey}`}>
                    <Link
                      href={l.href}
                      className="text-sm text-ink-soft transition-colors hover:text-ink"
                    >
                      {t(l.labelKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 text-xs text-ink-faint">
          <p>© {new Date().getFullYear()} Navia Academy</p>
          <p className="flex items-center gap-2" aria-hidden>
            <span className="inline-flex h-2 w-2 rounded-full bg-bauhaus-red" />
            <span className="inline-flex h-2 w-2 rounded-full bg-bauhaus-blue" />
            <span className="inline-flex h-2 w-2 rounded-full bg-bauhaus-yellow" />
          </p>
        </div>
      </div>
    </footer>
  )
}
