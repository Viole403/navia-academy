"use client"

import { useState } from "react"
import { CheckCircle2, ShieldAlert } from "lucide-react"
import { Button, Input, Textarea, Select } from "@/components/ui"
import { NaviaChip } from "@/components/marketing/navia-chip"
import { Reveal } from "@/components/ui"
import { useTranslation } from "@/i18n/locale-context"

export default function ContactPage() {
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
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
            {t("nav.contact")}
          </span>
          <h1 className="text-display-xl mt-6 max-w-3xl font-display leading-[0.98] tracking-tight text-ink">
            {t("contact.title")}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
            {t("contact.subtitle")}
          </p>
        </Reveal>

        <div className="mt-10 grid items-start gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <Reveal>
            <div className="shadow-neo border border-line bg-sunken">
              {sent ? (
                <div className="p-8 text-center sm:p-12">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-accent" />
                  <h2 className="mt-4 font-display text-xl font-semibold text-ink">
                    {t("contact.sentTitle")}
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
                    {t("contact.sentText")}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-6"
                    onClick={() => setSent(false)}
                  >
                    {t("contact.sendAnother")}
                  </Button>
                </div>
              ) : (
                <form
                  className="space-y-5 p-6 sm:p-8"
                  onSubmit={(e) => {
                    e.preventDefault()
                    setSending(true)
                    window.setTimeout(() => {
                      setSending(false)
                      setSent(true)
                    }, 600)
                  }}
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Input
                      name="name"
                      label={t("contact.name")}
                      required
                      placeholder={t("contact.name")}
                    />
                    <Input
                      name="email"
                      type="email"
                      label={t("contact.email")}
                      required
                      placeholder="you@email.com"
                    />
                  </div>
                  <Select
                    name="subject"
                    label={t("contact.subject")}
                    defaultValue="support"
                  >
                    <option value="support">{t("contact.support")}</option>
                    <option value="content">{t("contact.content")}</option>
                    <option value="suggestion">
                      {t("contact.suggestion")}
                    </option>
                    <option value="contributor">
                      {t("contact.contributor")}
                    </option>
                    <option value="sponsor">{t("contact.sponsor")}</option>
                    <option value="account">{t("contact.account")}</option>
                    <option value="other">{t("contact.other")}</option>
                  </Select>
                  <Textarea
                    name="message"
                    label={t("contact.message")}
                    required
                    rows={5}
                    placeholder="…"
                  />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={sending}>
                      {sending ? "…" : t("contact.send")}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="shadow-neo border border-line bg-sunken">
              <div className="border-b border-line p-6">
                <span className="bauhaus-chip bauhaus-chip-yellow inline-flex">
                  <ShieldAlert className="h-4 w-4" />
                </span>
                <h2 className="mt-5 font-display text-xl font-semibold tracking-tight text-ink">
                  {t("contact.errorsTitle")}
                </h2>
              </div>
              <p className="p-6 pt-4 text-sm leading-relaxed text-ink-soft">
                {t("contact.errorsText")}
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
