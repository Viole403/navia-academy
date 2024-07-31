export type VoiceLocale = "zh-CN" | "zh-TW" | "zh-HK" | "de-DE" | "ja-JP" | "en-US";
export type VoiceGender = "female" | "male";

export type VoiceMap = Record<VoiceLocale, Record<VoiceGender, string>>;

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
  "de-DE": {
    female: "de-DE-KatjaNeural",
    male: "de-DE-ConradNeural",
  },
  "ja-JP": {
    female: "ja-JP-NanamiNeural",
    male: "ja-JP-KeitaNeural",
  },
  "en-US": {
    female: "en-US-JennyNeural",
    male: "en-US-GuyNeural",
  },
};

export function resolveVoice(locale: VoiceLocale, gender: VoiceGender): string {
  return VOICE_MAP[locale]?.[gender] ?? VOICE_MAP["zh-CN"].female;
}

export function localeForExam(examType: string): VoiceLocale {
  const normalized = examType.toLowerCase();
  switch (normalized) {
    case "tocfl":
      return "zh-TW";
    case "hsk":
      return "zh-CN";
    case "goethe":
      return "de-DE";
    case "jlpt":
      return "ja-JP";
    case "toefl":
      return "en-US";
    default:
      return "zh-CN";
  }
}

// Traditional-only characters (never appear in simplified script). Any match
// in the string marks the text as zh-TW, regardless of trailing punctuation.
const TRADITIONAL_PATTERN = /[來個們別問單嗎國場夠媽學寫對師幫幾後從愛時書會東條樣歡歲氣沒灣為無現當習聽與興萬裏裡見話認語說課請謝識讀貓買賣車轉近這進運過遠還邊錢錯鐘門開間關隻頭題風飛飯馬體魚鳥麗麵麼點龍龜]/;

// Japanese patterns (Hiragana, Katakana, Kanji in Japanese context)
const HIRAGANA_PATTERN = /[\u3040-\u309f]/;
const KATAKANA_PATTERN = /[\u30a0-\u30ff]/;

// German patterns (umlauts and eszett)
const GERMAN_PATTERN = /[äöüßÄÖÜ]/;

export function detectLocale(text: string, examType?: string, language?: string): VoiceLocale {
  // Explicit language hint from data schema
  if (language === "de") return "de-DE";
  if (language === "ja") return "ja-JP";
  if (language === "en") return "en-US";
  if (language === "zh") {
    if (examType === "tocfl") return "zh-TW";
    if (examType === "hsk") return "zh-CN";
    if (TRADITIONAL_PATTERN.test(text)) return "zh-TW";
    return "zh-CN";
  }

  // Exam-based detection (fallback)
  if (examType) return localeForExam(examType);

  // Text-based detection (fallback)
  if (HIRAGANA_PATTERN.test(text) || KATAKANA_PATTERN.test(text)) return "ja-JP";
  if (GERMAN_PATTERN.test(text)) return "de-DE";
  if (TRADITIONAL_PATTERN.test(text)) return "zh-TW";
  
  // Chinese characters without clear script markers → default simplified
  if (/[\u4e00-\u9fff]/.test(text)) return "zh-CN";
  
  // Default to English for Latin script
  return "en-US";
}