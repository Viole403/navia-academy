import { useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import {
  BASE_THEMES,
  FALLBACK,
  buildThemeFromMaterialYou,
  setActiveTheme,
  toAmoled,
  type Theme,
  type ThemeDefinition,
  type ThemeId,
  type ThemeMode,
} from "./colors";
import { useThemePrefs } from "@/store/theme";

type Material3Module = typeof import("@pchmn/expo-material3-theme");

let m3: Material3Module | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  m3 = require("@pchmn/expo-material3-theme");
} catch {
  m3 = null;
}

export interface ResolvedTheme {
  theme: Theme;
  /** Which base theme definition produced this (or pseudo for Material You) */
  themeDef: ThemeDefinition;
  /** Effective mode resolved from user prefs + system */
  resolvedMode: "light" | "dark" | "amoled";
  /** List of all selectable theme defs, including Material You if available. */
  catalog: ThemeDefinition[];
  /** True if Material You dynamic palette is available on this device. */
  materialYouAvailable: boolean;
  ready: boolean;
}

/**
 * Source of truth for the active theme.
 *
 * - Reads user's `themeId` + `mode` preference
 * - Resolves `mode === "system"` against device color scheme
 * - For `themeId === "materialYou"`, loads the device's dynamic palette
 *   (Android 12+); otherwise falls back to `ink`
 * - Applies AMOLED true-black variant on top of any base theme
 */
export function useAppTheme(): ResolvedTheme {
  const systemScheme = useColorScheme();
  const { themeId, mode } = useThemePrefs();
  const [muiCatalog, setMuiCatalog] = useState<ThemeDefinition | null>(null);
  const [ready, setReady] = useState(false);

  // Build material-you definition when native module available
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!m3) {
        if (!cancelled) setReady(true);
        return;
      }
      try {
        const raw = m3.getMaterial3Theme() as unknown as {
          dark: Record<string, string>;
          light: Record<string, string>;
        };
        if (cancelled) return;
        setMuiCatalog({
          id: "materialYou",
          name: "Material You",
          description: "Matches your device wallpaper (Android 12+).",
          dark: buildThemeFromMaterialYou(raw.dark as never),
          light: buildThemeFromMaterialYou(raw.light as never),
          dynamic: true,
        });
      } catch {
        // material you not supported on this device/os
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const catalog = useMemo<ThemeDefinition[]>(() => {
    const list = [...BASE_THEMES];
    if (muiCatalog) list.unshift(muiCatalog);
    return list;
  }, [muiCatalog]);

  const resolvedMode = useMemo<ResolvedTheme["resolvedMode"]>(() => {
    if (mode === "system") return systemScheme === "light" ? "light" : "dark";
    return mode;
  }, [mode, systemScheme]);

  const themeDef = useMemo<ThemeDefinition>(() => {
    const found = catalog.find((t) => t.id === themeId);
    if (found) return found;
    // Also let users who picked Material You but on unsupported devices
    // fall back silently to ink.
    return BASE_THEMES[0];
  }, [catalog, themeId]);

  const activeTheme = useMemo<Theme>(() => {
    const base = resolvedMode === "light" ? themeDef.light : themeDef.dark;
    return resolvedMode === "amoled" ? toAmoled(base) : base;
  }, [themeDef, resolvedMode]);

  // Keep imperative token updated (for non-hook callers / legacy imports)
  useEffect(() => {
    setActiveTheme(activeTheme);
  }, [activeTheme]);

  return {
    theme: activeTheme,
    themeDef,
    resolvedMode,
    catalog,
    materialYouAvailable: !!muiCatalog,
    ready,
  };
}

// ─── Backwards-compat export (some files only need the imperative token) ──
export { FALLBACK };
