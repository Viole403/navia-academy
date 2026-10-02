import { useEffect, useMemo, useRef, useState, type ComponentType } from "react"
import {
  ActivityIndicator,
  Platform,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native"
import RawWebView, { type WebViewMessageEvent } from "react-native-webview"
import { bundledCharacterData, type CharacterJson } from "@/lib/hanziStrokeData"
import { playSound } from "@/utils/sound"
import { tick } from "@/utils/feedback"
import { useTheme } from "@/theme/ThemeProvider"
import { hanziFont, families } from "@/theme/paperType"
import { useOnboardingStore } from "@/store/onboarding"
import { WRITER_HTML } from "./writerHtml"
import { useTargetScript } from "@/hooks/useTargetScript"

/**
 * react-native-webview v14 declares `class WebView<P = undefined>`, and the
 * `ref` in this component is the default instantiation — so TypeScript cannot
 * infer `P` from the props and falls through to its `props: never` overload.
 * The cast is type-level only; the runtime component is untouched.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WebView = RawWebView as unknown as ComponentType<any>

export type HanziStageMode = "demo" | "quiz"

/**
 * How fast the demo animation runs. `slow` is for a learner following a stroke
 * with their eye or their hand rather than watching the character appear.
 */
export type HanziStageSpeed = "normal" | "slow"

const GAP = 10

/**
 * hanzi-writer's own contract: a list of SVG path strings and one median per
 * stroke.
 *
 * Checked because this is third-party data going straight into a WebView. The
 * blast radius is small — hanzi-writer turns it into path geometry, not script —
 * but "small" is an argument for validating cheaply, not for trusting.
 */
function isCharacterJson(value: unknown): value is CharacterJson {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    Array.isArray(candidate.strokes) &&
    candidate.strokes.length > 0 &&
    candidate.strokes.every((stroke) => typeof stroke === "string") &&
    Array.isArray(candidate.medians) &&
    candidate.medians.length === candidate.strokes.length
  )
}

/**
 * Stroke data for one character, from the shards this app bundles.
 *
 * **No network fallback.** The shards are generated from the characters our
 * own content can put in front of a learner, so coverage is a property of the
 * build (`scripts/build-hanzi-shards.mjs` reports what it could not cover). For
 * the ~4% of characters the dataset has no data for at all, the answer is
 * "Stroke data unavailable" either way — a network fetch would only add a way
 * to fail, and would make offline stroke order depend on a third party.
 */
async function loadCharData(char: string): Promise<CharacterJson | null> {
  try {
    const bundled = await bundledCharacterData(char)
    if (bundled && isCharacterJson(bundled)) return bundled
  } catch {
    // A failed shard read is the same "unavailable" answer as absent data.
  }
  return null
}

interface Props {
  /** One or more Han characters — a whole word. Each renders as its own writer. */
  character: string
  mode: HanziStageMode
  /** Shows a faint reference outline of the target character behind the drawing area. */
  showOutline?: boolean
  /** Draws the 米字格 practice grid behind each glyph. */
  showGuides?: boolean
  /** Bump to flash the stroke the learner is currently expected to draw. */
  hintKey?: number
  /** Bump to reveal the finished character over the drawing area. */
  revealKey?: number
  /** Bump to restart the demo or reset a quiz attempt for the same word. */
  resetKey?: number | string
  speed?: HanziStageSpeed
  /**
   * Keeps the finished character painted in the stroke colour once a quiz is
   * complete. hanzi-writer fades drawn strokes out the moment an animation or
   * quiz ends, so without it the learner is left looking at the grey outline
   * the instant they finish.
   */
  holdCharacterOnComplete?: boolean
  /**
   * Fired on every accepted stroke, with figures for the **whole word**. A
   * multi-character word is quizzed one glyph at a time, but a caller showing
   * "7 / 12" means the word, so the per-glyph numbers are summed here.
   */
  onQuizProgress?: (strokesRemaining: number, totalMistakes: number) => void
  onQuizComplete?: (totalMistakes: number) => void
  onDemoComplete?: () => void
  maxSize?: number
}

export function HanziStage({
  character,
  mode,
  showOutline = true,
  showGuides = false,
  hintKey = 0,
  revealKey = 0,
  resetKey,
  speed = "normal",
  holdCharacterOnComplete = false,
  onQuizProgress,
  onQuizComplete,
  onDemoComplete,
  maxSize = 360,
}: Props) {
  const chars = useMemo(() => [...character].filter(Boolean), [character])
  const [box, setBox] = useState<{ w: number; h: number } | null>(null)

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    const w = Math.floor(width)
    const h = Math.floor(height)
    if (w <= 0 || h <= 0) return
    setBox((prev) =>
      prev && Math.abs(prev.w - w) < 4 && Math.abs(prev.h - h) < 4
        ? prev
        : { w, h }
    )
  }

  const perCharSize = box
    ? Math.floor(
        Math.min(
          box.h,
          maxSize,
          (box.w - GAP * (chars.length - 1)) / chars.length
        )
      )
    : null

  // Multi-character words play one character at a time, left to right.
  const [activeIndex, setActiveIndex] = useState(0)
  const [wordComplete, setWordComplete] = useState(false)
  const completedIndexes = useRef(new Set<number>())
  const demoCompletedIndexes = useRef(new Set<number>())
  const totalMistakes = useRef(0)
  const glyphTotals = useRef<number[]>([])
  const glyphDrawn = useRef<number[]>([])

  useEffect(() => {
    completedIndexes.current = new Set()
    demoCompletedIndexes.current = new Set()
    totalMistakes.current = 0
    glyphDrawn.current = []
    setActiveIndex(0)
    setWordComplete(false)
  }, [character, mode, resetKey])

  useEffect(() => {
    glyphTotals.current = []
  }, [character])

  const handleGlyphProgress = (
    idx: number,
    strokesRemaining: number,
    mistakes: number
  ) => {
    glyphDrawn.current[idx] = (glyphDrawn.current[idx] ?? 0) + 1
    glyphTotals.current[idx] ??= strokesRemaining + glyphDrawn.current[idx]

    let remaining = 0
    for (let i = 0; i < chars.length; i++) {
      remaining += Math.max(
        0,
        (glyphTotals.current[i] ?? 0) - (glyphDrawn.current[i] ?? 0)
      )
    }
    onQuizProgress?.(remaining, totalMistakes.current + mistakes)
  }

  const handleGlyphQuizComplete = (idx: number, mistakes: number) => {
    completedIndexes.current.add(idx)
    totalMistakes.current += mistakes
    if (completedIndexes.current.size === chars.length) {
      setWordComplete(true)
      onQuizComplete?.(totalMistakes.current)
    } else if (idx === activeIndex) {
      setActiveIndex(idx + 1)
    }
  }

  const handleGlyphDemoComplete = (idx: number) => {
    demoCompletedIndexes.current.add(idx)
    if (demoCompletedIndexes.current.size === chars.length) {
      onDemoComplete?.()
    } else if (idx === activeIndex) {
      setActiveIndex(idx + 1)
    }
  }

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: GAP,
      }}
      onLayout={handleLayout}
    >
      {perCharSize &&
        chars.map((char, idx) => (
          <SingleGlyphStage
            // `speed` is in the key because the WebView is configured once, by
            // the `init` message — there is no way to retune a live writer.
            key={`${idx}-${char}-${mode}-${speed}-${resetKey}-${Math.round(perCharSize / 4) * 4}-${showOutline}`}
            char={char}
            mode={mode}
            speed={speed}
            showOutline={showOutline}
            showGuides={showGuides}
            hintKey={hintKey}
            revealKey={revealKey}
            size={perCharSize}
            holdCharacterOnComplete={holdCharacterOnComplete}
            active={idx === activeIndex}
            dimmed={!wordComplete && idx !== activeIndex}
            onStrokeTotal={(total) => {
              glyphTotals.current[idx] = total
            }}
            onQuizProgress={(remaining, mistakes) =>
              handleGlyphProgress(idx, remaining, mistakes)
            }
            onQuizComplete={(mistakes) =>
              handleGlyphQuizComplete(idx, mistakes)
            }
            onDemoComplete={() => handleGlyphDemoComplete(idx)}
          />
        ))}
    </View>
  )
}

interface GlyphProps {
  speed: HanziStageSpeed
  char: string
  mode: HanziStageMode
  showOutline: boolean
  showGuides: boolean
  hintKey: number
  revealKey: number
  size: number
  holdCharacterOnComplete: boolean
  /** Whether it's this character's turn — only the active glyph takes input. */
  active: boolean
  /**
   * Faded back because another character has the turn. Separate from `active`
   * so a finished word can show every glyph at full strength.
   */
  dimmed: boolean
  onStrokeTotal: (total: number) => void
  onQuizProgress?: (strokesRemaining: number, totalMistakes: number) => void
  onQuizComplete: (mistakes: number) => void
  onDemoComplete: () => void
}

function SingleGlyphStage({
  char,
  mode,
  speed,
  showOutline,
  showGuides,
  hintKey,
  revealKey,
  size,
  holdCharacterOnComplete,
  active,
  dimmed,
  onStrokeTotal,
  onQuizProgress,
  onQuizComplete,
  onDemoComplete,
}: GlyphProps) {
  const { paper } = useTheme()
  const script = useTargetScript()
  const webviewRef = useRef<InstanceType<typeof RawWebView>>(null)
  const startedRef = useRef(false)
  const webviewReadyRef = useRef(false)
  const initSentRef = useRef(false)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [strokeData, setStrokeData] = useState<CharacterJson | null>(null)

  const padding = Math.max(8, Math.round(size * 0.06))
  const drawingWidth = Math.max(3, Math.round(size / 60))
  const strokeWidth = Math.max(2, Math.round(size / 100))
  const showStartHint = mode === "quiz" && !showOutline

  useEffect(() => {
    let cancelled = false
    loadCharData(char)
      .then((data) => {
        if (cancelled) return
        if (!data) {
          setStatus("error")
          return
        }
        setStrokeData(data)
        onStrokeTotal(data.strokes.length)
      })
      .catch(() => {
        if (!cancelled) setStatus("error")
      })
    return () => {
      cancelled = true
    }
    // Keyed on the character alone. `onStrokeTotal` is an inline arrow from the
    // parent, so including it would refetch on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [char])

  const postToGlyph = (payload: object) => {
    webviewRef.current?.postMessage(JSON.stringify(payload))
  }

  const sendInit = () => {
    if (initSentRef.current || !strokeData || !webviewReadyRef.current) return
    initSentRef.current = true
    postToGlyph({
      type: "init",
      char,
      mode,
      speed,
      showOutline,
      showGuides,
      showStartHint,
      size,
      padding,
      drawingWidth,
      strokeWidth,
      strokeData,
      holdCharacterOnComplete,
    })
  }

  useEffect(() => {
    sendInit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokeData])

  // Hint/reveal are fire-and-forget pulses driven by a bumped counter. Skip the
  // initial value so mounting doesn't immediately hint or spoil a glyph.
  useEffect(() => {
    if (!hintKey || !active || status !== "ready") return
    postToGlyph({ type: "hint" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hintKey])

  useEffect(() => {
    if (!revealKey || !active || status !== "ready") return
    postToGlyph({ type: "reveal" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealKey])

  const processMessage = (data: string) => {
    let msg: {
      type: string
      strokesRemaining?: number
      totalMistakes?: number
    }
    try {
      msg = JSON.parse(data)
    } catch {
      return
    }

    if (msg.type === "ready") {
      webviewReadyRef.current = true
      sendInit()
    } else if (msg.type === "loadSuccess") {
      setStatus("ready")
    } else if (msg.type === "loadError") {
      setStatus("error")
    } else if (msg.type === "correctStroke") {
      playSound("stroke")
      // The lightest feel in the app. A stroke lands many times per character,
      // and anything heavier stops reading as confirmation by the fifth stroke.
      tick()
      onQuizProgress?.(msg.strokesRemaining ?? 0, msg.totalMistakes ?? 0)
    } else if (msg.type === "strokeHint") {
      // The writer has given up on this stroke and highlighted it. Sounded here
      // rather than in each screen, so every quiz gives the same feedback.
      playSound("gong")
      playSound("retry")
    } else if (msg.type === "demoComplete") {
      onDemoComplete()
    } else if (msg.type === "quizComplete") {
      onQuizComplete(msg.totalMistakes ?? 0)
    }
  }

  const handleMessage = (event: WebViewMessageEvent) =>
    processMessage(event.nativeEvent.data)

  // Only start animating/quizzing once this glyph has settled and it's its
  // turn. A char with no stroke data still counts as "done" so it doesn't
  // permanently block the characters after it in the same word.
  useEffect(() => {
    if (!active || status === "loading" || startedRef.current) return
    startedRef.current = true

    if (status === "error") {
      if (mode === "demo") onDemoComplete()
      else onQuizComplete(0)
      return
    }
    postToGlyph({ type: "start" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, status])

  if (Platform.OS === "web") {
    // react-native-webview has no web implementation and this app has no web
    // target in its build matrix, so the glyph degrades to the outlined
    // character rather than pretending a WebView exists.
    return (
      <View
        style={{
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
          opacity: dimmed ? 0.2 : 1,
        }}
      >
        <Text
          style={{
            fontFamily: hanziFont(script),
            fontSize: size * 0.7,
            color: paper.track,
          }}
        >
          {char}
        </Text>
      </View>
    )
  }

  return (
    <View
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: 16,
        opacity: dimmed ? 0.2 : 1,
      }}
      pointerEvents={active ? "auto" : "none"}
    >
      {status !== "error" && (
        <WebView
          ref={webviewRef}
          source={{ html: WRITER_HTML }}
          onMessage={handleMessage}
          /*
           * This document is static local HTML that draws one glyph. It has no
           * links, no forms and no reason to navigate anywhere, so say so —
           * `originWhitelist={['*']}` would let it navigate to any URL, which is
           * a permission nothing here needs.
           */
          originWhitelist={["about:blank"]}
          onShouldStartLoadWithRequest={(request: { url: string }) =>
            request.url === "about:blank"
          }
          setSupportMultipleWindows={false}
          scrollEnabled={false}
          bounces={false}
          style={{ width: size, height: size, backgroundColor: "transparent" }}
          containerStyle={{ backgroundColor: "transparent" }}
        />
      )}
      {status === "loading" && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator color={paper.green} />
        </View>
      )}
      {status === "error" && (
        <View
          style={{
            position: "absolute",
            top: 4,
            left: 4,
            right: 4,
            bottom: 4,
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            borderRadius: paper.radius.pill,
            backgroundColor: paper.cardAlt,
            padding: 8,
          }}
        >
          <Text
            style={{
              fontFamily: hanziFont(script),
              fontSize: size * 0.32,
              color: paper.inkMuted,
            }}
          >
            {char}
          </Text>
          <Text
            style={{
              fontFamily: families.nunitoSemiBold,
              fontSize: 10,
              lineHeight: 13,
              textAlign: "center",
              color: paper.inkMuted,
            }}
          >
            {PAPER_STROKE_UNAVAILABLE}
          </Text>
        </View>
      )}
    </View>
  )
}

/**
 * Replaced at module load by the locale layer's value, which is installed by
 * `src/i18n` before the first screen mounts. Kept as a mutable binding rather
 * than a hook call because HanziStage renders inside a WebView-adjacent tree
 * that must not re-render the WebView on a locale change.
 */
export let PAPER_STROKE_UNAVAILABLE = "Stroke data unavailable"
export function setStrokeUnavailableLabel(label: string) {
  PAPER_STROKE_UNAVAILABLE = label
}
