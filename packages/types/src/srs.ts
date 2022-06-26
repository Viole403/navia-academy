export interface SRSCard {
  id: string
  userId: string
  itemId: string
  kind: string
  interval: number
  ease: number
  dueDate: string
  repetitions: number
}

export interface SRSReview {
  cardId: string
  quality: number
  reviewedAt: string
}
