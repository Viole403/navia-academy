import { PropsWithChildren, createContext, useContext } from "react"
import { StatusBar, useColorScheme } from "react-native"
import { FALLBACK, BASE_THEMES } from "./colors"
import { useAppTheme, type ResolvedTheme } from "./useMaterialYou"

// Backwards-compatible alias until all consumers migrate
export type ThemeCtx = ResolvedTheme

const ThemeContext = createContext<ResolvedTheme>({
  theme: FALLBACK,
  themeDef: BASE_THEMES[0],
  resolvedMode: "dark",
  catalog: BASE_THEMES,
  materialYouAvailable: false,
  ready: false,
})

export function useTheme(): ResolvedTheme {
  return useContext(ThemeContext)
}

/**
 * Wraps the app and applies the chosen base theme (ink / indigo / sunset / jade
 * / sakura / materialYou) in the requested mode (light / dark / amoled).
 * Updates the imperative `colors` token too so non-hook screens stay in sync.
 */
export function ThemeProvider({ children }: PropsWithChildren) {
  const resolved = useAppTheme()
  return (
    <ThemeContext.Provider value={resolved}>
      <StatusBar
        barStyle={
          resolved.resolvedMode === "light" ? "dark-content" : "light-content"
        }
        backgroundColor={resolved.theme.bg}
      />
      {children}
    </ThemeContext.Provider>
  )
}
