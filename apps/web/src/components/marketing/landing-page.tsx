"use client";

import { Suspense, useEffect, useState } from "react";
import { HeroClient } from "@/components/marketing/hero-client";
import { StatsStrip, Programs } from "@/components/marketing/landing-content";
import { LandingSections } from "@/components/marketing/landing-sections";
import { ScrollProgress } from "@/components/ui";
import { seedAudioManifest } from "@/lib/audio";
import { type LandingInitial } from "@/lib/data-client";

function HeroSkeleton() {
  return (
    <section className="relative overflow-hidden">
      <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 md:pb-32 md:pt-24">
        <div className="grid items-center gap-12 md:grid-cols-[1.05fr_1fr]">
          <div className="space-y-4">
            <div className="h-6 w-32 animate-pulse rounded-full bg-line/60" />
            <div className="h-14 w-full animate-pulse rounded-2xl bg-line/60" />
            <div className="h-6 w-72 animate-pulse rounded-full bg-line/60" />
            <div className="flex gap-3">
              <div className="h-11 w-40 animate-pulse rounded-full bg-line/60" />
              <div className="h-11 w-40 animate-pulse rounded-full bg-line/60" />
            </div>
          </div>
          <div className="h-80 w-full animate-pulse rounded-2xl border border-line bg-sunken" />
        </div>
      </div>
    </section>
  );
}

function StatsSkeleton() {
  return (
    <section className="border-y border-line bg-sunken/60" aria-label="loading">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-4 py-10 sm:px-6 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="px-4 py-2 text-center">
            <div className="mx-auto h-3 w-16 animate-pulse rounded bg-line/60" />
            <div className="mx-auto mt-2 h-9 w-12 animate-pulse rounded bg-line/60" />
          </div>
        ))}
      </div>
    </section>
  );
}

function ProgramsSkeleton() {
  return (
    <section id="programs" className="scroll-mt-24">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto h-6 w-32 animate-pulse rounded-full bg-line/60" />
          <div className="mx-auto mt-4 h-10 w-64 animate-pulse rounded-2xl bg-line/60" />
          <div className="mx-auto mt-4 h-6 w-80 animate-pulse rounded-full bg-line/60" />
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl border border-line bg-sunken" />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * `initial` is now baked in at build time (apps/media → landing-demo.generated.ts,
 * imported statically by page.tsx) — no runtime CDN fetch, no manifest lookup,
 * no retry/backoff state machine. First paint has real content immediately;
 * the Suspense fallbacks above only cover client-side hydration, not a network
 * wait. If this ever renders with an empty `initial` (e.g. a bad generated
 * file slipping through), that's a build-time data problem to fix at the
 * source — not something to paper over with a runtime retry loop again.
 */
export function LandingPage({ initial }: { initial: LandingInitial }) {
  const [activeExam, setActiveExam] = useState(() => {
    const lang = initial.examConfig?.types[0] ?? "hsk";
    return lang;
  });

  useEffect(() => {
    if (initial.audio?.length) seedAudioManifest(initial.audio);
  }, [initial.audio]);

  return (
    <>
      <ScrollProgress />
      <main id="main">
      <Suspense fallback={<HeroSkeleton />}>
        <HeroClient initial={initial} active={activeExam} onActive={setActiveExam} />
      </Suspense>
      <Suspense fallback={<StatsSkeleton />}>
        <StatsStrip initialStats={initial.stats} examCount={initial.examConfig?.types.length} placementTotal={initial.placementTotal} />
      </Suspense>
      <Suspense fallback={<ProgramsSkeleton />}>
        <Programs examConfig={initial.examConfig} />
      </Suspense>
      <LandingSections active={activeExam} initialVocab={initial.vocab} preview={initial.preview} />
      </main>
    </>
  );
}
