export interface VocabularyEntry {
  id: string
  hanzi: string
  pinyin: string
  translation: string
  traditional?: string
  examMappings?: Record<string, string | number>
  examples?: Array<{ hanzi: string; pinyin: string; translation: string }>
  tags?: string[]
}
