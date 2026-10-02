/**
 * Art registry for the paper design system.
 *
 * Every watercolour asset in one place with the geometry that goes with it.
 * Each entry carries a `ratio` — height / width of the *trimmed* source —
 * because React Native does not size an Image from its intrinsic dimensions
 * the way a browser does: a width with no height lays out at zero and the
 * artwork silently vanishes. Every one of these sits in a card corner
 * positioned against `right: 0` / `bottom: 0`, so an untrimmed render's
 * transparent margin is what those offsets actually measure from.
 *
 * Rerunning the trimming scripts on a source means re-measuring the ratios
 * below — that is what the measurement script is for.
 */
import type { ImageSourcePropType } from "react-native"

// ─── Dashboard hero ─────────────────────────────────────────────────────────
export const art = {
  /** The bowing Shifu, clipped at the hem by the hero's overflow. */
  shifuBow: require("@assets/study-art/dashboard/shifu-bow.png"),
  /** Mountain range for the word-of-day card. */
  wordMountains: require("@assets/study-art/dashboard/word-mountains.png"),
  /** Open scroll for the challenges card. */
  scroll: require("@assets/study-art/dashboard/scroll.png"),
  /** Campfire for the review card. */
  fire: require("@assets/study-art/dashboard/fire.png"),
  /** Bonsai for the This Week card. */
  bonsai: require("@assets/study-art/dashboard/bonsai.png"),
} as const

// ─── Onboarding ─────────────────────────────────────────────────────────────
export const onbArt = {
  sakuraBranch: require("@assets/study-art/onboarding/sakura-branch.png"),
  sakuraSprig: require("@assets/study-art/onboarding/sakura-sprig.png"),
  cloudA: require("@assets/study-art/onboarding/cloud-a.png"),
  cloudB: require("@assets/study-art/onboarding/cloud-b.png"),
  cloudC: require("@assets/study-art/onboarding/cloud-c.png"),
  pagodaMountains: require("@assets/study-art/onboarding/pagoda-mountains.png"),
  mountainsPanorama: require("@assets/study-art/onboarding/mountains-panorama.png"),
} as const

// ─── Decoration (books, challenges, any clipped page) ───────────────────────
export const decorArt = {
  cloudCluster: require("@assets/study-art/decor/cloud-cluster.png"),
  cloudDrift: require("@assets/study-art/decor/cloud-drift.png"),
  cloudWisp: require("@assets/study-art/decor/cloud-wisp.png"),
  mountainsSmall: require("@assets/study-art/decor/mountains-small.png"),
  mountainsWide: require("@assets/study-art/decor/mountains-wide.png"),
} as const

// ─── Review hub drill badges (painted discs, not tinted circles) ────────────
/**
 * The guide shown throughout the app. It follows the learning language, so a
 * Goethe learner never meets the mascot from the Mandarin path — and the same
 * component swaps the source, which is what its own doc comment promised.
 */
export const mascotArt = {
  zh: require("@assets/study-art/images/panda.png"),
  ja: require("@assets/study-art/images/tanuki.png"),
  de: require("@assets/study-art/images/owl.png"),
  en: require("@assets/study-art/images/fox.png"),
} as const

export const reviewArt = {
  flashcards: require("@assets/study-art/review/flashcards.png"),
  listening: require("@assets/study-art/review/listening.png"),
  mistakes: require("@assets/study-art/review/mistakes.png"),
  listeningDrill: require("@assets/study-art/review/listening-drill.png"),
} as const

// ─── Units / lessons path ───────────────────────────────────────────────────
export const unitArt = {
  theBasics: require("@assets/study-art/units/the-basics.png"),
  basicFood: require("@assets/study-art/units/basic-food.png"),
  travel: require("@assets/study-art/units/travel.png"),
  friendship: require("@assets/study-art/units/friendship.png"),
  lifestyle: require("@assets/study-art/units/lifestyle.png"),
  beauty: require("@assets/study-art/units/beauty.png"),
  electronics: require("@assets/study-art/units/electronics.png"),
  popCulture: require("@assets/study-art/units/pop-culture.png"),
  popCultureMusic: require("@assets/study-art/units/pop-culture-music.png"),
} as const

// ─── My Town buildings, ordered by xp cost ──────────────────────────────────
export const buildingArt: Record<string, ImageSourcePropType> = {
  temple: require("@assets/study-art/buildings/temple.png"),
  teaHouse: require("@assets/study-art/buildings/tea-house.png"),
  noodleShop: require("@assets/study-art/buildings/noodle-shop.png"),
  gardenPavilion: require("@assets/study-art/buildings/garden-pavilion.png"),
  lanternStreet: require("@assets/study-art/buildings/lantern-street.png"),
  riversideWalk: require("@assets/study-art/buildings/riverside-walk.png"),
  buddhistStatue: require("@assets/study-art/buildings/buddhist-statue.png"),
  mountainPagoda: require("@assets/study-art/buildings/mountain-pagoda.png"),
  marketSquare: require("@assets/study-art/buildings/market-square.png"),
  grandPalace: require("@assets/study-art/buildings/grand-palace.png"),
}

export type ArtEntry = { source: ImageSourcePropType; ratio: number }

/**
 * Ratios for the art that is positioned against a card edge.
 *
 * **Measured from the shipped assets, not estimated.** Every one of these sits
 * in a corner positioned against `right: 0` / `bottom: 0`, and an untrimmed
 * render's transparent margin is what those offsets measure from — so a wrong
 * ratio is what makes one illustration float off the edge while another sits
 * flush for reasons nothing in the stylesheet explains. Re-measure with
 * `scripts/measure-art-ratios.mjs` after any re-trim.
 */
export const artRatio: Record<string, number> = {
  shifuBow: 2.347,
  wordMountains: 0.63,
  scroll: 1.264,
  fire: 0.913,
  bonsai: 0.679,
  sakuraBranch: 0.568,
  sakuraSprig: 0.472,
  cloudA: 0.44,
  cloudB: 0.495,
  cloudC: 0.322,
  pagodaMountains: 0.602,
  mountainsPanorama: 0.37,
  cloudCluster: 0.53,
  cloudDrift: 0.453,
  cloudWisp: 0.582,
  mountainsSmall: 0.406,
  mountainsWide: 0.293,
  // The drill badges and unit glyphs are square by construction.
  flashcards: 1,
  listening: 1,
  mistakes: 1,
}
