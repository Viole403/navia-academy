"use client"

import { useState } from "react"
import { CheckCircle2, Rocket } from "lucide-react"
import { Button, Input, Textarea, Select } from "@/components/ui"
import { NaviaChip } from "@/components/marketing/navia-chip"
import { Reveal } from "@/components/ui"
import { useTranslation } from "@/i18n/locale-context"
import { api } from "@/lib/api"

export default function ContributorApplyPage() {
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { t } = useTranslation()

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0" aria-hidden>
        <div className="absolute top-[-18%] left-[-14%] h-[28rem] w-[28rem] rounded-full bg-[var(--bauhaus-red)]/20 blur-3xl" />
        <div className="absolute top-[10%] right-[-12%] h-[26rem] w-[26rem] rounded-full bg-[var(--bauhaus-blue)]/20 blur-3xl" />
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
            {t("apply.title")}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
            {t("apply.subtitle")}
          </p>
        </Reveal>

        <div className="mt-10 grid items-start gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <Reveal>
            <div className="shadow-neo border border-line bg-sunken">
              {sent ? (
                <div className="p-8 text-center sm:p-12">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-accent" />
                  <h2 className="mt-4 font-display text-xl font-semibold text-ink">
                    {t("apply.successTitle")}
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
                    {t("apply.successText")}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-6"
                    onClick={() => setSent(false)}
                  >
                    {t("apply.submitAnother")}
                  </Button>
                </div>
              ) : (
                <form
                  className="space-y-5 p-6 sm:p-8"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    setSending(true)
                    setError(null)
                    const form = new FormData(e.currentTarget)
                    try {
                      await api("/api/v1/contributors/apply", {
                        method: "POST",
                        body: JSON.stringify({
                          name: form.get("name"),
                          email: form.get("email"),
                          contribution_area: form.get("contribution_area"),
                          mandarin_level: form.get("mandarin_level"),
                          portfolio: form.get("portfolio") || null,
                          message: form.get("message") || null,
                        }),
                      })
                      setSent(true)
                    } catch {
                      setError(t("apply.error"))
                    } finally {
                      setSending(false)
                    }
                  }}
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Input
                      name="name"
                      label={t("apply.name")}
                      required
                      placeholder={t("apply.name")}
                    />
                    <Input
                      name="email"
                      type="email"
                      label={t("apply.email")}
                      required
                      placeholder="you@email.com"
                    />
                  </div>
                  <Select
                    name="contribution_area"
                    label={t("apply.field")}
                    defaultValue="content"
                  >
                    <option value="content">{t("apply.field.content")}</option>
                    <option value="frontend">
                      {t("apply.field.frontend")}
                    </option>
                    <option value="backend">{t("apply.field.backend")}</option>
                    <option value="audio">{t("apply.field.audio")}</option>
                    <option value="quiz">{t("apply.field.quiz")}</option>
                    <option value="material">
                      {t("apply.field.material")}
                    </option>
                    <option value="translation">
                      {t("apply.field.translation")}
                    </option>
                    <option value="uiux">{t("apply.field.uiux")}</option>
                    <option value="other">{t("apply.field.other")}</option>
                  </Select>
                  <Select
                    name="mandarin_level"
                    label={t("apply.languageLevel")}
                    defaultValue="intermediate"
                  >
                    <option value="beginner">
                      {t("apply.languageLevel.beginner")}
                    </option>
                    <option value="intermediate">
                      {t("apply.languageLevel.intermediate")}
                    </option>
                    <option value="advanced">
                      {t("apply.languageLevel.advanced")}
                    </option>
                    <option value="fluent">
                      {t("apply.languageLevel.fluent")}
                    </option>
                  </Select>
                  <Input
                    name="portfolio"
                    label={t("apply.portfolio")}
                    placeholder="https://…"
                  />
                  <Textarea
                    name="message"
                    label={t("apply.message")}
                    rows={5}
                    placeholder="…"
                  />
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <div className="flex justify-end">
                    <Button type="submit" disabled={sending}>
                      {sending ? "…" : t("apply.submit")}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="shadow-neo border border-line bg-sunken">
              <div className="border-b border-line p-6">
                <span className="bauhaus-chip bauhaus-chip-red inline-flex">
                  <Rocket className="h-4 w-4" />
                </span>
                <h2 className="mt-5 font-display text-xl font-semibold tracking-tight text-ink">
                  {t("contributors.cta")}
                </h2>
              </div>
              <p className="p-6 pt-4 text-sm leading-relaxed text-ink-soft">
                {t("contributors.emptySubtitle")}
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
