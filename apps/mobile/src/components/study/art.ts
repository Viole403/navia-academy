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
 * Anything whose subject belongs to one language is **not** here but under a
 * per-language table: a Goethe learner must not meet a torii gate, a pagoda or
 * a scroll written 好好学習. `require` is static, so a table that does not name
 * every language simply ships the other language's art to everyone.
 *
 * Rerunning the trimming scripts on a source means re-measuring the ratios
 * below — that is what the measurement script is for.
 */
import type { ImageSourcePropType } from "react-native"
import type { LanguageCode } from "@/lib/languages"

// ─── Dashboard ───────────────────────────────────────────────────────────────
/** Subject-neutral: the same painting reads the same in every town. */
export const art = {
  /** Mountain range for the word-of-day card. */
  wordMountains: require("@assets/study-art/dashboard/word-mountains.png"),
  /** Campfire for the review card. */
  fire: require("@assets/study-art/dashboard/fire.png"),
} as const

/**
 * Decoration whose subject follows the learning language.
 *
 * `scroll` is the Challenges card, `tree` the week card and the hero, `peaks`
 * the closing onboarding step and the review hub header.
 */
const decorByLanguage = {
  zh: {
    scroll: require("@assets/study-art/dashboard/scroll/zh.png"),
    tree: require("@assets/study-art/dashboard/tree/zh.png"),
    peaks: require("@assets/study-art/onboarding/peaks/zh.png"),
  },
  ja: {
    scroll: require("@assets/study-art/dashboard/scroll/ja.png"),
    tree: require("@assets/study-art/dashboard/tree/ja.png"),
    peaks: require("@assets/study-art/onboarding/peaks/ja.png"),
  },
  de: {
    scroll: require("@assets/study-art/dashboard/scroll/de.png"),
    tree: require("@assets/study-art/dashboard/tree/de.png"),
    peaks: require("@assets/study-art/onboarding/peaks/de.png"),
  },
  en: {
    scroll: require("@assets/study-art/dashboard/scroll/en.png"),
    tree: require("@assets/study-art/dashboard/tree/en.png"),
    peaks: require("@assets/study-art/onboarding/peaks/en.png"),
  },
} as const

export type DecorSet = (typeof decorByLanguage)[LanguageCode]

export function decorFor(language: LanguageCode): DecorSet {
  return decorByLanguage[language]
}

/**
 * The onboarding branch, on the script step only.
 *
 * A character-script language is the only one that ever reaches that step, so
 * de and en ship no asset instead of a bundle entry nothing can render. The
 * narrow key type is what keeps a caller from indexing it with any language.
 */
export const branchByLanguage = {
  zh: require("@assets/study-art/onboarding/branch/zh.png"),
  ja: require("@assets/study-art/onboarding/branch/ja.png"),
} as const

// ─── Onboarding ─────────────────────────────────────────────────────────────
export const onbArt = {
  cloudA: require("@assets/study-art/onboarding/cloud-a.png"),
  cloudB: require("@assets/study-art/onboarding/cloud-b.png"),
  cloudC: require("@assets/study-art/onboarding/cloud-c.png"),
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

// ─── The guide shown throughout the app ─────────────────────────────────────
/**
 * The mascot follows the learning language, so a Goethe learner never meets the
 * guide from the Mandarin path — and the same component swaps the source, which
 * is what its own doc comment promised.
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
 *
 * A per-language family shares one number: each set is trimmed and re-fitted to
 * the same canvas as the hand-painted original, so the corner offsets hold for
 * every language rather than only the one they were measured from.
 */
export const artRatio: Record<string, number> = {
  wordMountains: 0.63,
  fire: 0.913,
  scroll: 1.264,
  tree: 0.679,
  peaks: 0.602,
  branch: 0.568,
  cloudA: 0.44,
  cloudB: 0.495,
  cloudC: 0.322,
  mountainsPanorama: 0.37,
  cloudCluster: 0.53,
  cloudDrift: 0.453,
  cloudWisp: 0.582,
  mountainsSmall: 0.406,
  mountainsWide: 0.293,
  // The drill badges and unit glyphs are square by construction, and so is every
  // town building: all forty are fitted to a 384x384 transparent square so the
  // row reads the same weight whichever language's set is showing.
  flashcards: 1,
  listening: 1,
  mistakes: 1,
}
