export interface ConversationEntry {
  id: string
  title: string
  turns: Array<{
    speaker: string
    hanzi: string
    pinyin: string
    translation: string
  }>
  examMappings?: Record<string, string | number>
}
