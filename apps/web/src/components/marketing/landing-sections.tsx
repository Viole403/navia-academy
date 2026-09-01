"use client"
import Link from "next/link"
import Image from "next/image"
import { Fragment, useEffect, useMemo, useState } from "react"
import { Volume2, ArrowRight, Loader2 } from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { Faq } from "@/components/marketing/faq"
import { HanziPractice } from "@/components/dashboard/hanzi-practice"
import { Highlighter } from "@/components/marketing/highlighter"
import { DriftOrb, Float3D } from "@/components/marketing/tilt-card"
import {
  Reveal,
  ScrollVelocityContainer,
  ScrollVelocityRow,
  AnimatedGridPattern,
} from "@/components/ui"
import { play, speak } from "@/lib/audio"
import { EXAM_LANGS, type VocabWord } from "@/lib/data-client"
import { community, type TestimonialItem } from "@/lib/api"
import { useTranslation } from "@/i18n/locale-context"
import type { TranslationKey } from "@/i18n/keys"
import { THEMES, useSettings } from "@/stores/settings"
import { cn } from "@/lib/utils"

/* ---------------------------------- Labs ---------------------------------- */

const GRADES = [
  { id: "easy", color: "var(--accent)" },
  { id: "hard", color: "var(--warn)" },
  { id: "forgot", color: "var(--danger)" },
] as const
type GradeId = (typeof GRADES)[number]["id"]

const THEME_SWATCH: Record<
  string,
  { light: string; dark: string; accent: string }
> = {
  bauhaus: { light: "#f4f4f1", dark: "#14161b", accent: "#2b54e5" },
  scholar: { light: "#f7f3ea", dark: "#16130f", accent: "#b3382c" },
  ink: { light: "#ecebe5", dark: "#131210", accent: "#c8503f" },
  jade: { light: "#f1f3ee", dark: "#121a16", accent: "#2e7359" },
  midnight: { light: "#eef1f6", dark: "#0e1420", accent: "#5aa8c9" },
  paper: { light: "#f5efe2", dark: "#191511", accent: "#8c4a2f" },
  dusk: { light: "#f3f0f7", dark: "#14101f", accent: "#6b4fd8" },
  focus: { light: "#fafafa", dark: "#141414", accent: "#5b6470" },
}
type SrsCard = {
  text: string
  romanization?: string
  gloss: string
  key: string
}

function SrsDeck({
  active,
  initialVocab = [],
  preview = {},
}: {
  active: string
  initialVocab?: VocabWord[]
  preview?: Record<string, VocabWord[]>
}) {
  const { t, locale } = useTranslation()
  const [grade, setGrade] = useState<GradeId | null>(null)
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const activeLang = (EXAM_LANGS[active] ?? "zh") as "zh" | "de" | "en" | "ja"
  const cards = useMemo<SrsCard[]>(() => {
    const words =
      preview[activeLang] ?? (activeLang === "zh" ? initialVocab : [])
    const sample = words.slice(0, 6).map((w) => ({
      text: w.text,
      romanization: w.romanization,
      gloss:
        locale === "id" && w.translation_id ? w.translation_id : w.translation,
      key: w.audio ?? `v:${w.id}`,
    }))
    if (sample.length) return sample
    return [
      {
        text: "ma",
        romanization: "mǎ",
        gloss: t("landing.labReview"),
        key: "char:c-ma3",
      },
      {
        text: "men",
        romanization: "men",
        gloss: t("landing.labTone"),
        key: "char:c-men",
      },
    ]
  }, [activeLang, initialVocab, preview, locale, t])

  const deck = cards.slice(0, 3)
  const gradeIds = GRADES.map((g) => g.id)
  const activeIndex = grade === null ? 0 : gradeIds.indexOf(grade)
  const tint = grade
    ? (GRADES.find((g) => g.id === grade)?.color ?? "var(--line)")
    : "var(--line)"

  return (
    <div className="relative h-52">
      {deck.map((c, i) => (
        <div
          key={c.key}
          aria-hidden={i !== activeIndex}
          inert={i !== activeIndex}
          className={cn(
            "shadow-neo absolute inset-x-4 top-0 flex h-40 flex-col rounded-2xl border bg-raised p-5 transition-all duration-500",
            i === activeIndex
              ? "z-10 opacity-100"
              : "z-0 translate-y-4 opacity-0"
          )}
          style={i === activeIndex ? { borderColor: tint } : undefined}
        >
          <div className="flex items-start justify-between">
            <p className="hanzi text-4xl leading-none text-ink">{c.text}</p>
            <button
              onClick={() =>
                play(c.key, {
                  onLoadingChange: (l) => setLoadingKey(l ? c.key : null),
                  onError: () => speak(c.text),
                })
              }
              disabled={loadingKey === c.key}
              aria-label={t("landing.labToneListen")}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-sunken text-ink-soft transition-colors hover:bg-hover disabled:opacity-60"
            >
              {loadingKey === c.key ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="mt-2 text-sm text-ink-faint">
            {c.romanization ? `${c.romanization} — ` : ""}
            {c.gloss}
          </p>
          <p className="mt-auto text-xs font-medium tracking-widest text-ink-faint uppercase">
            {grade ?? t("landing.heroPanelHint")}
          </p>
        </div>
      ))}
      <div className="absolute right-0 bottom-0 left-0 z-20 flex gap-2 px-2">
        {GRADES.map((g) => (
          <button
            key={g.id}
            onClick={() => setGrade(g.id)}
            aria-pressed={grade === g.id}
            className={cn(
              "flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-xl border px-2 text-xs font-semibold transition-colors",
              grade === g.id
                ? "border-transparent text-white"
                : "border-line bg-sunken hover:bg-hover"
            )}
            style={grade === g.id ? { background: g.color } : undefined}
          >
            {t(
              `landing.labGrade${g.id.charAt(0).toUpperCase()}${g.id.slice(1)}` as TranslationKey
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function ToneLab() {
  const { t } = useTranslation()
  const [step, setStep] = useState<"listen" | "answer">("listen")
  const [picked, setPicked] = useState<string | null>(null)
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const correct = picked === "3"
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-line bg-raised p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium tracking-widest text-ink-faint uppercase">
          {t("landing.labTone")}
        </p>
        <span className="seal-mark h-5 w-5 text-xs" aria-hidden>
          音
        </span>
      </div>
      <div className="flex items-center gap-4 py-2">
        <p className="hanzi text-5xl leading-none text-ink">马</p>
        <button
          onClick={() => {
            play("char:c-ma3", {
              onLoadingChange: (l) => setLoadingKey(l ? "ma" : null),
              onError: () => speak("马"),
            })
            setStep("answer")
          }}
          disabled={loadingKey === "ma"}
          aria-label={t("landing.labToneListen")}
          className="ml-auto flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-accent text-accent-ink transition-colors hover:bg-accent-strong disabled:opacity-60"
        >
          {loadingKey === "ma" ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <Volume2 className="h-5 w-5" />
          )}
        </button>
      </div>
      {step !== "listen" && (
        <div>
          <p className="mb-2 text-xs text-ink-faint">
            {t("landing.labToneDesc")}
          </p>
          <div className="flex gap-2">
            {["3", "2", "4"].map((tone, i) => (
              <button
                key={tone}
                onClick={() => setPicked(tone)}
                disabled={picked !== null}
                aria-pressed={picked === tone}
                className={cn(
                  "flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors disabled:cursor-default",
                  picked === null &&
                    "border border-line bg-sunken hover:bg-hover",
                  picked !== null &&
                    tone === "3" &&
                    "bg-accent text-accent-ink",
                  picked !== null &&
                    tone !== "3" &&
                    picked === tone &&
                    "border border-danger bg-sunken text-danger",
                  picked !== null &&
                    tone !== "3" &&
                    picked !== tone &&
                    "border border-line bg-sunken opacity-60"
                )}
              >
                m{i === 0 ? "ǎ" : i === 1 ? "á" : "à"}
              </button>
            ))}
          </div>
          {picked !== null && (
            <div className="mt-3 flex items-start justify-between gap-3">
              <p
                className={cn(
                  "text-xs leading-relaxed",
                  correct ? "text-jade" : "text-danger"
                )}
                role="status"
              >
                {correct
                  ? t("landingDemo.correct")
                  : t("landingDemo.incorrect")}
              </p>
              {!correct && (
                <button
                  onClick={() => setPicked(null)}
                  className="shrink-0 cursor-pointer text-xs font-semibold text-accent hover:text-accent-strong"
                >
                  {t("landingDemo.tryAgain")}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** Character shown in the writing demo — reuses the same "马" used in ToneLab / SrsDeck fallback for a consistent narrative across the three labs. */
const WRITING_CHAR = "马"

function WritingLab() {
  const { t } = useTranslation()
  return (
    <div className="flex h-full flex-col items-center rounded-2xl border border-line bg-raised p-5">
      <p className="self-start text-xs font-medium tracking-widest text-ink-faint uppercase">
        {t("landing.labWriting")}
      </p>
      <p className="mt-2 self-start text-sm leading-relaxed text-ink-soft">
        {t("landing.labWritingDesc")}
      </p>
      <div className="mt-4 flex flex-1 items-center">
        <HanziPractice char={WRITING_CHAR} size={120} />
      </div>
    </div>
  )
}

function Labs({
  active,
  initialVocab = [],
  preview = {},
}: {
  active: string
  initialVocab?: VocabWord[]
  preview?: Record<string, VocabWord[]>
}) {
  const { t } = useTranslation()
  const activeLangHint = (EXAM_LANGS[active] ?? "zh") !== "zh"
  return (
    <section className="border-y border-line-strong bg-sunken/40">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="bauhaus-chip bauhaus-chip-ink">
              {t("landing.heroPanel")}
            </span>
            <h2 className="text-display-lg mt-4 font-display text-ink">
              {t("landing.labsTitle")}
            </h2>
            {activeLangHint && (
              <p className="mt-3 text-sm text-ink-faint">
                {t("landing.mandarinSample")}
              </p>
            )}
            <p className="mt-4 text-lg text-ink-soft">
              {t("landing.labsSubtitle")}
            </p>
          </Reveal>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <Float3D tilt={5}>
              <SrsDeck
                active={active}
                initialVocab={initialVocab}
                preview={preview}
              />
            </Float3D>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <Float3D tilt={5}>
              <ToneLab />
            </Float3D>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <Float3D tilt={5}>
              <WritingLab />
            </Float3D>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------- How it works ---------------------------- */

function HowItWorks() {
  const { t } = useTranslation()
  const steps = [1, 2, 3, 4].map((n) => ({
    title: t(`how.step${n}` as TranslationKey),
    desc: t(`how.desc${n}` as TranslationKey),
  }))
  return (
    <section id="how-it-works" className="scroll-mt-24">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="bauhaus-chip bauhaus-chip-ink">
              {t("how.badge")}
            </span>
            <h2 className="text-display-lg mt-4 font-display text-ink">
              {t("how.title")}
            </h2>
          </Reveal>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-4">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 80}>
              <div
                className="relative h-full rounded-2xl border border-line bg-raised p-5"
                style={{ transform: `translateY(${(i % 2) * 10}px)` }}
              >
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-xl font-display text-lg font-bold shadow-[var(--shadow-neo)]"
                  style={{
                    background: [
                      "var(--bauhaus-red)",
                      "var(--bauhaus-blue)",
                      "var(--bauhaus-yellow)",
                      "var(--bauhaus-red)",
                    ][i],
                    color:
                      i === 2 ? "var(--bauhaus-black)" : "var(--bauhaus-white)",
                  }}
                >
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg font-bold text-ink">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {s.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------- Testimonials ------------------------------ */

// TestimonialItem type exported from @/lib/api.

function TestimonialsColumn({
  className,
  items,
  duration,
}: {
  className?: string
  items: TestimonialItem[]
  duration?: number
}) {
  const reduce = useReducedMotion()
  return (
    <div className={className}>
      <motion.ul
        animate={reduce ? undefined : { y: "-50%" }}
        transition={
          reduce
            ? undefined
            : {
                duration: duration || 15,
                repeat: Infinity,
                ease: "linear",
                repeatType: "loop",
              }
        }
        className="m-0 flex list-none flex-col gap-6 p-0 pb-6"
      >
        {[0, 1].map((copy) => (
          <Fragment key={copy}>
            {items.map((tm, i) => (
              <motion.li
                key={`${copy}-${i}`}
                aria-hidden={copy === 1 ? "true" : "false"}
                tabIndex={copy === 1 ? -1 : 0}
                whileHover={
                  reduce
                    ? undefined
                    : {
                        scale: 1.03,
                        y: -8,
                        transition: {
                          type: "spring",
                          stiffness: 400,
                          damping: 17,
                        },
                      }
                }
                whileFocus={
                  reduce
                    ? undefined
                    : {
                        scale: 1.03,
                        y: -8,
                        transition: {
                          type: "spring",
                          stiffness: 400,
                          damping: 17,
                        },
                      }
                }
                className="group shadow-neo flex w-full max-w-xs cursor-default flex-col rounded-[var(--radius)] border border-line bg-raised p-6 transition-all duration-300 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <blockquote className="m-0 p-0">
                  <p className="m-0 text-sm leading-relaxed text-ink-soft">
                    &ldquo;{tm.quote}&rdquo;
                  </p>
                  <footer className="mt-6 flex items-center gap-3">
                    {tm.avatar ? (
                      <Image
                        src={tm.avatar}
                        alt={tm.name}
                        width={40}
                        height={40}
                        unoptimized
                        className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-line transition-all duration-300 ease-in-out group-hover:ring-accent/30"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent ring-2 ring-line transition-all duration-300 ease-in-out group-hover:ring-accent/30"
                      >
                        {tm.name.slice(0, 1)}
                      </span>
                    )}
                    <div className="flex min-w-0 flex-col">
                      <cite className="text-sm leading-5 font-semibold tracking-tight text-ink not-italic">
                        {tm.name}
                      </cite>
                      {tm.role_label && (
                        <span className="mt-0.5 text-sm leading-5 tracking-tight text-ink-faint">
                          {tm.role_label}
                        </span>
                      )}
                    </div>
                  </footer>
                </blockquote>
              </motion.li>
            ))}
          </Fragment>
        ))}
      </motion.ul>
    </div>
  )
}

function Testimonials() {
  const { t } = useTranslation()
  const [items, setItems] = useState<TestimonialItem[] | null>(null)

  useEffect(() => {
    let cancelled = false
    community
      .testimonials()
      .then((list) => {
        if (!cancelled) setItems(Array.isArray(list) ? list.slice(0, 9) : [])
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Resolved-empty (no approved testimonials yet) renders nothing: there is no
  // visitor action for reviews here, and the dev DB ships seeded rows.
  if (items !== null && items.length === 0) return null

  const loading = items === null
  const list = items ?? []
  const third = Math.ceil(list.length / 3)
  const firstColumn = list.slice(0, third)
  const secondColumn = list.slice(third, third * 2)
  const thirdColumn = list.slice(third * 2, third * 3)

  return (
    <section className="border-y border-line-strong bg-sunken/40">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="bauhaus-chip bauhaus-chip-ink">
              {t("testimonials.badge")}
            </span>
            <h2 className="text-display-lg mt-4 font-display text-ink">
              {t("testimonials.title")}
            </h2>
          </Reveal>
        </div>
        {loading ? (
          <div className="mt-14 flex justify-center gap-6" aria-hidden>
            {[0, 1, 2].map((c) => (
              <div
                key={c}
                className={cn(
                  "w-full max-w-xs",
                  c === 1 && "hidden md:block",
                  c === 2 && "hidden lg:block"
                )}
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="shadow-neo mb-6 animate-pulse rounded-[var(--radius)] border border-line bg-raised p-6"
                  >
                    <div className="h-3 w-full rounded bg-ink/10" />
                    <div className="mt-2 h-3 w-4/5 rounded bg-ink/10" />
                    <div className="mt-2 h-3 w-2/3 rounded bg-ink/10" />
                    <div className="mt-6 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-ink/10" />
                      <div className="h-3 w-24 rounded bg-ink/10" />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div
            role="region"
            aria-label={t("testimonials.title")}
            className="mt-14 flex max-h-[560px] justify-center gap-6 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]"
          >
            <TestimonialsColumn items={firstColumn} duration={15} />
            {secondColumn.length > 0 && (
              <TestimonialsColumn
                items={secondColumn}
                className="hidden md:block"
                duration={19}
              />
            )}
            {thirdColumn.length > 0 && (
              <TestimonialsColumn
                items={thirdColumn}
                className="hidden lg:block"
                duration={17}
              />
            )}
          </div>
        )}
      </div>
    </section>
  )
}

/* --------------------------------- Themes --------------------------------- */

function Themes() {
  const { t } = useTranslation()
  const settings = useSettings()
  return (
    <section>
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="bauhaus-chip bauhaus-chip-ink">
              {t("nav.settings")}
            </span>
            <h2 className="text-display-lg mt-4 font-display text-ink">
              {t("themes.title")}
            </h2>
            <p className="mt-4 text-lg text-ink-soft">{t("themes.subtitle")}</p>
          </Reveal>
        </div>
        <div className="mx-auto mt-12 grid max-w-xl grid-cols-2 gap-4 sm:grid-cols-4">
          {THEMES.map((tm) => {
            const sw = THEME_SWATCH[tm.id]
            const activeState = settings.theme === tm.id && !settings.focusMode
            return (
              <Float3D key={tm.id} tilt={14} className="w-full">
                <button
                  onClick={() =>
                    settings.set({ theme: tm.id, focusMode: false })
                  }
                  aria-pressed={activeState}
                  className={cn(
                    "w-full cursor-pointer rounded-2xl border bg-raised p-3 text-left transition-colors",
                    activeState
                      ? "border-accent bg-accent-soft"
                      : "border-line hover:border-line-strong"
                  )}
                >
                  <span
                    aria-hidden
                    className="flex h-14 w-14 items-center gap-1"
                  >
                    <span
                      className="h-9 w-2.5 rounded-sm"
                      style={{
                        background: sw.light,
                        boxShadow: "0 0 0 1px var(--line-strong)",
                      }}
                    />
                    <span
                      className="h-9 w-2.5 rounded-sm"
                      style={{ background: sw.dark }}
                    />
                    <span
                      className="ml-auto h-3 w-3 rounded-full"
                      style={{ background: sw.accent }}
                    />
                  </span>
                  <span className="mt-3 block text-sm font-semibold text-ink">
                    {t(`themes.${tm.id}.name`)}
                  </span>
                </button>
              </Float3D>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* --------------------------------- Sponsor -------------------------------- */

// Logo use follows each brand's trademark guide: Cloudflare & Supabase allow
// unmodified referential use ("powered by"); Microsoft's four-square mark is
// license-only, so Microsoft appears as a text wordmark; Dahono ships
// light/dark logo variants from labs.dahono.com.
const POWERED_BY: {
  name: string
  src?: string
  srcLight?: string
  srcDark?: string
}[] = [
  { name: "Cloudflare", src: "/logo/cloudflare.svg" },
  { name: "Supabase", src: "/logo/supabase.svg" },
  {
    name: "Dahono Labs",
    srcLight: "/logo/dahono-mark-black.svg",
    srcDark: "/logo/dahono-mark-white.svg",
  },
]

function Sponsor() {
  const { t } = useTranslation()
  return (
    <section id="sponsor" className="border-t border-line-strong bg-sunken/50">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-display-md font-display text-ink">
              {t("sponsor.title")}
            </h2>
            <p className="mt-3 text-ink-soft">{t("sponsor.subtitle")}</p>
            <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-ink-faint uppercase">
              {t("sponsor.powered")}
            </p>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
            {POWERED_BY.map((b) => (
              <span
                key={b.name}
                className="logo-wall-item inline-flex cursor-default items-center gap-2.5"
                title={b.name}
              >
                {b.src && (
                  <>
                    <Image
                      src={b.src}
                      alt=""
                      width={28}
                      height={28}
                      className="h-7 w-auto"
                      loading="lazy"
                    />
                  </>
                )}
                {b.srcLight && b.srcDark && (
                  <>
                    <Image
                      src={b.srcLight}
                      alt={b.name}
                      width={28}
                      height={28}
                      className="logo-light h-7 w-auto"
                      loading="lazy"
                    />
                    <Image
                      src={b.srcDark}
                      alt={b.name}
                      width={28}
                      height={28}
                      className="logo-dark h-7 w-auto"
                      loading="lazy"
                    />
                  </>
                )}
                <span className="logo-wall-label font-display text-sm font-bold tracking-wide text-ink-soft uppercase">
                  {b.name}
                </span>
              </span>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-ink-faint">
            {t("sponsor.disclaimer")}
          </p>
        </Reveal>
      </div>
    </section>
  )
}

/* ----------------------------------- CTA ---------------------------------- */

function Cta() {
  const { t } = useTranslation()
  return (
    <section className="relative overflow-hidden border-t border-line-strong">
      <div className="absolute inset-0" aria-hidden>
        <DriftOrb
          seed={4}
          className="top-[-40%] left-[20%] h-72 w-72 bg-[var(--bauhaus-blue)]/20"
        />
        <DriftOrb
          seed={5}
          className="right-[10%] bottom-[-40%] h-72 w-72 bg-[var(--bauhaus-red)]/20"
        />
        <AnimatedGridPattern
          numSquares={24}
          maxOpacity={0.12}
          className="[mask-image:radial-gradient(70%_70%_at_50%_50%,white,transparent)] fill-accent/10 stroke-accent/10"
        />
      </div>
      <ScrollVelocityContainer className="bg-bauhaus-red py-4">
        <ScrollVelocityRow
          baseVelocity={2}
          scrollReactivity
          className="font-display text-[11px] font-semibold tracking-[0.32em] text-bauhaus-white uppercase"
        >
          <span className="px-8">{t("landing.velocity")}</span>
        </ScrollVelocityRow>
      </ScrollVelocityContainer>
      <div className="relative mx-auto max-w-4xl px-4 py-24 text-center sm:px-6">
        <Reveal>
          <h2 className="text-display-xl font-display leading-tight text-ink">
            {t("cta.title")}
          </h2>
          <p className="mt-4 text-lg text-ink-soft">
            {t("landing.ctaSubPre")}{" "}
            <Highlighter action="highlight" color="var(--bauhaus-yellow)">
              {t("landing.ctaSubMark")}
            </Highlighter>{" "}
            {t("landing.ctaSubTail")}
          </p>
          <p className="mt-3 text-xs text-ink-faint">{t("hero.note")}</p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/register"
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius)] bg-accent px-6 py-3 text-base font-medium text-accent-ink transition-colors hover:bg-accent-strong"
            >
              {t("cta.button")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export function LandingSections({
  active,
  initialVocab,
  preview,
}: {
  active: string
  initialVocab?: VocabWord[]
  preview?: Record<string, VocabWord[]>
}) {
  return (
    <>
      <Labs active={active} initialVocab={initialVocab} preview={preview} />
      <HowItWorks />
      <Testimonials />
      <Themes />
      <Sponsor />
      <Faq showHeading />
      <Cta />
    </>
  )
}
