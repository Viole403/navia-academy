"use client"

import { useMounted } from "@/lib/use-mounted"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Mic,
  Pause,
  Play,
  Square,
  Volume2,
} from "lucide-react"
import { useVocabulary } from "@/lib/vocabulary"
import { useProgress } from "@/stores/progress"
import { showsTranslation, useSettings } from "@/stores/settings"
import { play } from "@/lib/audio"
import { useTranslation } from "@/i18n/locale-context"
import { translationFor } from "@/lib/content-translation"
import {
  matchTranscript,
  startSTT,
  webSpeechSupported,
  type SttRecognizer,
} from "@/lib/stt"
import { languageInfo } from "@/lib/languages"
import { shuffle } from "@/lib/utils"
import type { VoiceLocale } from "@navia/utils"
import {
  Badge,
  Button,
  Card,
  PinyinText,
  SectionHeader,
  Tabs,
} from "@/components/ui"

const TONE_PAIRS = [
  { a: "妈 mā", b: "马 mǎ", noteKey: "speaking.pair1" },
  { a: "买 mǎi", b: "卖 mài", noteKey: "speaking.pair2" },
  { a: "四 sì", b: "十 shí", noteKey: "speaking.pair3" },
  { a: "问 wèn", b: "吻 wěn", noteKey: "speaking.pair4" },
  { a: "汤 tāng", b: "糖 táng", noteKey: "speaking.pair5" },
]

export default function SpeakingPage() {
  const progress = useProgress()
  const settings = useSettings()
  const [tab, setTab] = useState("phrases")
  const [index, setIndex] = useState(0)
  const [recording, setRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [micError, setMicError] = useState<string | null>(null)
  const [audioLoading, setAudioLoading] = useState(false)
  const sttRef = useRef<SttRecognizer | null>(null)
  const [sttTranscript, setSttTranscript] = useState("")
  const [sttMatch, setSttMatch] = useState<boolean | null>(null)
  const [sttError, setSttError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const mounted = useMounted()
  const { t, locale } = useTranslation()
  const vocabulary = useVocabulary()
  const isTonal = settings.language === "zh"
  const tonalTab: { id: string; label: string } | null = isTonal
    ? { id: "tones", label: t("speaking.tones") }
    : null

  const ttsLocale: VoiceLocale = languageInfo(settings.language)
    .ttsLocale as VoiceLocale
  const phrases = useMemo(
    () =>
      shuffle(
        vocabulary
          .filter((w) => (w.examples ?? [])[0])
          .slice(0, 24)
          .map((w) => w.examples![0])
      ),
    [vocabulary]
  )

  useEffect(() => {
    return () => {
      sttRef.current?.abort()
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  if (!mounted) return null

  if (phrases.length === 0) {
    return (
      <div className="animate-fade-up">
        <SectionHeader
          title={t("speaking.title")}
          subtitle={t("speaking.subtitle")}
        />
        <p className="text-sm text-ink-faint">Loading practice content…</p>
      </div>
    )
  }

  function resetStt() {
    sttRef.current?.abort()
    sttRef.current = null
    setSttTranscript("")
    setSttMatch(null)
    setSttError(null)
  }

  function phraseTarget(p: { text?: string; hanzi?: string }): string {
    return p.text ?? p.hanzi ?? ""
  }

  function liveMatch(target: string, final: string) {
    setSttTranscript(final)
    setSttMatch(matchTranscript(final, target))
  }

  const phrase = phrases[index % phrases.length]

  async function startRecording() {
    setMicError(null)
    setSttError(null)
    setSttTranscript("")
    setSttMatch(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        if (audioUrl) URL.revokeObjectURL(audioUrl)
        setAudioUrl(URL.createObjectURL(blob))
        setAttempts((a) => a + 1)
        progress.logStudy(1, "speaking", 3)
        stream.getTracks().forEach((t) => t.stop())
      }
      recorder.start()
      recorderRef.current = recorder
      setRecording(true)
    } catch {
      setMicError(
        "Could not access the microphone. Check your browser permissions."
      )
    }
    if (sttRef.current) {
      sttRef.current.abort()
      sttRef.current = null
    }
    const stt = startSTT(
      settings.language,
      (final) => liveMatch(phraseTarget(phrase), final),
      (interim) => {
        setSttTranscript(interim)
        setSttMatch(matchTranscript(interim, phraseTarget(phrase)))
      },
      (err) => setSttError(err),
      () => {
        sttRef.current = null
      }
    )
    if (stt) sttRef.current = stt
    else if (webSpeechSupported()) setSttError("speechrecognition_init_failed")
  }

  function stopRecording() {
    sttRef.current?.stop()
    sttRef.current = null
    recorderRef.current?.stop()
    setRecording(false)
  }

  function playRecording() {
    if (!audioUrl) return
    if (playing) {
      audioRef.current?.pause()
      setPlaying(false)
      return
    }
    const audio = new Audio(audioUrl)
    audioRef.current = audio
    audio.onended = () => setPlaying(false)
    audio.play()
    setPlaying(true)
  }

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title={t("speaking.title")}
        subtitle={t("speaking.subtitle")}
      />

      <Tabs
        tabs={[
          { id: "phrases", label: t("speaking.phrases") },
          ...(tonalTab ? [tonalTab] : []),
        ]}
        active={tab}
        onChange={setTab}
        id="speaking-tabs"
        className="mb-6"
      />

      {tab === "phrases" && (
        <div
          className="mx-auto max-w-xl"
          role="tabpanel"
          id="speaking-tabs-panel-phrases"
          aria-labelledby="speaking-tabs-tab-phrases"
          tabIndex={0}
        >
          <Card className="p-6 text-center" key={index}>
            <Badge tone="accent">
              {t("speaking.phraseOf", {
                n: String((index % phrases.length) + 1),
                total: String(phrases.length),
              })}
            </Badge>
            <p className="hanzi mt-4 text-3xl leading-snug" lang={ttsLocale}>
              {phrase.text ?? phrase.hanzi ?? ""}
            </p>
            <PinyinText
              pinyin={phrase.pinyin ?? phrase.romanization ?? ""}
              zhuyin={phrase.zhuyin}
              className="mt-2 block text-base"
            />
            {showsTranslation(settings.displayMode.mode) && (
              <p className="mt-1 text-sm text-ink-faint">
                {translationFor(phrase, locale)}
              </p>
            )}

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  play(
                    phrase.audio ?? phrase.text ?? phrase.hanzi ?? "",
                    {
                      rate: settings.audioRate,
                      onLoadingChange: setAudioLoading,
                      onError: () => {},
                    },
                    ttsLocale,
                    settings.voiceGender
                  )
                }
                disabled={audioLoading}
              >
                <Volume2 className="h-4 w-4" /> {t("speaking.model")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  play(phrase.audio ?? phrase.text ?? phrase.hanzi ?? "", {
                    rate: 0.55,
                    onLoadingChange: setAudioLoading,
                    onError: () => {},
                  })
                }
                disabled={audioLoading}
              >
                <Volume2 className="h-4 w-4" /> {t("audio.slow")}
              </Button>
              {!recording ? (
                <Button size="sm" onClick={startRecording}>
                  <Mic className="h-4 w-4" /> {t("speaking.recordVoice")}
                </Button>
              ) : (
                <Button size="sm" variant="danger" onClick={stopRecording}>
                  <Square className="h-4 w-4" /> {t("speaking.stop")}
                </Button>
              )}
              {audioUrl && !recording && (
                <Button size="sm" variant="secondary" onClick={playRecording}>
                  {playing ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}{" "}
                  {t("speaking.myRecording")}
                </Button>
              )}
            </div>

            {recording && (
              <p
                className="mt-4 flex items-center justify-center gap-2 text-sm text-danger"
                role="status"
              >
                <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-danger" />{" "}
                {t("speaking.recordingNow")}
              </p>
            )}
            {micError && (
              <p role="alert" className="mt-4 text-sm text-danger">
                {micError}
              </p>
            )}
            {(sttTranscript || sttMatch !== null || sttError) && (
              <div className="mt-4 rounded-[var(--radius)] border border-line p-3 text-left text-sm">
                {sttError ? (
                  <p className="text-xs text-danger">
                    {t("speaking.sttError")}
                  </p>
                ) : (
                  <>
                    <p className="text-ink-soft">
                      {t("speaking.sttLabel")}{" "}
                      <span className="font-medium text-ink">
                        {sttTranscript || "…"}
                      </span>
                    </p>
                    <p
                      className={`mt-1 text-xs font-semibold ${sttMatch ? "text-success" : "text-danger"}`}
                    >
                      {sttMatch === null
                        ? t("speaking.listening")
                        : sttMatch
                          ? t("speaking.match")
                          : t("speaking.noMatch")}
                    </p>
                  </>
                )}
              </div>
            )}
            {attempts > 0 && !recording && (
              <p className="mt-4 text-xs text-ink-faint">
                {t(
                  attempts === 1
                    ? "speaking.attemptsOne"
                    : "speaking.attemptsMany",
                  { n: String(attempts) }
                )}{" "}
                {t("speaking.comparePrompt")}
              </p>
            )}
          </Card>

          <div className="mt-4 flex justify-between">
            <Button
              variant="ghost"
              onClick={() => {
                setIndex((i) => Math.max(0, i - 1))
                setAudioUrl(null)
                resetStt()
              }}
              disabled={index === 0}
            >
              <ArrowLeft className="h-4 w-4" /> {t("speaking.previous")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setIndex((i) => i + 1)
                setAudioUrl(null)
                resetStt()
              }}
            >
              {t("assessment.next")} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <Card className="mt-6 p-5">
            <h2 className="text-sm font-semibold">
              {t("speaking.shadowingTechnique")}
            </h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-soft">
              <li>{t("speaking.shadow1")}</li>
              <li>{t("speaking.shadow2")}</li>
              <li>{t("speaking.shadow3")}</li>
              <li>{t("speaking.shadow4")}</li>
            </ol>
          </Card>
        </div>
      )}

      {isTonal && tab === "tones" && (
        <div
          className="mx-auto max-w-xl space-y-3"
          role="tabpanel"
          id="speaking-tabs-panel-tones"
          aria-labelledby="speaking-tabs-tab-tones"
          tabIndex={0}
        >
          {TONE_PAIRS.map((pair, i) => (
            <Card key={i} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  {[pair.a, pair.b].map((item) => {
                    const [hanzi] = item.split(" ")
                    return (
                      <button
                        key={item}
                        onClick={() =>
                          play(hanzi, {
                            rate: 0.7,
                            onLoadingChange: setAudioLoading,
                            onError: () => {},
                          })
                        }
                        disabled={audioLoading}
                        className="cursor-pointer rounded-[var(--radius)] border border-line px-4 py-2 text-center hover:border-accent disabled:opacity-50"
                      >
                        <span className="hanzi block text-2xl" lang="zh-CN">
                          {hanzi}
                        </span>
                        <PinyinText
                          pinyin={item.split(" ")[1]}
                          className="text-xs"
                        />
                      </button>
                    )
                  })}
                </div>
                <p className="max-w-52 text-xs text-ink-faint">
                  {t(pair.noteKey)}
                </p>
              </div>
            </Card>
          ))}
          <p className="text-xs text-ink-faint">{t("speaking.tapHint")}</p>
        </div>
      )}
    </div>
  )
}
