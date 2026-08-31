import { landingDemo } from "@/lib/landing-demo.generated"
import type { LandingInitial } from "@/lib/data-client"
import { LandingPage } from "@/components/marketing/landing-page"

export default async function MarketingHomePage() {
  // Baked in at publish time by apps/media (scripts/publish-data.ts →
  // writeLandingDemoStatic). No CDN fetch, no manifest lookup, no network
  // race/timeout — the landing page's first paint never depends on
  // storage/CDN reachability.
  const initial: LandingInitial = {
    examConfig: landingDemo.exams,
    vocab: landingDemo.preview?.zh ?? [],
    stats: landingDemo.stats ?? {},
    placementTotal: landingDemo.placementTotal,
    audio: landingDemo.audio,
    preview: landingDemo.preview,
  }
  return <LandingPage initial={initial} />
}
