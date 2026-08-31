"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Menu, Moon, Sun, X } from "lucide-react"
import { useAuth, roleHomePath } from "@/lib/auth-context"
import { useSettings } from "@/stores/settings"
import { useTranslation } from "@/i18n/locale-context"
import { Button } from "@/components/ui"
import { Logo } from "@/components/ui/logo"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/features", label: "nav.features", key: "features" },
  { href: "/about", label: "nav.about", key: "about" },
  { href: "/#faq", label: "nav.faq", key: "faq" },
  { href: "/contact", label: "nav.contact", key: "contact" },
] as const

export function SiteHeader({
  hideAuthButtons = false,
}: {
  hideAuthButtons?: boolean
}) {
  const [open, setOpen] = useState(false)
  const { user, loading } = useAuth()
  const { mode, set } = useSettings()
  const { t, locale, setLocale } = useTranslation()
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === "/#faq" ? pathname === "/" : pathname === href

  const items = NAV.map((n) => ({ href: n.href, label: t(n.label) }))

  const langSwitch = (
    <div className="flex gap-0.5 rounded-lg border border-line bg-sunken p-0.5">
      {(["en", "id"] as const).map((l) => (
        <button
          key={l}
          onClick={() => {
            setLocale(l)
            setOpen(false)
          }}
          aria-pressed={locale === l}
          className={cn(
            "inline-flex min-h-10 cursor-pointer items-center rounded-md px-3 text-xs font-medium transition-colors",
            locale === l
              ? "bg-raised text-ink shadow-sm"
              : "text-ink-faint hover:text-ink"
          )}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )

  const themeToggle = (
    <button
      onClick={() => set({ mode: mode === "light" ? "dark" : "light" })}
      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-hover hover:text-ink"
      aria-label={
        mode === "light" ? "Switch to dark mode" : "Switch to light mode"
      }
    >
      {mode === "light" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </button>
  )

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
      {/* Bauhaus tricolor hairline */}
      <div
        aria-hidden
        className="flex h-1 w-full overflow-hidden"
        style={{
          background:
            "repeating-linear-gradient(90deg, var(--bauhaus-red) 0 33.33%, var(--bauhaus-blue) 33.33% 66.66%, var(--bauhaus-yellow) 66.66% 100%)",
        }}
      />
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Navia, home"
        >
          <Logo className="h-9 w-9" />
          <span className="font-display text-lg font-bold tracking-tight">
            Navia
          </span>
        </Link>

        <nav
          className="hidden items-center gap-6 md:flex"
          aria-label="Main navigation"
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className="text-sm text-ink-soft transition-colors hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {langSwitch}
          {themeToggle}
          {loading ? (
            hideAuthButtons ? null : (
              <span
                className="h-8 w-24 animate-pulse rounded-lg bg-hover"
                aria-hidden
              />
            )
          ) : user ? (
            <Link href={roleHomePath(user.role)}>
              <Button size="sm">{t("nav.dashboard")}</Button>
            </Link>
          ) : hideAuthButtons ? null : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-ink-soft hover:text-ink"
              >
                {t("auth.login")}
              </Link>
              <Link href="/register">
                <Button size="sm">{t("auth.register")}</Button>
              </Link>
            </>
          )}
        </div>

        <button
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink-soft hover:bg-hover md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav
          className="border-t border-line bg-bg px-4 py-4 md:hidden"
          aria-label="Mobile navigation"
        >
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(item.href) ? "page" : undefined}
                className="py-1.5 text-sm text-ink-soft"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center gap-2 border-t border-line pt-4">
              {langSwitch}
              {themeToggle}
              {loading ? (
                hideAuthButtons ? null : (
                  <span
                    className="h-8 w-24 animate-pulse rounded-lg bg-hover"
                    aria-hidden
                  />
                )
              ) : user ? (
                <Link
                  href={roleHomePath(user.role)}
                  onClick={() => setOpen(false)}
                >
                  <Button size="sm">{t("nav.dashboard")}</Button>
                </Link>
              ) : hideAuthButtons ? null : (
                <Link href="/register" onClick={() => setOpen(false)}>
                  <Button size="sm">{t("auth.register")}</Button>
                </Link>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}
