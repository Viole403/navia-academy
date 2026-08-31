"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { AuthShell, GoogleIcon } from "@/components/auth/auth-shell"
import { Button, Input } from "@/components/ui"
import { useAuth } from "@/lib/auth-context"
import { useTranslation } from "@/i18n/locale-context"

const schema = z
  .object({
    name: z.string().min(2, "Enter your name"),
    email: z.email("Enter a valid email"),
    password: z.string().min(8, "Minimum 8 characters"),
    confirm: z.string(),
    terms: z.boolean().refine((v) => v, "You must accept the terms"),
    newsletter: z.boolean().optional(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  })

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { signUp, signInWithGoogle } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { terms: false, newsletter: false },
  })

  const onSubmit = async (data: FormData) => {
    setError(null)
    try {
      await signUp(data.name, data.email, data.password)
      router.push("/dashboard/onboarding")
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("auth.couldNotCreate")
      const code = (err as { code?: string } | null)?.code ?? ""
      setError(
        code === "EMAIL_TAKEN" || msg.includes("email already registered")
          ? t("auth.accountExists")
          : msg
      )
    }
  }

  return (
    <AuthShell
      title={t("auth.createAccount")}
      subtitle={t("auth.createAccountSubtitle")}
    >
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
          label={t("auth.name")}
          autoComplete="name"
          placeholder={t("auth.yourName")}
          error={errors.name?.message}
          {...register("name")}
        />
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
          autoComplete="new-password"
          placeholder={t("auth.minChars")}
          error={errors.password?.message}
          {...register("password")}
        />
        <Input
          label={t("auth.confirmPassword")}
          type="password"
          autoComplete="new-password"
          placeholder={t("auth.repeatPassword")}
          error={errors.confirm?.message}
          {...register("confirm")}
        />

        <div className="space-y-2 pt-1">
          <label className="flex items-start gap-2.5 text-sm text-ink-soft">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
              {...register("terms")}
            />
            <span>
              {t("auth.acceptTerms")}{" "}
              <Link
                href="/terms"
                className="text-accent hover:underline"
                target="_blank"
              >
                {t("auth.termsOfService")}
              </Link>{" "}
              {t("auth.andThe")}{" "}
              <Link
                href="/privacy"
                className="text-accent hover:underline"
                target="_blank"
              >
                {t("auth.privacyPolicy")}
              </Link>
              .
            </span>
          </label>
          {errors.terms && (
            <p role="alert" className="text-xs text-danger">
              {errors.terms.message}
            </p>
          )}
          <label className="flex items-start gap-2.5 text-sm text-ink-soft">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
              {...register("newsletter")}
            />
            <span>{t("auth.newsletter")}</span>
          </label>
        </div>

        <Button type="submit" className="w-full" loading={isSubmitting}>
          Create account and get started
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
        <GoogleIcon /> Continue with Google
      </Button>

      <p className="mt-6 text-center text-sm text-ink-faint">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
