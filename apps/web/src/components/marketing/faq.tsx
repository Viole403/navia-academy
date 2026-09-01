"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useTranslation } from "@/i18n/locale-context"
import type { TranslationKey } from "@/i18n/keys"
import { cn } from "@/lib/utils"
import { Reveal } from "@/components/ui"

const FAQ_IDS = [1, 2, 3, 4, 5, 6, 7] as const

type FaqId = (typeof FAQ_IDS)[number]

export function Faq({ showHeading = false }: { showHeading?: boolean }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState<number>(1)
  const reduceMotion = useReducedMotion()

  return (
    <section id="faq" className="scroll-mt-24 bg-sunken">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        {showHeading && (
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <span className="bauhaus-chip bauhaus-chip-ink">
                {t("nav.faq")}
              </span>
              <h2 className="text-display-lg mt-4 font-display">
                {t("faq.title")}
              </h2>
            </Reveal>
          </div>
        )}
        <div
          className={cn(
            "mx-auto max-w-3xl divide-y divide-line",
            showHeading && "mt-12"
          )}
        >
          {FAQ_IDS.map((id) => {
            const isOpen = open === id
            return (
              <Reveal key={id} delay={(id - 1) * 40}>
                <div
                  className={cn(
                    "rounded-[var(--radius)] transition-shadow duration-200",
                    isOpen && "shadow-neo bg-raised"
                  )}
                >
                  <h3>
                    <button
                      type="button"
                      onClick={() => setOpen((v) => (v === id ? 0 : id))}
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${id}`}
                      className="flex w-full cursor-pointer items-center justify-between gap-4 px-4 py-4 text-left"
                    >
                      <span className="text-sm leading-snug font-medium text-ink">
                        {t(`faq.q${id}`)}
                      </span>
                      <motion.span
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : { duration: 0.25, ease: [0.16, 1, 0.3, 1] }
                        }
                        className="shrink-0"
                      >
                        <ChevronDown
                          aria-hidden
                          className="h-4 w-4 text-ink-faint"
                        />
                      </motion.span>
                    </button>
                  </h3>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={`faq-panel-${id}`}
                        role="region"
                        initial={
                          reduceMotion ? false : { height: 0, opacity: 0 }
                        }
                        animate={{ height: "auto", opacity: 1 }}
                        exit={
                          reduceMotion ? undefined : { height: 0, opacity: 0 }
                        }
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : { duration: 0.25, ease: [0.16, 1, 0.3, 1] }
                        }
                        className="overflow-hidden"
                      >
                        <p className="px-4 pb-4 text-sm leading-relaxed text-ink-soft">
                          {t(`faq.a${id}`)}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
