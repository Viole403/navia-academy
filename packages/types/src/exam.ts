export interface ExamSession {
  id: number
  userId: string
  examType: string
  examLevel: string
  status: string
  score?: number
  startedAt: string
  completedAt?: string
}

export interface ExamResult {
  sessionId: number
  score: number
  total: number
  correct: number
  answers: Array<{
    questionId: string
    answer: string
    correct: boolean
  }>
}
