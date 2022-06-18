export interface CharacterEntry {
  id: string
  char: string
  pinyin: string
  meaning: string
  strokes?: number
  radical?: string
  examMappings?: Record<string, string | number>
}
