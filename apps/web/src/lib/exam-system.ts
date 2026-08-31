import type { VocabWord, HskLevel, ExamType } from "@/types"
import { getCanonicalText, getCanonicalRomanization } from "@/lib/data-bridge"

export type QuestionType =
  | "multiple_choice"
  | "fill_blank"
  | "matching"
  | "pronunciation"
  | "translation"
  | "sentence_formation"

export type Difficulty = "easy" | "medium" | "hard"

export interface ExamQuestion {
  id: string
  type: QuestionType
  difficulty: Difficulty
  examType: ExamType
  examLevel: string
  hskLevel: HskLevel

  // Question content
  prompt: string
  promptChinese?: string

  // Answer options (varies by question type)
  options?: string[]
  correctAnswer: string | string[]
  explanation?: string

  // Metadata
  vocabularyId?: string // Reference to vocabulary word
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

export interface ExamSession {
  id: string
  userId: string
  examType: ExamType
  examLevel: string

  // Session state
  status: "pending" | "in_progress" | "completed" | "abandoned"
  currentQuestionIndex: number
  questions: ExamQuestion[]
  answers: Record<string, string | string[]> // questionId -> answer

  // Timing
  startedAt: Date
  completedAt?: Date
  timeLimit?: number // seconds
  timeRemaining?: number

  // Settings
  questionCount: number
  questionTypes: QuestionType[]
  difficultyRange: Difficulty[]
}

export interface ExamResult {
  id: string
  sessionId: string
  userId: string
  examType: ExamType
  examLevel: string

  // Scores
  totalQuestions: number
  correctAnswers: number
  score: number // percentage
  passingScore: number // required to pass

  // Detailed breakdown
  byQuestionType: Record<QuestionType, { correct: number; total: number }>
  byDifficulty: Record<Difficulty, { correct: number; total: number }>

  // Timing
  timeTaken: number // seconds
  averageTimePerQuestion: number

  // Recommendations
  recommendedNextLevel?: string
  weakAreas?: string[]
  strengths?: string[]

  createdAt: Date
}

export interface ExamProgress {
  userId: string
  examType: ExamType

  // Overall progress
  levelsCompleted: string[]
  currentLevel?: string
  highestScore: number
  averageScore: number
  totalAttempts: number

  // Performance by level
  byLevel: Record<
    string,
    {
      attempts: number
      bestScore: number
      averageScore: number
      lastAttempt: Date
      completed: boolean
    }
  >

  // Weak areas
  weakQuestionTypes: QuestionType[]
  weakDifficultyLevels: Difficulty[]

  updatedAt: Date
}

// Question generators
export function generateMultipleChoiceQuestion(
  word: VocabWord,
  examType: ExamType,
  level: string,
  difficulty: Difficulty
): ExamQuestion {
  const distractors = generateDistractors(word, difficulty)

  const script = getCanonicalText(word)
  const roman = getCanonicalRomanization(word) ?? ""
  const hsk = (word.level ?? word.hsk ?? 1) as HskLevel

  return {
    id: `mc_${word.id}_${Date.now()}`,
    type: "multiple_choice",
    difficulty,
    examType,
    examLevel: level,
    hskLevel: hsk,
    prompt: `What does "${script}" mean?`,
    promptChinese:
      word.language === "zh" ? `"${script}" 是什么意思？` : undefined,
    options: shuffleArray([word.translation, ...distractors]),
    correctAnswer: word.translation,
    explanation:
      word.language === "zh"
        ? `${script} (${roman}) means "${word.translation}".`
        : `${script} means "${word.translation}".`,
    vocabularyId: word.id,
    tags: ["vocabulary", "meaning", word.pos, ...word.tags],
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

export function generateFillBlankQuestion(
  word: VocabWord,
  examType: ExamType,
  level: string,
  difficulty: Difficulty
): ExamQuestion {
  const script = getCanonicalText(word)
  const roman = getCanonicalRomanization(word) ?? ""
  const example = word.examples[0]
  const exampleText = example.text ?? example.hanzi ?? ""
  const blankedSentence = exampleText.replace(script, "_____")

  return {
    id: `fb_${word.id}_${Date.now()}`,
    type: "fill_blank",
    difficulty,
    examType,
    examLevel: level,
    hskLevel: (word.level ?? word.hsk ?? 1) as HskLevel,
    prompt: `Fill in the blank: "${blankedSentence}"`,
    promptChinese:
      word.language === "zh" ? `填空: "${blankedSentence}"` : undefined,
    correctAnswer: script,
    explanation:
      word.language === "zh"
        ? `The correct word is "${script}" (${roman}) which means "${word.translation}".`
        : `The correct word is "${script}" which means "${word.translation}".`,
    vocabularyId: word.id,
    tags: ["vocabulary", "fill_blank", "sentence", word.pos, ...word.tags],
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

export function generateMatchingQuestion(
  words: VocabWord[],
  examType: ExamType,
  level: string,
  difficulty: Difficulty
): ExamQuestion {
  const pairs = words.map((word) => ({
    chinese: getCanonicalText(word),
    english: word.translation,
    pinyin: getCanonicalRomanization(word) ?? "",
  }))

  return {
    id: `match_${Date.now()}`,
    type: "matching",
    difficulty,
    examType,
    examLevel: level,
    hskLevel: Math.max(...words.map((w) => w.level ?? w.hsk ?? 1)) as HskLevel,
    prompt:
      words[0]?.language === "zh"
        ? "Match the Chinese words with their English meanings:"
        : "Match the words with their English meanings:",
    promptChinese:
      words[0]?.language === "zh" ? "匹配中文词语和英文意思:" : undefined,
    correctAnswer: pairs.map((p) => `${p.chinese}:${p.english}`),
    explanation: pairs
      .map((p) => `${p.chinese} (${p.pinyin}) = ${p.english}`)
      .join("; "),
    tags: ["vocabulary", "matching", ...words.flatMap((w) => w.tags)],
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

export function generatePronunciationQuestion(
  word: VocabWord,
  examType: ExamType,
  level: string,
  difficulty: Difficulty
): ExamQuestion {
  const script = getCanonicalText(word)
  const roman = getCanonicalRomanization(word)
  if (!roman) {
    // Non-pinyin languages can't have pronunciation questions
    throw new Error(
      "Pronunciation questions only supported for languages with romanization (zh, ja)"
    )
  }
  const options = generatePinyinDistractors(word, difficulty)

  return {
    id: `pron_${word.id}_${Date.now()}`,
    type: "pronunciation",
    difficulty,
    examType,
    examLevel: level,
    hskLevel: (word.level ?? word.hsk ?? 1) as HskLevel,
    prompt:
      word.language === "zh"
        ? `What is the correct pinyin for "${script}"?`
        : `What is the correct reading for "${script}"?`,
    promptChinese:
      word.language === "zh" ? `"${script}" 的正确拼音是什么？` : undefined,
    options: shuffleArray([roman, ...options]),
    correctAnswer: roman,
    explanation:
      word.language === "zh"
        ? `The correct pinyin for ${script} is "${roman}".`
        : `The correct reading for ${script} is "${roman}".`,
    vocabularyId: word.id,
    tags: ["pronunciation", "pinyin", word.pos, ...word.tags],
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// Helper functions
function generateDistractors(
  word: VocabWord,
  difficulty: Difficulty
): string[] {
  const distractors: string[] = []

  // For easy: similar sounding or common confusions
  if (difficulty === "easy") {
    distractors.push("person", "thing", "place", "action")
  }

  // For medium: related words from same HSK level
  if (difficulty === "medium") {
    distractors.push("study", "learn", "education", "knowledge")
  }

  // For hard: antonyms or specific confusions
  if (difficulty === "hard") {
    if (word.antonyms && word.antonyms.length > 0) {
      distractors.push(...word.antonyms)
    }
    if (word.synonyms && word.synonyms.length > 0) {
      distractors.push(...word.synonyms.slice(0, 2))
    }
  }

  return shuffleArray(distractors).slice(0, 3) // Return 3 distractors
}

function generatePinyinDistractors(
  word: VocabWord,
  difficulty: Difficulty
): string[] {
  const distractors: string[] = []
  const pinyin = word.pinyin

  // Common pinyin errors
  const tones = [1, 2, 3, 4, 0]

  if (difficulty === "easy") {
    // Change tones
    for (const tone of tones) {
      if (tone !== getToneFromPinyin(pinyin ?? "")) {
        const wrongPinyin = (pinyin ?? "").replace(/[1-4]/, tone.toString())
        distractors.push(wrongPinyin)
      }
    }
  }

  if (difficulty === "medium" || difficulty === "hard") {
    // Common pinyin confusions
    const confusions: Record<string, string[]> = {
      zh: ["z", "j"],
      ch: ["c", "q"],
      sh: ["s", "x"],
      ü: ["u", "v"],
      ian: ["ien", "yan"],
      uan: ["uen", "wan"],
    }

    for (const [correct, wrongs] of Object.entries(confusions)) {
      if ((pinyin ?? "").includes(correct)) {
        for (const wrong of wrongs) {
          distractors.push((pinyin ?? "").replace(correct, wrong))
        }
      }
    }
  }

  return shuffleArray(distractors).slice(0, 3)
}

function getToneFromPinyin(pinyin: string): number {
  const match = pinyin.match(/[1-4]/)
  return match ? parseInt(match[0]) : 0
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Exam creation
export function createExamSession(
  userId: string,
  examType: ExamType,
  examLevel: string,
  vocabulary: VocabWord[],
  settings: {
    questionCount: number
    questionTypes: QuestionType[]
    difficultyRange: Difficulty[]
    timeLimit?: number
  }
): ExamSession {
  const questions: ExamQuestion[] = []

  // Distribute questions by type
  const questionsPerType = Math.ceil(
    settings.questionCount / settings.questionTypes.length
  )

  for (const questionType of settings.questionTypes) {
    for (
      let i = 0;
      i < questionsPerType && questions.length < settings.questionCount;
      i++
    ) {
      const word = vocabulary[Math.floor(Math.random() * vocabulary.length)]
      const difficulty =
        settings.difficultyRange[
          Math.floor(Math.random() * settings.difficultyRange.length)
        ]

      let question: ExamQuestion

      switch (questionType) {
        case "multiple_choice":
          question = generateMultipleChoiceQuestion(
            word,
            examType,
            examLevel,
            difficulty
          )
          break
        case "fill_blank":
          question = generateFillBlankQuestion(
            word,
            examType,
            examLevel,
            difficulty
          )
          break
        case "pronunciation":
          question = generatePronunciationQuestion(
            word,
            examType,
            examLevel,
            difficulty
          )
          break
        case "matching":
          // For matching, need multiple words
          const matchingWords = vocabulary.slice(0, 4) // Use first 4 words
          question = generateMatchingQuestion(
            matchingWords,
            examType,
            examLevel,
            difficulty
          )
          break
        default:
          // Default to multiple choice
          question = generateMultipleChoiceQuestion(
            word,
            examType,
            examLevel,
            difficulty
          )
      }

      questions.push(question)
    }
  }

  // Shuffle questions
  const shuffledQuestions = shuffleArray(questions).slice(
    0,
    settings.questionCount
  )

  return {
    id: `exam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    examType,
    examLevel,
    status: "pending",
    currentQuestionIndex: 0,
    questions: shuffledQuestions,
    answers: {},
    startedAt: new Date(),
    questionCount: settings.questionCount,
    questionTypes: settings.questionTypes,
    difficultyRange: settings.difficultyRange,
    timeLimit: settings.timeLimit,
    timeRemaining: settings.timeLimit,
  }
}

// Scoring
export function calculateScore(
  session: ExamSession,
  answers: Record<string, string | string[]>
): ExamResult {
  let correctAnswers = 0
  const byQuestionType: Record<
    QuestionType,
    { correct: number; total: number }
  > = {
    multiple_choice: { correct: 0, total: 0 },
    fill_blank: { correct: 0, total: 0 },
    matching: { correct: 0, total: 0 },
    pronunciation: { correct: 0, total: 0 },
    translation: { correct: 0, total: 0 },
    sentence_formation: { correct: 0, total: 0 },
  }

  const byDifficulty: Record<Difficulty, { correct: number; total: number }> = {
    easy: { correct: 0, total: 0 },
    medium: { correct: 0, total: 0 },
    hard: { correct: 0, total: 0 },
  }

  for (const question of session.questions) {
    const userAnswer = answers[question.id]
    const isCorrect = checkAnswer(question, userAnswer)

    // Update counts
    byQuestionType[question.type].total++
    byDifficulty[question.difficulty].total++

    if (isCorrect) {
      correctAnswers++
      byQuestionType[question.type].correct++
      byDifficulty[question.difficulty].correct++
    }
  }

  const score = (correctAnswers / session.questions.length) * 100
  const timeTaken = session.completedAt
    ? (session.completedAt.getTime() - session.startedAt.getTime()) / 1000
    : 0

  // Determine weak areas
  const weakAreas: string[] = []
  for (const [type, stats] of Object.entries(byQuestionType)) {
    if (stats.total > 0 && stats.correct / stats.total < 0.6) {
      weakAreas.push(`${type.replace("_", " ")} questions`)
    }
  }

  // Determine strengths
  const strengths: string[] = []
  for (const [difficulty, stats] of Object.entries(byDifficulty)) {
    if (stats.total > 0 && stats.correct / stats.total >= 0.8) {
      strengths.push(`${difficulty} difficulty`)
    }
  }

  // Recommend next level if score is high
  let recommendedNextLevel: string | undefined
  if (score >= 80) {
    const levels = [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "Novice 1",
      "Novice 2",
      "Level 1",
      "Level 2",
      "Level 3",
      "Level 4",
      "Level 5",
    ]
    const currentIndex = levels.indexOf(session.examLevel)
    if (currentIndex < levels.length - 1) {
      recommendedNextLevel = levels[currentIndex + 1]
    }
  }

  return {
    id: `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sessionId: session.id,
    userId: session.userId,
    examType: session.examType,
    examLevel: session.examLevel,
    totalQuestions: session.questions.length,
    correctAnswers,
    score,
    passingScore: 60, // Default passing score
    byQuestionType,
    byDifficulty,
    timeTaken,
    averageTimePerQuestion: timeTaken / session.questions.length,
    recommendedNextLevel,
    weakAreas,
    strengths,
    createdAt: new Date(),
  }
}

function checkAnswer(
  question: ExamQuestion,
  userAnswer: string | string[] | undefined
): boolean {
  if (!userAnswer) return false

  switch (question.type) {
    case "multiple_choice":
    case "pronunciation":
    case "fill_blank":
      return userAnswer === question.correctAnswer

    case "matching":
      if (
        !Array.isArray(userAnswer) ||
        !Array.isArray(question.correctAnswer)
      ) {
        return false
      }
      // For matching, check if all pairs are correct
      const userPairs = new Set(userAnswer)
      const correctPairs = new Set(question.correctAnswer as string[])
      return (
        userPairs.size === correctPairs.size &&
        Array.from(userPairs).every((pair) => correctPairs.has(pair))
      )

    default:
      return false
  }
}

// Progress tracking
export function updateExamProgress(
  currentProgress: ExamProgress | null | undefined,
  result: ExamResult
): ExamProgress {
  const now = new Date()

  if (!currentProgress) {
    return {
      userId: result.userId,
      examType: result.examType,
      levelsCompleted: [],
      highestScore: result.score,
      averageScore: result.score,
      totalAttempts: 1,
      byLevel: {},
      weakQuestionTypes: [],
      weakDifficultyLevels: [],
      updatedAt: now,
    }
  }

  // Update level stats
  const levelStats = currentProgress.byLevel[result.examLevel] || {
    attempts: 0,
    bestScore: 0,
    averageScore: 0,
    lastAttempt: now,
    completed: false,
  }

  levelStats.attempts++
  levelStats.bestScore = Math.max(levelStats.bestScore, result.score)
  levelStats.averageScore =
    (levelStats.averageScore * (levelStats.attempts - 1) + result.score) /
    levelStats.attempts
  levelStats.lastAttempt = now

  if (result.score >= result.passingScore && !levelStats.completed) {
    levelStats.completed = true
    if (!currentProgress.levelsCompleted.includes(result.examLevel)) {
      currentProgress.levelsCompleted.push(result.examLevel)
    }
  }

  currentProgress.byLevel[result.examLevel] = levelStats

  // Update overall stats
  currentProgress.highestScore = Math.max(
    currentProgress.highestScore,
    result.score
  )
  currentProgress.totalAttempts++
  currentProgress.averageScore =
    (currentProgress.averageScore * (currentProgress.totalAttempts - 1) +
      result.score) /
    currentProgress.totalAttempts

  // Update weak areas based on performance
  const weakTypes: QuestionType[] = []
  for (const [type, stats] of Object.entries(result.byQuestionType)) {
    if (stats.total > 0 && stats.correct / stats.total < 0.6) {
      weakTypes.push(type as QuestionType)
    }
  }
  currentProgress.weakQuestionTypes = weakTypes

  const weakDifficulties: Difficulty[] = []
  for (const [difficulty, stats] of Object.entries(result.byDifficulty)) {
    if (stats.total > 0 && stats.correct / stats.total < 0.6) {
      weakDifficulties.push(difficulty as Difficulty)
    }
  }
  currentProgress.weakDifficultyLevels = weakDifficulties

  // Determine current level (highest completed or most recent attempt)
  if (currentProgress.levelsCompleted.length > 0) {
    const levels = [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "Novice 1",
      "Novice 2",
      "Level 1",
      "Level 2",
      "Level 3",
      "Level 4",
      "Level 5",
    ]
    const completedLevels = currentProgress.levelsCompleted
      .filter((level) => levels.includes(level))
      .sort((a, b) => levels.indexOf(b) - levels.indexOf(a))

    if (completedLevels.length > 0) {
      const nextIndex = levels.indexOf(completedLevels[0]) + 1
      currentProgress.currentLevel =
        nextIndex < levels.length ? levels[nextIndex] : completedLevels[0]
    }
  }

  currentProgress.updatedAt = now

  return currentProgress
}
