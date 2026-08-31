"use client"

import { useEffect, type ReactNode } from "react"
import { useSettings } from "@/stores/settings"

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSettings((s) => s.theme)
  const mode = useSettings((s) => s.mode)
  const fontSize = useSettings((s) => s.fontSize)
  const reduceMotion = useSettings((s) => s.reduceMotion)
  const focusMode = useSettings((s) => s.focusMode)

  useEffect(() => {
    const el = document.documentElement
    el.dataset.theme = focusMode ? "focus" : theme
    el.dataset.mode = mode
    el.dataset.fontsize = fontSize
    if (reduceMotion) el.dataset.motion = "reduced"
    else delete el.dataset.motion
  }, [theme, mode, fontSize, reduceMotion, focusMode])

  return <>{children}</>
}
