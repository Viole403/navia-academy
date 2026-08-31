import { Platform, TextStyle } from "react-native"

// Editorial Print: serif untuk judul & hanzi, sans untuk body/label
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
    fontFamily: fonts.serif,
    fontSize: 56,
    lineHeight: 64,
    fontWeight: "500" as const,
  },
  hanziLg: {
    fontFamily: fonts.serif,
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
