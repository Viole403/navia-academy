"use client"

import Link from "next/link"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2 } from "lucide-react"
import { AuthShell } from "@/components/auth/auth-shell"
import { Button, Input } from "@/components/ui"
import { useAuth } from "@/lib/auth-context"
import { useTranslation } from "@/i18n/locale-context"

const schema = z.object({ email: z.email("Enter a valid email") })
type FormData = z.infer<typeof schema>

export default function RecoverPage() {
  const { resetPassword } = useAuth()
  const { t } = useTranslation()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setError(null)
    try {
      await resetPassword(data.email)
      setSent(true)
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : t("auth.couldNotSendEmail")
      setError(msg.includes("user-not-found") ? t("auth.noAccountFound") : msg)
    }
  }

  return (
    <AuthShell
      title={t("auth.resetPassword")}
      subtitle={t("auth.resetSubtitle")}
    >
      {sent ? (
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
          <p className="mt-4 text-sm text-ink-soft">
            {t("auth.checkYourEmail")}
          </p>
          <Link href="/login">
            <Button variant="outline" className="mt-6 w-full">
              {t("auth.backToSignIn")}
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <p
              role="alert"
              className="mb-4 rounded-lg border border-warn/40 bg-sunken px-3 py-2 text-sm text-warn"
            >
              {error}
            </p>
          )}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <Input
              label={t("auth.email")}
              type="email"
              autoComplete="email"
              placeholder="you@email.com"
              error={errors.email?.message}
              {...register("email")}
            />
            <Button type="submit" className="w-full" loading={isSubmitting}>
              {t("auth.sendResetLink")}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-ink-faint">
            <Link
              href="/login"
              className="font-medium text-accent hover:underline"
            >
              {t("auth.backToSignIn")}
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  )
}
