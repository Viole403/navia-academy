// ─── Theme shape (single source of truth for UI tokens) ───────────────────
export interface Theme {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderSoft: string;
  text: string;
  textMuted: string;
  textDim: string;
  accent: string;
  accent2: string;
  mint: string;
  gold: string;
  red: string;
  white: string;
  cardPressed: string;
  green: string;
}

// ─── User-selectable options ───────────────────────────────────────────────
export type ThemeId =
  | "ink"
  | "indigo"
  | "sunset"
  | "jade"
  | "sakura"
  | "materialYou";

export type ThemeMode = "system" | "light" | "dark" | "amoled";
export type ResolvedMode = "light" | "dark" | "amoled";

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  description: string;
  dark: Theme;
  light: Theme;
  /** True if this theme is driven by the device's dynamic palette. */
  dynamic?: boolean;
}

// ─── Hand-crafted base themes ──────────────────────────────────────────────
const INK_DARK: Theme = {
  bg: "#070A12",
  surface: "#101623",
  surfaceAlt: "#171F2B",
  border: "#253041",
  borderSoft: "#1B2431",
  text: "#F6F8FA",
  textMuted: "#8E9AAF",
  textDim: "#5F6C7F",
  accent: "#E34A5F",
  accent2: "#7C5CFF",
  mint: "#2DD4BF",
  gold: "#F6C85F",
  red: "#F87171",
  white: "#FFFFFF",
  cardPressed: "#1A2433",
  green: "#34D399",
};

const INK_LIGHT: Theme = {
  bg: "#FAFAFB",
  surface: "#FFFFFF",
  surfaceAlt: "#F3F4F6",
  border: "#E5E7EB",
  borderSoft: "#E5E7EB",
  text: "#0F172A",
  textMuted: "#475569",
  textDim: "#94A3B8",
  accent: "#D33A4B",
  accent2: "#6D28D9",
  mint: "#0D9488",
  gold: "#D97706",
  red: "#DC2626",
  white: "#FFFFFF",
  cardPressed: "#E2E8F0",
  green: "#059669",
};

const INDIGO_DARK: Theme = {
  bg: "#0A0E1F",
  surface: "#131735",
  surfaceAlt: "#1B2144",
  border: "#2A3260",
  borderSoft: "#1F2547",
  text: "#E4E9FF",
  textMuted: "#9AA3D0",
  textDim: "#66709E",
  accent: "#7C8CFF",
  accent2: "#B794F6",
  mint: "#4ADE80",
  gold: "#FBBF24",
  red: "#F87171",
  white: "#FFFFFF",
  cardPressed: "#1F2547",
  green: "#34D399",
};

const INDIGO_LIGHT: Theme = {
  bg: "#F4F6FF",
  surface: "#FFFFFF",
  surfaceAlt: "#EBEEFB",
  border: "#CBD3F0",
  borderSoft: "#CBD3F0",
  text: "#101635",
  textMuted: "#4A5490",
  textDim: "#A3ABCD",
  accent: "#4C56E0",
  accent2: "#7C3AED",
  mint: "#10B981",
  gold: "#D97706",
  red: "#DC2626",
  white: "#FFFFFF",
  cardPressed: "#D5D9F1",
  green: "#059669",
};

const SUNSET_DARK: Theme = {
  bg: "#14090A",
  surface: "#221115",
  surfaceAlt: "#301A20",
  border: "#4A2731",
  borderSoft: "#381B23",
  text: "#FFF3EE",
  textMuted: "#C89DA6",
  textDim: "#8F5A66",
  accent: "#FF6B5C",
  accent2: "#FFA552",
  mint: "#4ADE80",
  gold: "#FBBF24",
  red: "#F87171",
  white: "#FFFFFF",
  cardPressed: "#381B23",
  green: "#34D399",
};

const SUNSET_LIGHT: Theme = {
  bg: "#FFF9F7",
  surface: "#FFFFFF",
  surfaceAlt: "#FFE9E5",
  border: "#F5CFC5",
  borderSoft: "#F5CFC5",
  text: "#3B1B1B",
  textMuted: "#7F5555",
  textDim: "#B7A1A1",
  accent: "#E14D3C",
  accent2: "#F97316",
  mint: "#10B981",
  gold: "#D97706",
  red: "#DC2626",
  white: "#FFFFFF",
  cardPressed: "#FCE0D6",
  green: "#059669",
};

const JADE_DARK: Theme = {
  bg: "#071412",
  surface: "#0E211D",
  surfaceAlt: "#173830",
  border: "#215046",
  borderSoft: "#153A32",
  text: "#ECFDF7",
  textMuted: "#8CC1B1",
  textDim: "#578174",
  accent: "#2FD4A8",
  accent2: "#84CC16",
  mint: "#34D399",
  gold: "#FBBF24",
  red: "#F87171",
  white: "#FFFFFF",
  cardPressed: "#153A32",
  green: "#34D399",
};

const JADE_LIGHT: Theme = {
  bg: "#F7FCFA",
  surface: "#FFFFFF",
  surfaceAlt: "#E8F5F0",
  border: "#C7E6DD",
  borderSoft: "#C7E6DD",
  text: "#0F2C24",
  textMuted: "#3E5F55",
  textDim: "#8AA79D",
  accent: "#0D9488",
  accent2: "#65A30D",
  mint: "#10B981",
  gold: "#D97706",
  red: "#DC2626",
  white: "#FFFFFF",
  cardPressed: "#D4EBE1",
  green: "#059669",
};

const SAKURA_DARK: Theme = {
  bg: "#150B10",
  surface: "#20121A",
  surfaceAlt: "#2E1B27",
  border: "#4A2B3C",
  borderSoft: "#3A2130",
  text: "#FFF1F6",
  textMuted: "#C8A2B6",
  textDim: "#8F6580",
  accent: "#FF7AB8",
  accent2: "#C084FC",
  mint: "#4ADE80",
  gold: "#FBBF24",
  red: "#F87171",
  white: "#FFFFFF",
  cardPressed: "#3A2130",
  green: "#34D399",
};

const SAKURA_LIGHT: Theme = {
  bg: "#FFF5F9",
  surface: "#FFFFFF",
  surfaceAlt: "#FFE6F0",
  border: "#F5C2D8",
  borderSoft: "#F5C2D8",
  text: "#3B1525",
  textMuted: "#8C4A68",
  textDim: "#B88CA1",
  accent: "#DB2777",
  accent2: "#9333EA",
  mint: "#10B981",
  gold: "#D97706",
  red: "#DC2626",
  white: "#FFFFFF",
  cardPressed: "#FBD4E4",
  green: "#059669",
};

// ─── Static fallback (= Ink dark) ──────────────────────────────────────────
export const FALLBACK: Theme = INK_DARK;

// ─── Catalog of statically defined themes (excludes Material You) ──────────
export const BASE_THEMES: ThemeDefinition[] = [
  {
    id: "ink",
    name: "Ink",
    description: "Cinnabar on deep navy — the Navia default.",
    dark: INK_DARK,
    light: INK_LIGHT,
  },
  {
    id: "indigo",
    name: "Night Scholar",
    description: "Cool periwinkle tones for late-night cramming.",
    dark: INDIGO_DARK,
    light: INDIGO_LIGHT,
  },
  {
    id: "sunset",
    name: "Sunset Mogao",
    description: "Warm desert oranges inspired by Dunhuang murals.",
    dark: SUNSET_DARK,
    light: SUNSET_LIGHT,
  },
  {
    id: "jade",
    name: "Jade Garden",
    description: "Cool greens drawn from classical Chinese ceramics.",
    dark: JADE_DARK,
    light: JADE_LIGHT,
  },
  {
    id: "sakura",
    name: "Sakura Court",
    description: "Soft pinks with plum accents.",
    dark: SAKURA_DARK,
    light: SAKURA_LIGHT,
  },
];

// ─── Material You builder (populated at runtime on Android 12+) ────────────
// The shape matches @pchmn/expo-material3-theme's Material3Scheme.
interface M3Scheme {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  tertiary: string;
  background: string;
  surface: string;
  surfaceVariant: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  outline: string;
  outlineVariant: string;
  onBackground: string;
  onSurface: string;
  onSurfaceVariant: string;
  error: string;
}

export function buildThemeFromMaterialYou(scheme: M3Scheme): Theme {
  return {
    bg: scheme.background,
    surface: scheme.surfaceContainer ?? scheme.surface,
    surfaceAlt: scheme.surfaceContainerHigh ?? scheme.surfaceVariant,
    border: scheme.outlineVariant,
    borderSoft: scheme.outlineVariant,
    text: scheme.onSurface,
    textMuted: scheme.onSurfaceVariant,
    textDim: scheme.outline,
    accent: scheme.primary,
    accent2: scheme.tertiary,
    mint: scheme.secondary,
    gold: scheme.tertiary,
    red: scheme.error,
    white: "#FFFFFF",
    cardPressed: scheme.surfaceVariant,
    green: scheme.secondary,
  };
}

// ─── AMOLED variant: true black background so OLED pixels turn off ────────
export function toAmoled(t: Theme): Theme {
  return {
    ...t,
    bg: "#000000",
    surface: "#0A0A0E",
    surfaceAlt: "#101016",
    cardPressed: "#14141C",
  };
}

// ─── Mutable live token so non-hook callers (and existing files) stay in sync
export let colors: Theme = FALLBACK;
export function setActiveTheme(t: Theme) {
  colors = t;
}
