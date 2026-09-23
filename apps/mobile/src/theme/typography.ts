import { Platform, TextStyle } from "react-native"

// Editorial Print: serif untuk judul & hanzi, sans untuk body/label.
// ponytail: Android "serif" (Noto Serif) has NO CJK glyphs and on some
// devices the serif->CJK system fallback fails, rendering hanzi/pinyin
// tone marks as tofu. So CJK-bearing styles use the bundled Noto Serif SC
// (assets/fonts/NotoSerifSC.ttf, loaded via expo-font in app/_layout.tsx);
// iOS keeps Georgia (PingFang fallback is reliable there). If the bundled
// file is missing, Metro red-screens on the require — keep the file in place.
const serifCJK = Platform.select({
  ios: "Georgia",
  android: "NaviaSerifSC",
  default: "Georgia",
}) as string
export const fonts = {
  serif: Platform.select({
    ios: "Georgia",
    android: "serif",
    default: "Georgia",
  }) as string,
  sans: Platform.select({
    ios: "System",
    android: "sans-serif",
    default: "System",
  }) as string,
  mono: Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "Courier",
  }) as string,
  /** CJK-safe serif: Georgia on iOS, sans-serif on Android (see ponytail). */
  hanzi: serifCJK,
}

export const type = {
  display: {
    fontFamily: fonts.serif,
    fontSize: 40,
    lineHeight: 48,
    fontWeight: "400" as const,
    letterSpacing: -0.5,
  },
  h1: {
    fontFamily: fonts.serif,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "400" as const,
    letterSpacing: -0.3,
  },
  h2: {
    fontFamily: fonts.serif,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "400" as const,
  },
  h3: {
    fontFamily: fonts.serif,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "400" as const,
  },
  hanzi: {
    fontFamily: serifCJK,
    fontSize: 56,
    lineHeight: 64,
    fontWeight: "500" as const,
  },
  hanziLg: {
    fontFamily: serifCJK,
    fontSize: 96,
    lineHeight: 110,
    fontWeight: "500" as const,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  bodySm: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  label: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600" as const,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
  },
  labelSm: {
    fontFamily: fonts.sans,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "700" as const,
    letterSpacing: 1.6,
    textTransform: "uppercase" as const,
  },
  caption: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
  },
  stat: {
    fontFamily: fonts.serif,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "400" as const,
  },
} satisfies Record<string, TextStyle>
