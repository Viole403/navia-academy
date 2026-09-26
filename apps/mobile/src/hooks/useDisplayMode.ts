import { useUserSettings } from "@/hooks/useUserSettings"
import {
  normalizeDisplayMode,
  resolveMode,
  showsPinyin,
  showsTranslation,
  showsZhuyin,
} from "@/lib/displayMode"
import type { DisplayMode, DisplayModeMode } from "@/types/api"

/**
 * The reading-aid preference, plus the write that persists it.
 *
 * Setters are returned rather than a store so the choice goes through the
 * same settings patch every other preference uses — the value has to reach
 * the account, or the learner picks pinyin on the phone and gets zhuyin back
 * on the web.
 */
export function useDisplayMode() {
  const s = useUserSettings()
  const displayMode = normalizeDisplayMode(s.data?.display_mode)

  const setMode = (mode: DisplayModeMode) =>
    s.set({ display_mode: { ...displayMode, mode } })

  const setScript = (script: DisplayMode["script"]) =>
    s.set({ display_mode: { ...displayMode, script } })

  const setAdaptiveByLevel = (adaptiveByLevel: boolean) =>
    s.set({ display_mode: { ...displayMode, adaptiveByLevel } })

  return {
    displayMode,
    mode: displayMode.mode,
    script: displayMode.script,
    adaptiveByLevel: displayMode.adaptiveByLevel,
    isLoading: s.isLoading,
    setMode,
    setScript,
    setAdaptiveByLevel,
    /** Effective mode for one item, honouring a per-level override. */
    modeFor: (level?: number | null) => resolveMode(displayMode, level),
    showsPinyin: (m?: DisplayModeMode) => showsPinyin(m ?? displayMode.mode),
    showsZhuyin: (m?: DisplayModeMode) => showsZhuyin(m ?? displayMode.mode),
    showsTranslation: (m?: DisplayModeMode) =>
      showsTranslation(m ?? displayMode.mode),
  }
}
