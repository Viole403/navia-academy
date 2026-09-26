/**
 * Speech recognition on the web.
 *
 * The comparison logic lives in `@navia/utils` because deciding whether a
 * transcript counts is not a browser concern — it is the same judgement on a
 * phone, and both clients need to make it the same way. What stays here is the
 * part that genuinely is the Web Speech API.
 */
import { sttLocale } from "@navia/utils"

export {
  matchTranscript,
  normalizeTranscript,
  sttLocale,
  transcriptSimilarity,
} from "@navia/utils"

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

function recognizerCtor(): RecClass | undefined {
  if (typeof window === "undefined") return undefined
  const w = window as unknown as {
    SpeechRecognition?: RecClass
    webkitSpeechRecognition?: RecClass
  }
  return w.SpeechRecognition || w.webkitSpeechRecognition
}

export function webSpeechSupported(): boolean {
  return Boolean(recognizerCtor())
}

export function startSTT(
  language: string,
  onFinal: (transcript: string) => void,
  onInterim: (transcript: string) => void,
  onError: (message: string) => void,
  onEnd: () => void
): SttRecognizer | null {
  const Ctor = recognizerCtor()
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
