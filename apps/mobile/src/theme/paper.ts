import type { Theme } from "@/theme/colors"
import type { ResolvedMode } from "@/theme/colors"

/**
 * The paper design system.
 *
 * One palette for the whole app, and it is a **factory rather than a
 * constant**: `paperFor(theme, mode)`.
 *
 * The design is warm ivory under watercolour, which is inherently a light-only
 * idea. We ship six themes across light / dark / amoled, so a single set of
 * literals would leave the other eleven combinations a recolour of a design that
 * was never built for them. Every value is derived from the active theme
 * instead:
 *
 *  - `paper` is the ivory ground, tinted toward the active theme's surface so
 *    each of the six reads as its own room rather than the same room in six
 *    colours.
 *  - The accent family (green / coral / lavender / gold) is derived from the
 *    theme's own accent + accent2, so "Start Review" is cinnabar under Ink and
 *    jade under Jade Garden without a second set of literals per theme.
 *  - In dark / amoled, `paper` becomes the theme surface, card fills are a step
 *    *toward* the accent rather than away from white, and shadows are replaced
 *    by a 1px lighter border. A tinted shadow on a near-black ground is
 *    invisible; the border is what separates a card.
 *
 * Everything downstream — every card, hero, sheet and tab bar — reads from
 * this object, so a theme change repaints the whole app from one place.
 */

export interface PaperPalette {
  /** Page ground. Never pure white: the whole app reads as paper. */
  paper: string
  /** Raised card fill, a shade off the page. */
  card: string
  /** Inset panel inside a card. */
  cardAlt: string
  /** 1px separators. */
  line: string
  lineSoft: string
  /** Track behind an unfilled ring or bar. */
  track: string
  /** Ring on a day that has not happened yet — opportunity, not a gap. */
  ring: string

  /** Primary ink. */
  ink: string
  inkSoft: string
  inkMuted: string

  /** Accent family. */
  green: string
  greenDark: string
  greenSoft: string
  greenRing: string

  coral: string
  coralDark: string
  coralSoft: string

  lavender: string
  lavenderSoft: string

  gold: string
  goldSoft: string

  /** Per-card surface tints: a fill plus a border a step darker. */
  surface: {
    review: { fill: string; border: string }
    word: { fill: string; border: string }
    challenge: { fill: string; border: string }
    challengeStats: { fill: string; border: string }
    week: { fill: string; border: string }
  }
  /** Button shoulders — the side of a two-part button, seen along its bottom. */
  shoulder: {
    accent: string
    green: string
    greenDeep: string
    quiet: string
  }
  /** Android draws shadows from elevation alone; iOS from these four. */
  shadow: ViewStyleShadow
  shadowLifted: ViewStyleShadow
  radius: { card: number; inner: number; pill: number; tag: number }
}

type ViewStyleShadow = {
  shadowColor: string
  shadowOffset: { width: number; height: number }
  shadowRadius: number
  shadowOpacity: number
  elevation: number
}

// ─── colour maths ───────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "")
  const v =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ]
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  const m = (x: number, y: number) => Math.round(x + (y - x) * t)
  return `#${[m(r1, r2), m(g1, g2), m(b1, b2)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")}`
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

/** A palette light enough to carry white text. */
function ensureInk(accent: string, theme: Theme): string {
  return luminance(accent) > 0.62 ? mix(accent, "#101010", 0.45) : accent
}

/** The one shadow on study screens — a hint, not elevation. Tinted, never black. */
const shadowFor = (ink: string, lifted: boolean): ViewStyleShadow => ({
  shadowColor: ink,
  shadowOffset: { width: 0, height: lifted ? 4 : 3 },
  shadowRadius: lifted ? 12 : 10,
  shadowOpacity: 0.05,
  // Zero on purpose. Android draws elevation as a rendered rim rather than a
  // shadow, and a rim on a pill with a large corner radius is not reliably
  // clipped — it surfaced as a hairline seam straight across the middle of every
  // filled button. The iOS properties above carry the lift on iOS; on Android the
  // shoulder below the face is what reads as depth.
  elevation: 0,
})

/**
 * Build the paper palette for one theme + mode.
 *
 * `theme` supplies the identity (its accent, accent2, green, gold and the two
 * surface steps); `mode` decides which direction the tints run.
 */
export function paperFor(theme: Theme, mode: ResolvedMode): PaperPalette {
  const dark = mode === "dark" || mode === "amoled"
  const amoled = mode === "amoled"

  // Paper: ivory in light, the theme's own surface in dark, true black in amoled.
  const paper = dark
    ? amoled
      ? "#000000"
      : mix(theme.surface, theme.accent, 0.04)
    : mix(theme.bg, "#FBF7EC", 0.55)

  const green = ensureInk(theme.green, theme)
  const coral = ensureInk(theme.accent, theme)
  const lavender = ensureInk(theme.accent2, theme)
  const gold = ensureInk(theme.gold, theme)

  const card = dark
    ? amoled
      ? "#0B0B10"
      : mix(theme.surface, theme.accent, 0.03)
    : mix(theme.surface, "#FFFFFF", 0.5)
  const cardAlt = dark
    ? mix(card, theme.accent, 0.05)
    : mix(card, theme.accent, 0.05)

  // A wash of the accent over the page it sits on, in both modes. The dark
  // branch used to lift the accent itself toward white instead, which left the
  // fill at roughly the full accent and put near-white text on it: 1.0–1.5:1
  // against the muted body copy, invisible on every dark theme.
  const tint = (base: string, t: number) =>
    dark ? mix(card, base, t) : mix("#FFFFFF", base, t)
  const borderOf = (base: string, t: number) =>
    dark ? mix(base, "#FFFFFF", 0.16) : mix("#FFFFFF", base, t)

  /** The 1px separator, relative to whatever surface it sits on. */
  const lineOf = (base: string) =>
    dark ? mix(base, "#FFFFFF", 0.12) : mix(base, theme.border, 0.5)

  return {
    paper,
    card,
    cardAlt,
    line: lineOf(card),
    lineSoft: dark
      ? mix(card, "#FFFFFF", 0.07)
      : mix(card, theme.borderSoft, 0.4),
    track: dark ? mix(card, "#FFFFFF", 0.1) : mix(card, theme.border, 0.35),
    ring: dark ? mix(green, "#000000", 0.55) : mix(green, paper, 0.55),

    ink: dark ? theme.text : mix(theme.text, "#0B1020", 0.35),
    inkSoft: theme.textMuted,
    inkMuted: theme.textDim,

    green,
    greenDark: mix(green, dark ? "#000000" : "#1A1A1A", 0.22),
    greenSoft: dark ? mix(card, green, 0.18) : mix(paper, green, 0.1),
    greenRing: dark ? mix(green, "#000000", 0.5) : mix(green, paper, 0.5),

    coral,
    coralDark: mix(coral, dark ? "#000000" : "#1A1A1A", 0.22),
    coralSoft: dark ? mix(card, coral, 0.18) : mix(paper, coral, 0.1),

    lavender,
    lavenderSoft: dark ? mix(card, lavender, 0.18) : mix(paper, lavender, 0.1),

    gold,
    goldSoft: dark ? mix(card, gold, 0.16) : mix(paper, gold, 0.12),

    surface: {
      review: { fill: tint(coral, 0.1), border: borderOf(coral, 0.24) },
      word: { fill: card, border: lineOf(card) },
      challenge: {
        fill: tint(lavender, 0.1),
        border: borderOf(lavender, 0.24),
      },
      challengeStats: {
        fill: dark ? mix(card, "#FFFFFF", 0.04) : mix(paper, lavender, 0.05),
        border: borderOf(lavender, 0.16),
      },
      week: { fill: tint(green, 0.08), border: borderOf(green, 0.22) },
    },
    shoulder: {
      accent: mix(coral, dark ? "#000000" : paper, 0.24),
      green: mix(green, dark ? "#000000" : paper, 0.24),
      greenDeep: mix(green, dark ? "#000000" : paper, 0.34),
      quiet: mix(card, dark ? "#FFFFFF" : theme.border, 0.22),
    },
    shadow: shadowFor(theme.text, false),
    shadowLifted: shadowFor(theme.text, true),
    radius: { card: 20, inner: 14, pill: 24, tag: 12 },
  }
}
