"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { AuthShell, GoogleIcon } from "@/components/auth/auth-shell"
import { Button, Input } from "@/components/ui"
import { useAuth, roleHomePath } from "@/lib/auth-context"
import { useTranslation } from "@/i18n/locale-context"
import type { TranslationKey } from "@/i18n/keys"

const schema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
})

type FormData = z.infer<typeof schema>

function friendlyError(
  err: unknown,
  t: (key: TranslationKey) => string
): string {
  const msg = err instanceof Error ? err.message : String(err)
  const code = (err as { code?: string } | null)?.code ?? ""
  if (
    code === "INVALID_CREDENTIALS" ||
    msg.includes("invalid email or password")
  )
    return t("auth.errInvalidCredentials")
  if (code === "TOKEN_EXPIRED" || code === "UNAUTHORIZED")
    return t("auth.errSessionExpired")
  if (msg.includes("too-many-requests") || msg.includes("rate limit"))
    return t("auth.errTooManyAttempts")
  if (msg.includes("network") || msg.includes("fetch failed"))
    return t("auth.errNetwork")
  return msg || t("auth.errSignIn")
}

export default function LoginPage() {
  const router = useRouter()
  const { signIn, signInWithGoogle } = useAuth()
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setError(null)
    try {
      const u = await signIn(data.email, data.password)
      router.push(roleHomePath(u?.role ?? "student"))
    } catch (err) {
      setError(friendlyError(err, t))
    }
  }

  return (
    <AuthShell title={t("auth.login")} subtitle={t("auth.loginSubtitle")}>
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-danger/40 bg-accent-soft px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label={t("auth.email")}
          type="email"
          autoComplete="email"
          placeholder="you@email.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label={t("auth.password")}
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register("password")}
        />
        <div className="flex justify-end">
          <Link
            href="/recover"
            className="text-xs font-medium text-accent hover:underline"
          >
            {t("auth.forgotPassword")}
          </Link>
        </div>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          {t("auth.login")}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs text-ink-faint">o</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={async () => {
          setError(null)
          await signInWithGoogle()
        }}
      >
        <GoogleIcon /> {t("auth.continueWithGoogle")}
      </Button>

      <p className="mt-4 rounded-lg bg-sunken px-3 py-2 text-xs text-ink-faint">
        {t("auth.demoTitle")} <strong>demo@navia.academy</strong> /{" "}
        <strong>navia-demo</strong>
      </p>

      <p className="mt-6 text-center text-sm text-ink-faint">
        {t("auth.noAccountYet")}{" "}
        <Link
          href="/register"
          className="font-medium text-accent hover:underline"
        >
          {t("auth.register")}
        </Link>
      </p>
    </AuthShell>
  )
}
