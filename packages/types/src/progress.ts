export interface UserProgress {
  userId: string
  xp: number
  streak: number
  lastStudyDate?: string
  level: number
  achievements: string[]
}

export interface StudySession {
  id: string
  userId: string
  minutes: number
  xp: number
  createdAt: string
}
