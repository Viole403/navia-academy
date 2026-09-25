import { useOnboardingStore, type ScriptPref } from "@/store/onboarding"
import {
  displayFont,
  hanziFont,
  isCjkLanguage,
  type FontFamily,
} from "@/theme/paperType"
import { useTheme } from "@/theme/ThemeProvider"

/**
 * Content faces, bound to the learner's actual language and script.
 *
 * Every screen that draws a headword, a character, a paragraph of prose or a
 * reading line resolves its face here rather than choosing one. Choosing is
 * where this goes wrong: a hardcoded script quietly shows a traditional learner
 * mainland glyphs, and a hardcoded CJK face sets German prose in a Chinese
 * typeface — both of which render perfectly and look wrong.
 */
export function useContentFaces() {
  const language = useOnboardingStore((s) => s.language)
  const script = useOnboardingStore((s) => s.script ?? "simplified")

  return {
    language,
    script: script as ScriptPref,
    /** For headwords, characters and body text in the learning language. */
    display: displayFont(language, script) as FontFamily,
    /** For Chinese only — the two CJK faces are not interchangeable. */
    hanzi: hanziFont(script) as FontFamily,
    cjk: isCjkLanguage(language),
  }
}

/** The same thing, for a component that already reads the theme. */
export function useDisplayFont(): FontFamily {
  const { paper } = useTheme()
  void paper
  const { display } = useContentFaces()
  return display
}
