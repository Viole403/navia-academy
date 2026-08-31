"use client"

import Link from "next/link"
import { TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui"
import { useAuth, roleHomePath } from "@/lib/auth-context"
import { useTranslation } from "@/i18n/locale-context"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const ctaLabel =
    user?.role === "admin"
      ? t("notFound.admin")
      : user?.role === "contributor" || user?.role === "reviewer"
        ? t("notFound.contributor")
        : t("nav.dashboard")
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 text-center">
      <TriangleAlert className="h-16 w-16 text-warn" aria-hidden />
      <h1 className="mt-6 font-display text-3xl font-bold">
        {t("error.title")}
      </h1>
      <p className="mt-2 max-w-sm text-ink-soft">{t("error.description")}</p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-ink-faint">
          Ref: {error.digest}
        </p>
      )}
      <div className="mt-8 flex gap-3">
        <Button onClick={reset}>{t("common.tryAgain")}</Button>
        <Link href="/">
          <Button variant="outline">{t("notFound.home")}</Button>
        </Link>
        {user ? (
          <Link href={roleHomePath(user.role)}>
            <Button variant="outline">{ctaLabel}</Button>
          </Link>
        ) : (
          <Link href="/login">
            <Button variant="outline">{t("auth.login")}</Button>
          </Link>
        )}
      </div>
    </main>
  )
}
