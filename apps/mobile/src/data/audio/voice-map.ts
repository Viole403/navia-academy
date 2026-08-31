export type VoiceLocale = "zh-CN" | "zh-TW" | "zh-HK"
export type VoiceGender = "female" | "male"

export type VoiceMap = Record<VoiceLocale, Record<VoiceGender, string>>

export const VOICE_MAP: VoiceMap = {
  "zh-CN": {
    female: "zh-CN-XiaoxiaoNeural",
    male: "zh-CN-YunxiNeural",
  },
  "zh-TW": {
    female: "zh-TW-HsiaoYuNeural",
    male: "zh-TW-YunJheNeural",
  },
  "zh-HK": {
    female: "zh-HK-HiuGaaiNeural",
    male: "zh-HK-WanLungNeural",
  },
}

export function resolveVoice(locale: VoiceLocale, gender: VoiceGender): string {
  return VOICE_MAP[locale]?.[gender] ?? VOICE_MAP["zh-CN"].female
}

export function localeForExam(examType: string): VoiceLocale {
  switch (examType) {
    case "tocfl":
      return "zh-TW"
    case "hsk":
      return "zh-CN"
    default:
      return "zh-CN"
  }
}

// Traditional-only characters (never appear in simplified script). Any match
// in the string marks the text as zh-TW, regardless of trailing punctuation.
const TRADITIONAL_PATTERN =
  /[來個們別問單嗎國場夠媽學寫對師幫幾後從愛時書會東條樣歡歲氣沒灣為無現當習聽與興萬裏裡見話認語說課請謝識讀貓買賣車轉近這進運過遠還邊錢錯鐘門開間關隻頭題風飛飯馬體魚鳥麗麵麼點龍龜]/

export function detectLocale(text: string, examType?: string): VoiceLocale {
  if (examType === "tocfl") return "zh-TW"
  if (examType === "hsk") return "zh-CN"
  if (TRADITIONAL_PATTERN.test(text)) return "zh-TW"
  return "zh-CN"
}
