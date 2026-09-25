import type { Theme } from "@/theme/colors"

/**
 * Study design system — ported from Chinese-Easy's per-screen `tokens.ts`
 * pattern, adapted to Navia's multi-theme engine.
 *
 * Rules (from the reference, kept):
 * - This file + `surfaceFor()` are the only place colour literals belong on
 *   redesigned screens. Components take a `theme` and derive fills/borders.
 * - Cards separate with tint fill + 1px border a step darker, not shadows.
 * - Full-screen layouts cap the column at CONTENT_MAX and centre it.
 * - Never `className` on an Animated.View; never `%` width in shrink-to-fit.
 */

export const CONTENT_MAX = 430

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  screen: 20,
  cardGap: 13,
} as const

export const radii = {
  card: 20,
  inner: 14,
  pill: 24,
  tag: 12,
  sharp: 2,
} as const

export type Tone = "review" | "word" | "challenge" | "week" | "neutral"

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

function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  const m = (x: number, y: number) => Math.round(x + (y - x) * t)
  return `#${[m(r1, r2), m(g1, g2), m(b1, b2)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")}`
}

function toneBase(theme: Theme, tone: Tone): string {
  switch (tone) {
    case "review":
      return theme.accent
    case "word":
      return theme.text
    case "challenge":
      return theme.accent2
    case "week":
      return theme.green
    case "neutral":
      return theme.textMuted
  }
}

/**
 * Tinted card surface: fill is the tone mixed toward the theme surface,
 * border a step darker. Works in light + dark + amoled because both ends
 * come from the live theme.
 */
export function surfaceFor(
  theme: Theme,
  tone: Tone
): { fill: string; border: string; ink: string } {
  const base = toneBase(theme, tone)
  const dark =
    theme.bg.toLowerCase() < "#808080" || theme.text.toLowerCase() > "#808080"
  const fill = dark
    ? mix(theme.surface, base, 0.16)
    : mix("#FFFFFF", base, 0.08)
  const border = dark
    ? mix(theme.surface, base, 0.34)
    : mix("#FFFFFF", base, 0.22)
  return { fill, border, ink: base }
}

/** The one shadow on study screens — a hint, not elevation. Tinted, + Android elevation. */
export function cardShadow(theme: Theme, lifted = false) {
  return {
    shadowColor: theme.text,
    shadowOffset: { width: 0, height: lifted ? 4 : 3 },
    shadowRadius: lifted ? 12 : 10,
    shadowOpacity: 0.06,
    elevation: lifted ? 3 : 2,
  }
}

/** Two-part button shoulder: a step below the face. Derived, not judged. */
export function shoulderFor(face: string, theme: Theme): string {
  return mix(face, theme.bg, 0.25)
}

export const studyType = {
  greeting: { fontSize: 34, lineHeight: 38, letterSpacing: -0.5 },
  cardTitle: { fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  cardTitleSm: { fontSize: 17, lineHeight: 22, letterSpacing: -0.1 },
  cardBody: { fontSize: 14, lineHeight: 20 },
  bubble: { fontSize: 15, lineHeight: 22 },
  tag: { fontSize: 10.5, letterSpacing: 0.6 },
  button: { fontSize: 15.5 },
  link: { fontSize: 13.5 },
  hanzi: { fontSize: 38, lineHeight: 53 },
  pinyin: { fontSize: 14, lineHeight: 19 },
  gloss: { fontSize: 14.5, lineHeight: 20 },
  statValue: { fontSize: 21, lineHeight: 26 },
  statLabel: { fontSize: 11.5, lineHeight: 15 },
  weekday: { fontSize: 12, lineHeight: 16 },
} as const

/** Staged entrance score (ms). Scenery → greeting → cards → bubble → typing. */
export const entranceScore = {
  slideX: 26,
  slideY: 30,
  scenery: { at: 0, for: 560 },
  greeting: { at: 170, for: 460 },
  cards: { at: 360, for: 440, stagger: 90 },
  bubble: { at: 700, for: 300 },
  typingPerChar: 16,
  backstop: 140,
} as const
