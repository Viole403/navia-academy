"use client"

import Link from "next/link"
import { Cpu, HeartHandshake, Users } from "lucide-react"
import { NaviaChip } from "@/components/marketing/navia-chip"
import { Float3D } from "@/components/marketing/tilt-card"
import { Reveal } from "@/components/ui"
import { useTranslation } from "@/i18n/locale-context"

export default function AboutPage() {
  const { t } = useTranslation()
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0" aria-hidden>
        <div className="absolute top-[-18%] left-[-14%] h-[28rem] w-[28rem] rounded-full bg-[var(--bauhaus-red)]/20 blur-3xl" />
        <div className="absolute top-[12%] right-[-12%] h-[26rem] w-[26rem] rounded-full bg-[var(--bauhaus-blue)]/20 blur-3xl" />
        <div className="absolute bottom-[-28%] left-[35%] h-80 w-80 rounded-full bg-[var(--bauhaus-yellow)]/20 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(20,22,27,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(20,22,27,0.045)_1px,transparent_1px)] bg-[size:56px_56px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 md:pt-24 md:pb-28">
        <Reveal>
          <span className="bauhaus-chip bauhaus-chip-ink inline-flex items-center gap-2">
            <NaviaChip className="h-4 w-6" />
            {t("nav.about")}
          </span>
          <h1 className="text-display-xl mt-6 max-w-3xl font-display leading-[0.98] tracking-tight text-ink">
            {t("about.title")}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
            {t("about.subtitle")}
          </p>
        </Reveal>

        <div
          className="mt-12 grid gap-5 md:grid-cols-2"
          style={{ perspective: 1000 }}
        >
          <Reveal>
            <Float3D className="h-full" tilt={7}>
              <div className="shadow-neo h-full border border-line bg-sunken">
                <div className="border-b border-line p-6">
                  <span className="bauhaus-chip bauhaus-chip-yellow inline-flex">
                    <HeartHandshake className="h-4 w-4" />
                  </span>
                  <h2 className="mt-5 font-display text-xl font-semibold tracking-tight text-ink">
                    {t("about.mission")}
                  </h2>
                </div>
                <p className="p-6 pt-4 text-sm leading-relaxed text-ink-soft">
                  {t("about.missionText")}
                </p>
              </div>
            </Float3D>
          </Reveal>

          <Reveal delay={0.08}>
            <Float3D className="h-full" tilt={7}>
              <div className="shadow-neo h-full border border-line bg-sunken">
                <div className="border-b border-line p-6">
                  <span className="bauhaus-chip bauhaus-chip-blue inline-flex">
                    <Cpu className="h-4 w-4" />
                  </span>
                  <h2 className="mt-5 font-display text-xl font-semibold tracking-tight text-ink">
                    {t("about.tech")}
                  </h2>
                </div>
                <p className="p-6 pt-4 text-sm leading-relaxed text-ink-soft">
                  {t("about.techText")}
                </p>
              </div>
            </Float3D>
          </Reveal>

          <Reveal>
            <Float3D className="h-full" tilt={7}>
              <div className="shadow-neo h-full border border-line bg-sunken">
                <div className="border-b border-line p-6">
                  <span className="bauhaus-chip bauhaus-chip-red inline-flex">
                    <Users className="h-4 w-4" />
                  </span>
                  <h2 className="mt-5 font-display text-xl font-semibold tracking-tight text-ink">
                    {t("about.contributors")}
                  </h2>
                </div>
                <p className="p-6 pt-4 text-sm leading-relaxed text-ink-soft">
                  {t("about.contributorsText")}
                </p>
                <div className="flex px-6 pb-6">
                  <Link
                    href="/contributors"
                    className="inline-flex items-center justify-center gap-2 rounded-[var(--radius)] border border-line bg-raised px-5 py-2.5 text-sm font-medium text-ink transition-transform hover:-translate-y-0.5"
                  >
                    {t("about.seeContributors")}
                  </Link>
                </div>
              </div>
            </Float3D>
          </Reveal>

          <Reveal delay={0.08}>
            <Float3D className="h-full" tilt={7}>
              <div className="shadow-neo h-full border border-line bg-sunken">
                <div className="border-b border-line p-6">
                  <span className="bauhaus-chip bauhaus-chip-ink inline-flex">
                    <HeartHandshake className="h-4 w-4" />
                  </span>
                  <h2 className="mt-5 font-display text-xl font-semibold tracking-tight text-ink">
                    {t("about.support")}
                  </h2>
                </div>
                <p className="p-6 pt-4 text-sm leading-relaxed text-ink-soft">
                  {t("about.supportText")}
                </p>
                <div className="flex px-6 pb-6">
                  <Link
                    href="/support"
                    className="inline-flex items-center justify-center gap-2 rounded-[var(--radius)] bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform hover:-translate-y-0.5"
                  >
                    {t("about.seeSupport")}
                  </Link>
                </div>
              </div>
            </Float3D>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
