"use client"

import Link from "next/link"
import { MapPinOff } from "lucide-react"
import { Button } from "@/components/ui"
import { useAuth, roleHomePath } from "@/lib/auth-context"
import { useTranslation } from "@/i18n/locale-context"

export default function NotFound() {
  const { user, loading } = useAuth()
  const { t } = useTranslation()
  const ctaLabel =
    user?.role === "admin"
      ? t("notFound.admin")
      : user?.role === "contributor" || user?.role === "reviewer"
        ? t("notFound.contributor")
        : t("nav.dashboard")

  return (
    <main className="paper-texture flex min-h-screen flex-col items-center justify-center bg-bg px-4 text-center">
      <MapPinOff className="h-16 w-16 text-ink-faint" aria-hidden />
      <h1 className="mt-6 font-display text-4xl font-bold">
        404 · {t("error.notFound")}
      </h1>
      <p className="mt-2 max-w-sm text-ink-soft">{t("error.notFoundDesc")}</p>
      <div className="mt-8 flex gap-3">
        <Link href="/">
          <Button variant="outline">{t("notFound.home")}</Button>
        </Link>
        {loading ? null : user ? (
          <Link href={roleHomePath(user.role)}>
            <Button>{ctaLabel}</Button>
          </Link>
        ) : (
          <Link href="/login">
            <Button>{t("auth.login")}</Button>
          </Link>
        )}
      </div>
    </main>
  )
}
