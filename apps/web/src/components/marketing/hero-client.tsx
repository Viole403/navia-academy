"use client";
import { type LandingInitial } from "@/lib/data-client";
import { Hero } from "./landing-content";

export function HeroClient({
  initial,
  active,
  onActive,
}: {
  initial?: LandingInitial;
  active: string;
  onActive: (exam: string) => void;
}) {
  return (
    <Hero
      examConfig={initial?.examConfig ?? null}
      active={active}
      onActive={onActive}
      initialVocab={initial?.vocab ?? []}
      preview={initial?.preview}
      placementTotal={initial?.placementTotal}
    />
  );
}
