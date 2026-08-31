export interface SttRecognizer {
  stop: () => void
  abort: () => void
}

interface ResultLike {
  isFinal: boolean
  0: { transcript: string; confidence: number }
}

interface RecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((ev: { results: ArrayLike<ResultLike> }) => void) | null
  onerror: ((ev: { error?: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type RecClass = new () => RecognitionLike

export function webSpeechSupported(): boolean {
  if (typeof window === "undefined") return false
  const w = window as unknown as {
    SpeechRecognition?: RecClass
    webkitSpeechRecognition?: RecClass
  }
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition)
}

const LOCALES: Record<string, string> = {
  zh: "zh-CN",
  de: "de-DE",
  en: "en-US",
  ja: "ja-JP",
}

export function sttLocale(language: string): string {
  return LOCALES[language] ?? "en-US"
}

export function startSTT(
  language: string,
  onFinal: (transcript: string) => void,
  onInterim: (transcript: string) => void,
  onError: (message: string) => void,
  onEnd: () => void
): SttRecognizer | null {
  const w = window as unknown as {
    SpeechRecognition?: RecClass
    webkitSpeechRecognition?: RecClass
  }
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
  if (!Ctor) return null
  const rec = new Ctor()
  rec.lang = sttLocale(language)
  rec.continuous = true
  rec.interimResults = true
  rec.maxAlternatives = 1
  rec.onresult = (ev) => {
    for (let i = 0; i < ev.results.length; i++) {
      const r = ev.results[i]
      const text = r[0].transcript.trim()
      if (r.isFinal) onFinal(text)
      else onInterim(text)
    }
  }
  rec.onerror = (ev) => {
    if (ev.error && ev.error !== "aborted") onError(ev.error)
  }
  rec.onend = onEnd
  try {
    rec.start()
  } catch {
    return null
  }
  return { stop: () => rec.stop(), abort: () => rec.abort() }
}

export function normalizeTranscript(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
}

export function matchTranscript(transcript: string, target: string): boolean {
  if (!transcript || !target) return false
  return normalizeTranscript(transcript) === normalizeTranscript(target)
}
