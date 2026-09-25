import { PropsWithChildren, createContext, useContext, useMemo } from "react"
import { StatusBar, useColorScheme } from "react-native"
import { FALLBACK, BASE_THEMES, type ResolvedMode } from "./colors"
import { paperFor, type PaperPalette } from "./paper"
import { useAppTheme, type ResolvedTheme } from "./useMaterialYou"

// Backwards-compatible alias until all consumers migrate
export type ThemeCtx = ResolvedTheme

export interface StudyTheme extends ResolvedTheme {
  /** The paper design system, repainted for the active theme + mode. */
  paper: PaperPalette
}

const ThemeContext = createContext<StudyTheme>({
  theme: FALLBACK,
  themeDef: BASE_THEMES[0],
  resolvedMode: "dark",
  catalog: BASE_THEMES,
  materialYouAvailable: false,
  ready: false,
  paper: paperFor(FALLBACK, "dark"),
})

/**
 * Wraps the app and applies the chosen base theme (ink / indigo / sunset /
 * jade / sakura / materialYou) in the requested mode (light / dark / amoled),
 * plus the paper palette that palette's design system is built from.
 * Updates the imperative `colors` token too so non-hook screens stay in sync.
 */
export function ThemeProvider({ children }: PropsWithChildren) {
  const resolved = useAppTheme()
  const value = useMemo<StudyTheme>(
    () => ({
      ...resolved,
      paper: paperFor(resolved.theme, resolved.resolvedMode),
    }),
    [resolved]
  )
  return (
    <ThemeContext.Provider value={value}>
      <StatusBar
        barStyle={
          resolved.resolvedMode === "light" ? "dark-content" : "light-content"
        }
        backgroundColor={value.paper.paper}
      />
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): StudyTheme {
  return useContext(ThemeContext)
}

export { useColorScheme }
export type { ResolvedMode }
