"use client"

import { useState, useEffect, useCallback, useMemo, memo } from "react"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import { Card, Button, Badge, SectionHeader } from "@/components/ui"
import { shuffle, cn } from "@/lib/utils"
import { play } from "@/lib/audio"
import { imageUrl } from "@/lib/image"
import { eloOf } from "@/lib/elo"
import {
  EXAM_BADGE_COLORS,
  EXAM_DEFINITIONS,
  useExamConfig,
} from "@/lib/exam-definitions"
import { useExamCards } from "@/lib/exam-cards"
import { useVocabulary } from "@/lib/vocabulary"
import { useProgress } from "@/stores/progress"
import { useTranslation } from "@/i18n/locale-context"
import type { VocabWord, ExamType, HskLevel, AssessmentAttempt } from "@/types"
import { isCharScript } from "@/lib/languages"
import {
  Play,
  SkipBack,
  SkipForward,
  Check,
  X,
  Clock,
  BookOpen,
  ImageIcon,
  Loader2,
} from "lucide-react"

type StimulusType = "text" | "audio" | "image" | "audio+image" | "chart"

interface ExamQuestion {
  id: string
  stimulusType: StimulusType
  instruction: string
  /** Text shown as the prompt (could be hanzi, pinyin, translation, etc.) */
  prompt: string
  /** Audio text to speak via TTS (only for audio/audio+image types) */
  audioText?: string
  /** Image description or URL placeholder */
  imageDesc?: string
  /** Answer choices */
  options: string[]
  correctAnswer: string
  userAnswer?: string
  word: VocabWord
  section: string
}

function useExamQuestions(
  examType: ExamType,
  level: string,
  totalQuestions: number,
  vocabulary: VocabWord[]
) {
  return useMemo(() => {
    const allWords = vocabulary.filter((w) =>
      Boolean(w.examMappings?.[examType])
    )
    if (allWords.length === 0) return []

    const def = EXAM_DEFINITIONS[examType]
    const levelIndex = def ? def.levels.indexOf(level) : -1
    const isBeginner = levelIndex <= 1

    let levelWords: VocabWord[]
    if (examType === "hsk") {
      levelWords = vocabulary.filter(
        (w) => w.hsk === (parseInt(level) as HskLevel)
      )
    } else {
      levelWords = allWords.filter((w) => {
        const mapping =
          w.examMappings?.[examType as keyof typeof w.examMappings]
        return String(mapping) === level
      })
    }

    if (levelWords.length === 0)
      levelWords = allWords.slice(0, Math.min(totalQuestions, allWords.length))

    const shuffled = shuffle([...levelWords])
    const generated: ExamQuestion[] = []
    let qId = 0

    const sectionSize = Math.floor(totalQuestions / 4)
    const pick = (pool: VocabWord[], count: number) =>
      pool.slice(0, Math.min(count, pool.length))

    /** Canonical script text + romanization for a word (language-agnostic). */
    const script = (w: VocabWord): string => w.text ?? w.hanzi ?? ""
    const roman = (w: VocabWord): string =>
      w.romanization ?? w.pinyin ?? w.translation
    const others = (word: VocabWord, field: "script" | "roman"): string[] =>
      shuffle(
        levelWords
          .filter((w) => w.id !== word.id)
          .slice(0, 3)
          .map((w) => (field === "script" ? script(w) : roman(w)))
      )

    const hasCharScript =
      levelWords.length > 0 && isCharScript(levelWords[0].language)
    const scriptLabel = hasCharScript ? "character" : "word"

    // Section 1: Varies by exam level (stimulus type). Image stimulus only for
    // A-band words (image pipeline scope: level<=2 / Elo <=1100).
    const s1Words = pick(shuffled, sectionSize)

    for (const word of s1Words) {
      const wrong = others(word, "script")
      const usesImage = eloOf(word) <= 1100
      if (usesImage) {
        generated.push({
          id: `q${qId++}`,
          stimulusType: "image",
          instruction: `Select the ${scriptLabel} that matches the image`,
          prompt: `[Image: ${word.translation}]`,
          imageDesc: word.translation,
          options: shuffle([script(word), ...wrong]),
          correctAnswer: script(word),
          word,
          section: "Recognition",
        })
      } else {
        generated.push({
          id: `q${qId++}`,
          stimulusType: "text",
          instruction: `Select the correct ${scriptLabel}`,
          prompt: word.translation
            ? `Which ${scriptLabel} means "${word.translation}"?`
            : `Which ${scriptLabel} is "${roman(word)}"?`,
          options: shuffle([script(word), ...wrong]),
          correctAnswer: script(word),
          word,
          section: "Vocabulary",
        })
      }
    }

    // Section 2: Romanization/script → script (audio if beginner, text otherwise)
    const s2Words = pick(shuffled.slice(sectionSize), sectionSize)
    const audioExams = ["hsk", "tocfl", "jlpt", "goethe", "toefl"]
    for (const word of s2Words) {
      const wrong = others(word, "script")
      const useAudio = isBeginner && audioExams.includes(examType)
      generated.push({
        id: `q${qId++}`,
        stimulusType: useAudio ? "audio" : "text",
        instruction: useAudio
          ? `Listen and select the correct ${scriptLabel}`
          : `Select the ${scriptLabel} for this ${hasCharScript ? "pinyin" : "word"}`,
        prompt: useAudio ? "(Press play to hear the word)" : roman(word),
        audioText: useAudio ? script(word) : undefined,
        options: shuffle([script(word), ...wrong]),
        correctAnswer: script(word),
        word,
        section: "Listening",
      })
    }

    // Section 3: script → reading/meaning
    const s3Words = pick(shuffled.slice(sectionSize * 2), sectionSize)
    for (const word of s3Words) {
      const wrong = others(word, "roman")
      generated.push({
        id: `q${qId++}`,
        stimulusType: "text",
        instruction: hasCharScript
          ? "What is the pronunciation for this character?"
          : "What is the reading/meaning for this word?",
        prompt: script(word),
        options: shuffle([roman(word), ...wrong]),
        correctAnswer: roman(word),
        word,
        section: "Reading",
      })
    }

    // Section 4: Fill in blank (context)
    const s4Words = pick(shuffled.slice(sectionSize * 3), sectionSize)
    for (const word of s4Words) {
      if (!word.examples?.length) continue
      const ex = word.examples[0]
      const exText = ex.text ?? ex.hanzi ?? ""
      const wordText = script(word)
      if (!exText || !wordText) continue
      const wrong = others(word, "script").slice(0, 3)
      if (wrong.length < 2) continue
      generated.push({
        id: `q${qId++}`,
        stimulusType: "text",
        instruction: `Fill in the blank`,
        prompt: exText.includes(wordText)
          ? exText.replace(wordText, "______")
          : exText,
        options: shuffle([wordText, ...wrong]),
        correctAnswer: wordText,
        word,
        section: "Application",
      })
    }

    return generated.slice(0, totalQuestions)
  }, [examType, level, totalQuestions, vocabulary])
}

const QuestionRenderer = memo(function QuestionRenderer({
  question,
  selectedAnswer,
  onAnswer,
  onPlayAudio,
  audioLoading,
}: {
  question: ExamQuestion
  selectedAnswer?: string
  onAnswer: (answer: string) => void
  onPlayAudio: (text: string) => void
  audioLoading?: boolean
}) {
  const { t } = useTranslation()
  const [loadedImage, setLoadedImage] = useState<{
    word: unknown
    url: string
  } | null>(null)
  useEffect(() => {
    let cancelled = false
    const word = question.word
    if (!word) return
    imageUrl(word.translation ?? "").then((url) => {
      if (url && !cancelled) setLoadedImage({ word, url })
    })
    return () => {
      cancelled = true
    }
  }, [question.word])
  // Derived: no stale image leaks between questions, and no sync setState in effect.
  const stimulusImage =
    question.word && loadedImage?.word === question.word
      ? loadedImage.url
      : undefined
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-xs font-medium tracking-wider text-ink-soft uppercase">
          {question.section}
        </div>
        {question.stimulusType === "audio" && question.audioText && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPlayAudio(question.audioText!)}
            disabled={audioLoading}
          >
            {audioLoading ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-1 h-4 w-4" />
            )}
            {audioLoading ? t("common.loading") : t("examLevel.playAudio")}
          </Button>
        )}
        {question.stimulusType === "image" && (
          <div className="flex min-h-32 items-center justify-center overflow-hidden rounded-lg border border-line bg-sunken/50">
            {stimulusImage ? (
              <Image
                src={stimulusImage}
                alt={question.imageDesc || question.word.translation}
                width={512}
                height={512}
                className="max-h-48 object-contain p-2"
                loading="lazy"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 py-6">
                <ImageIcon className="h-8 w-8 text-ink-soft/40" />
                <span className="text-sm text-ink-soft">
                  {question.imageDesc
                    ? `[Image: ${question.imageDesc}]`
                    : t("examLevel.imagePlaceholder")}
                </span>
              </div>
            )}
          </div>
        )}
        <div className="text-lg leading-relaxed font-medium">
          {question.prompt}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {question.options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => onAnswer(option)}
            className={cn(
              "rounded-lg border p-4 text-left text-sm transition-colors",
              selectedAnswer === option
                ? "border-accent bg-accent-soft"
                : "border-line hover:border-line-strong"
            )}
          >
            <span className="mr-2 font-medium">
              {String.fromCharCode(65 + idx)}.
            </span>
            {option}
          </button>
        ))}
      </div>
    </div>
  )
})

const ResultIcon = memo(function ResultIcon({ correct }: { correct: boolean }) {
  return correct ? (
    <Check className="h-4 w-4 text-success" />
  ) : (
    <X className="h-4 w-4 text-danger" />
  )
})

export default function DynamicExamPage() {
  const params = useParams()
  const router = useRouter()
  const examType = params.examType as ExamType
  const level = decodeURIComponent(params.level as string)
  const { t } = useTranslation()
  const vocabulary = useVocabulary()
  const EXAM_CARDS = useExamCards()
  const examConfig = useExamConfig()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [isStarted, setIsStarted] = useState(false)
  const [audioLoading, setAudioLoading] = useState(false)
  const addAttempt = useProgress((s) => s.addAttempt)
  const addXp = useProgress((s) => s.addXp)
  const logStudy = useProgress((s) => s.logStudy)

  const card = EXAM_CARDS.find(
    (c) => c.examType === examType && c.level === level
  )
  const cardConfig = card
    ? {
        name: card.name,
        duration: card.duration,
        totalQuestions: card.questions,
        passingScore: card.passingScore,
      }
    : {
        name: `${examConfig.displayNames[examType] || examType} ${level}`,
        duration: 30,
        totalQuestions: 50,
        passingScore: 60,
      }

  const questions = useExamQuestions(
    examType,
    level,
    cardConfig.totalQuestions,
    vocabulary
  )

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }

  const handleSubmit = useCallback(() => {
    let correct = 0
    questions.forEach((q) => {
      if (answers[q.id] === q.correctAnswer) correct++
    })
    const finalScore = (correct / questions.length) * 100
    setScore(finalScore)
    setSubmitted(true)

    const attempt: AssessmentAttempt = {
      id: crypto.randomUUID(),
      assessmentId: `${examType}-${level}-${Date.now()}`,
      startedAt: new Date(Date.now() - elapsed * 1000).toISOString(),
      finishedAt: new Date().toISOString(),
      score: finalScore,
      correct,
      total: questions.length,
      timeSec: elapsed,
      bySkill: {},
      wrongExerciseIds: questions
        .filter((q) => answers[q.id] !== q.correctAnswer)
        .map((q) => q.id),
    }
    addAttempt(attempt)
    const xpGain = Math.round((finalScore * questions.length) / 10)
    addXp(xpGain)
    logStudy(Math.ceil(elapsed / 60), "vocabulary", xpGain)
  }, [
    questions,
    answers,
    elapsed,
    examType,
    level,
    addAttempt,
    addXp,
    logStudy,
  ])

  useEffect(() => {
    if (!isStarted || submitted || timeLeft <= 0) return
    const timer = setInterval(() => {
      setTimeLeft((t) => t - 1)
      setElapsed((e) => e + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [isStarted, submitted, timeLeft])

  useEffect(() => {
    if (isStarted && !submitted && timeLeft === 0) {
      const id = setTimeout(handleSubmit, 0)
      return () => clearTimeout(id)
    }
  }, [isStarted, submitted, timeLeft, handleSubmit])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  const playAudio = (text: string) =>
    play(text, { onLoadingChange: setAudioLoading })
  const examColor = EXAM_BADGE_COLORS[examType] || "var(--accent)"

  const handleStart = () => {
    setTimeLeft(cardConfig.duration * 60)
    setElapsed(0)
    setIsStarted(true)
  }

  // Welcome screen
  if (!isStarted) {
    return (
      <div className="container mx-auto max-w-3xl p-6">
        <SectionHeader
          title={cardConfig.name}
          subtitle={t("examLevel.levelLabel", {
            name: examConfig.displayNames[examType] || examType,
            level,
          })}
        />
        {questions.length === 0 ? (
          <Card className="mt-6 p-8 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-ink-faint" />
            <p className="mt-3 text-sm text-ink-soft">
              {t("examLevel.noQuestions")}
            </p>
            <Button
              variant="outline"
              className="mt-5"
              onClick={() => router.push("/dashboard/exam")}
            >
              {t("examLevel.back")}
            </Button>
          </Card>
        ) : (
          <Card className="mt-6 space-y-4 p-6">
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${examColor}20` }}
              >
                <BookOpen className="h-4 w-4" style={{ color: examColor }} />
              </div>
              <span
                className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: `${examColor}20`,
                  color: examColor,
                  borderColor: examColor,
                }}
              >
                {examConfig.displayNames[examType] || examType} {level}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="text-ink-soft">{t("examLevel.duration")}</div>
                <div className="flex items-center gap-1 font-medium">
                  <Clock className="h-4 w-4" />{" "}
                  {t("examLevel.minutes", { n: String(cardConfig.duration) })}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-ink-soft">{t("examLevel.questions")}</div>
                <div className="font-medium">{cardConfig.totalQuestions}</div>
              </div>
              <div className="space-y-1">
                <div className="text-ink-soft">
                  {t("examLevel.passingScore")}
                </div>
                <div className="font-medium">{cardConfig.passingScore}%</div>
              </div>
              <div className="space-y-1">
                <div className="text-ink-soft">{t("examLevel.format")}</div>
                <div className="font-medium">
                  {t("examLevel.multipleChoice")}
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="mb-2 text-sm font-semibold">
                {t("examLevel.sections")}
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-ink-soft">
                <span>
                  {questions.filter(
                    (q) =>
                      q.section === "Recognition" || q.section === "Vocabulary"
                  ).length > 0
                    ? t("examLevel.vocabRecognition")
                    : ""}
                </span>
                <span>
                  {questions.filter((q) => q.section === "Listening").length > 0
                    ? t("examLevel.listening")
                    : ""}
                </span>
                <span>
                  {questions.filter((q) => q.section === "Reading").length > 0
                    ? t("examLevel.reading")
                    : ""}
                </span>
                <span>
                  {questions.filter((q) => q.section === "Application").length >
                  0
                    ? t("examLevel.application")
                    : ""}
                </span>
              </div>
            </div>

            <Button onClick={handleStart} className="w-full">
              {t("exam.start")}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/exam")}
              className="w-full"
            >
              {t("examLevel.back")}
            </Button>
          </Card>
        )}
      </div>
    )
  }

  // Results screen
  if (submitted) {
    const passed = score >= cardConfig.passingScore
    const correctCount = questions.filter(
      (q) => answers[q.id] === q.correctAnswer
    ).length
    return (
      <div className="container mx-auto max-w-3xl p-6">
        <SectionHeader title={t("examLevel.results")} />
        <Card className="mt-6 p-6">
          <div className="space-y-4 text-center">
            <div
              className={cn(
                "font-display text-6xl font-bold",
                passed ? "text-success" : "text-danger"
              )}
            >
              {score.toFixed(1)}%
            </div>
            <div className="text-xl font-medium">
              {passed ? t("examLevel.passed") : t("examLevel.keepPracticing")}
            </div>
            <div className="text-sm text-ink-soft">
              {t("examLevel.correctCount", {
                n: String(correctCount),
                total: String(questions.length),
              })}
            </div>
            <Badge tone={passed ? "success" : "danger"}>
              {passed ? t("examLevel.passedBadge") : t("examLevel.failedBadge")}
            </Badge>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                {t("examLevel.retake")}
              </Button>
              <Button onClick={() => router.push("/dashboard/exam")}>
                {t("examLevel.backToExams")}
              </Button>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="mb-4 font-semibold">
              {t("examLevel.reviewAnswers")}
            </h3>
            <div className="max-h-96 space-y-3 overflow-y-auto">
              {questions.map((q, idx) => {
                const isCorrect = answers[q.id] === q.correctAnswer
                return (
                  <div key={q.id} className="rounded-lg border p-4 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 font-medium">
                          {t("examLevel.question", { n: String(idx + 1) })}{" "}
                          <span className="text-xs text-ink-soft">
                            ({q.section})
                          </span>
                        </div>
                        <div className="mb-2 truncate text-ink-soft">
                          {q.prompt}
                        </div>
                        <div className="space-y-0.5">
                          <div>
                            {t("examLevel.yourAnswer")}{" "}
                            <span
                              className={
                                isCorrect
                                  ? "font-medium text-success"
                                  : "font-medium text-danger"
                              }
                            >
                              {answers[q.id] || t("examLevel.notAnswered")}
                            </span>
                          </div>
                          {!isCorrect && (
                            <div>
                              {t("examLevel.correctAnswer")}{" "}
                              <span className="font-medium text-success">
                                {q.correctAnswer}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <ResultIcon correct={isCorrect} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Active exam
  const currentQuestion = questions[currentIndex]
  if (!currentQuestion) {
    return (
      <div className="container mx-auto max-w-3xl p-6">
        <Card className="p-6">
          <p className="text-ink-soft">{t("examLevel.noQuestionsLoaded")}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold">
            {t("exam.question", {
              n: String(currentIndex + 1),
              total: String(questions.length),
            })}
          </h1>
          <p className="text-sm text-ink-soft">{currentQuestion.section}</p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium",
              timeLeft < 300 && "text-danger"
            )}
          >
            <Clock className="h-4 w-4" />
            {formatTime(timeLeft)}
          </div>
          <div className="text-xs text-ink-soft">
            {Object.keys(answers).length}/{questions.length}
          </div>
        </div>
      </div>

      <Card className="p-6">
        <QuestionRenderer
          question={currentQuestion}
          selectedAnswer={answers[currentQuestion.id]}
          onAnswer={(answer) => handleAnswer(currentQuestion.id, answer)}
          onPlayAudio={playAudio}
          audioLoading={audioLoading}
        />

        <div className="mt-6 flex justify-between border-t pt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            <SkipBack className="mr-1 h-4 w-4" /> {t("examLevel.previous")}
          </Button>
          {currentIndex < questions.length - 1 ? (
            <Button onClick={() => setCurrentIndex(currentIndex + 1)}>
              {t("assessment.next")} <SkipForward className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit}>{t("examLevel.submit")}</Button>
          )}
        </div>
      </Card>

      <Card className="mt-4 p-4">
        <div className="mb-3 text-sm font-medium">{t("nav.progress")}</div>
        <div className="flex flex-wrap gap-2">
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                "h-8 w-8 rounded text-xs font-medium transition-colors",
                idx === currentIndex && "bg-accent text-accent-ink",
                idx !== currentIndex &&
                  answers[q.id] &&
                  "bg-sunken text-success",
                idx !== currentIndex &&
                  !answers[q.id] &&
                  "bg-sunken text-ink-faint"
              )}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}
