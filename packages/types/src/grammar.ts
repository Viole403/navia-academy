export interface GrammarPoint {
  id: string
  pattern: string
  explanation: string
  examples: Array<{ hanzi: string; pinyin: string; translation: string }>
  examMappings?: Record<string, string | number>
}
