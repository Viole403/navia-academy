/**
 * Typeface map for the paper design system.
 *
 * One family per weight, named — never `fontWeight` alone. React Native cannot
 * synthesise a weight, so a style that sets only `fontWeight: "800"` renders in
 * whatever the family shipped with. This matters most for CJK, which has no
 * synthesisable bold at all.
 *
 * The CJK families come in two groups on purpose: `hanzi-tc` is traditional-only
 * and `hanzi-sc` simplified-only. Noto Serif SC and TC draw a good many shared
 * codepoints differently (骨 and 直 among them), so a traditional reader shown
 * mainland glyph forms is a real defect, not a preference. A screen that follows
 * the learner's script picks its face through `hanziFont()` rather than relying
 * on a fallback chain.
 */
import { ScriptPref } from "@/store/onboarding"

export const families = {
  nunito: "Nunito_400Regular",
  nunitoSemiBold: "Nunito_600SemiBold",
  nunitoBold: "Nunito_700Bold",
  nunitoExtraBold: "Nunito_800ExtraBold",

  inter: "Inter_400Regular",
  interMedium: "Inter_500Medium",
  interSemiBold: "Inter_600SemiBold",

  /** Literary serif for English prose in the reader — deliberately not the UI sans. */
  lora: "Lora_400Regular",
  loraMedium: "Lora_500Medium",

  /** The marker hand the reading screens use for one handwritten note per screen. */
  handwriting: "Caveat_400Regular",
  /** The greeting's learner name. An upright marker hand, not a slanted script. */
  handwritten: "Kalam_700Bold",

  /** Existing app bundle. */
  hanziSc: "NaviaSerifSC",
  hanziTc: "NotoSerifTC",
  hanziSans: "NotoSansTC",
} as const

export type FontFamily = (typeof families)[keyof typeof families]

/**
 * The face a character-script screen should draw with.
 *
 * Spelled out as a switch on literals, not built from a template — the Tailwind
 * config carries matching class names, and NativeWind finds classes by scanning
 * source text, so a template literal would generate no CSS and every character
 * would silently fall back to the system serif.
 */
export function hanziFont(script: ScriptPref): FontFamily {
  return script === "traditional" ? families.hanziTc : families.hanziSc
}

/**
 * The face for **content text** in the learner's language.
 *
 * This app teaches four languages with four different text shapes, and a single
 * CJK face is wrong for three of them:
 *
 *  - **zh** — simplified and traditional take different faces, because Noto Serif
 *    SC and TC draw a good many shared codepoints differently (骨 and 直 among
 *    them) and a traditional reader shown mainland glyph forms is a real defect.
 *  - **ja** — kana and kanji are both covered, and the sans face is the right
 *    one for Japanese body text, which is set lighter than Chinese.
 *  - **de / en** — Latin, and CJK faces carry Latin glyphs that render but were
 *    never designed for the job. German prose set in Noto Serif SC reads as an
 *    accident; it wants the literary serif, which is what the reader uses for
 *    translations everywhere else.
 *
 * So screens resolve the face through this rather than reaching for `hanziFont`
 * and hardcoding a script — a hardcoded script is a traditional learner being
 * shown simplified glyphs on three screens.
 */
export function displayFont(language: string, script: ScriptPref): FontFamily {
  switch (language) {
    case "zh":
      return hanziFont(script)
    case "ja":
      return families.hanziSans
    default:
      return families.lora
  }
}

/** Whether content in this language is set in a CJK face rather than Latin. */
export function isCjkLanguage(language: string): boolean {
  return language === "zh" || language === "ja"
}

export const paperType = {
  /** Nunito ExtraBold. The two-line "Good / Morning," greeting. */
  greeting: {
    fontFamily: families.nunitoExtraBold,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  /** Kalam Bold — the learner's name, over the marker stroke. */
  name: { fontFamily: families.handwritten, fontSize: 30, lineHeight: 42 },
  /** Nunito ExtraBold. A card's own title. */
  cardTitle: {
    fontFamily: families.nunitoExtraBold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  cardTitleSm: {
    fontFamily: families.nunitoExtraBold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  /** Nunito SemiBold. The supporting line under a card title. */
  cardBody: {
    fontFamily: families.nunitoSemiBold,
    fontSize: 14,
    lineHeight: 20,
  },
  /** Nunito SemiBold — the speech bubble's message. */
  bubble: { fontFamily: families.nunitoSemiBold, fontSize: 15, lineHeight: 22 },
  /** Nunito ExtraBold, inside a tag. */
  tag: {
    fontFamily: families.nunitoExtraBold,
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 0.6,
  },
  /** Nunito ExtraBold, on a primary button. */
  button: {
    fontFamily: families.nunitoExtraBold,
    fontSize: 15.5,
    lineHeight: 20,
  },
  /** Nunito Bold — "See all" / "Open". */
  link: { fontFamily: families.nunitoBold, fontSize: 13.5, lineHeight: 18 },
  /** Nunito ExtraBold, the big number in a stat. */
  statValue: {
    fontFamily: families.nunitoExtraBold,
    fontSize: 21,
    lineHeight: 26,
  },
  statLabel: {
    fontFamily: families.nunitoSemiBold,
    fontSize: 11.5,
    lineHeight: 15,
  },
  weekday: { fontFamily: families.nunitoBold, fontSize: 12, lineHeight: 16 },
  /** Inter — body copy and labels. */
  body: { fontFamily: families.inter, fontSize: 15, lineHeight: 23 },
  bodySm: { fontFamily: families.inter, fontSize: 13.5, lineHeight: 20 },
  label: {
    fontFamily: families.interSemiBold,
    fontSize: 12.5,
    lineHeight: 17,
    letterSpacing: 0.2,
  },
  /** Lora — English prose in the reader and the dictionary. */
  prose: { fontFamily: families.lora, fontSize: 16, lineHeight: 26 },
  proseSm: { fontFamily: families.lora, fontSize: 14, lineHeight: 22 },
  /** Caveat — the one handwritten note per screen. */
  note: { fontFamily: families.handwriting, fontSize: 22, lineHeight: 28 },
} as const

/**
 * Han type sizes. The generous line heights are deliberate: CJK glyphs fill
 * their em box far more completely than Latin ones, so a ratio comfortable for
 * Nunito clips the top of a character like 謝.
 */
export function hanziType(size: number) {
  return { fontSize: size, lineHeight: Math.round(size * 1.4) }
}
