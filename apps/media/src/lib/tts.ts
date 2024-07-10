import type { MediaConfig } from "./config";
import { resolveVoice } from "@navia/utils";

export type MediaGender = "female" | "male";
export type MediaLocale = "zh-CN" | "zh-TW" | "zh-HK" | "de-DE" | "ja-JP" | "en-US";

/** A usable TTS credential (pooled key or env fallback). */
export interface TtsKeyInput {
  apiKey: string;
  region?: string;
}

/** TTS engine order for the centralized pipeline (Edge → Google → Azure). */
export async function synthesizeAudio(
  cfg: MediaConfig,
  text: string,
  locale: MediaLocale,
  gender: MediaGender,
): Promise<Buffer> {
  if (cfg.ttsEngine === "google") return googleTTS(text, locale, gender);
  if (cfg.ttsEngine === "azure") return azureTTS(text, locale, gender);
  return edgeTTS(text, locale, gender);
}

/** Same dispatch, but with an explicit pooled key (falls back to env when omitted). */
export async function synthesizeAudioWithKey(
  cfg: MediaConfig,
  text: string,
  locale: MediaLocale,
  gender: MediaGender,
  key?: TtsKeyInput,
): Promise<Buffer> {
  if (cfg.ttsEngine === "google") return googleTTS(text, locale, gender, key?.apiKey);
  if (cfg.ttsEngine === "azure") return azureTTS(text, locale, gender, key?.apiKey, key?.region);
  return edgeTTS(text, locale, gender);
}

async function edgeTTS(text: string, locale: MediaLocale, gender: MediaGender): Promise<Buffer> {
  const { EdgeTTS } = await import("edge-tts-universal");
  const voice = resolveVoice(locale, gender);
  const tts = new EdgeTTS(text, voice);
  const result = await tts.synthesize();
  const arrayBuffer = await result.audio.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

const GOOGLE_VOICES: Record<string, Record<MediaGender, string>> = {
  "zh-CN": { female: "zh-CN-Standard-A", male: "zh-CN-Standard-B" },
  "zh-TW": { female: "zh-TW-Standard-A", male: "zh-TW-Standard-B" },
  "zh-HK": { female: "zh-HK-Standard-A", male: "zh-HK-Standard-B" },
  "de-DE": { female: "de-DE-Standard-A", male: "de-DE-Standard-B" },
  "ja-JP": { female: "ja-JP-Standard-A", male: "ja-JP-Standard-C" },
  "en-US": { female: "en-US-Standard-C", male: "en-US-Standard-D" },
};

async function googleTTS(
  text: string,
  locale: MediaLocale,
  gender: MediaGender,
  apiKey = process.env.GOOGLE_TTS_API_KEY ?? "",
): Promise<Buffer> {
  if (!apiKey) throw new Error("Google TTS: no API key (set GOOGLE_TTS_API_KEY or add a pooled 'google' key)");
  const voiceName = (GOOGLE_VOICES[locale] ?? GOOGLE_VOICES["zh-CN"])[gender];
  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: locale, name: voiceName },
        audioConfig: { audioEncoding: "MP3" },
      }),
    },
  );
  if (!res.ok) throw new Error(`Google TTS ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { audioContent?: string };
  if (!data.audioContent) throw new Error("Google TTS returned no audio");
  return Buffer.from(data.audioContent, "base64");
}

const AZURE_VOICES: Record<string, Record<MediaGender, { name: string; rate: string }>> = {
  "zh-CN": {
    female: { name: "zh-CN-XiaoxiaoNeural", rate: "-15%" },
    male: { name: "zh-CN-YunxiNeural", rate: "-10%" },
  },
  "zh-TW": {
    female: { name: "zh-TW-HsiaoChenNeural", rate: "-15%" },
    male: { name: "zh-TW-YunJheNeural", rate: "-10%" },
  },
  "zh-HK": {
    female: { name: "zh-HK-HiuGaaiNeural", rate: "-15%" },
    male: { name: "zh-HK-WanLungNeural", rate: "-10%" },
  },
  "de-DE": {
    female: { name: "de-DE-KatjaNeural", rate: "-10%" },
    male: { name: "de-DE-ConradNeural", rate: "-10%" },
  },
  "ja-JP": {
    female: { name: "ja-JP-NanamiNeural", rate: "-10%" },
    male: { name: "ja-JP-KeitaNeural", rate: "-10%" },
  },
  "en-US": {
    female: { name: "en-US-JennyNeural", rate: "-10%" },
    male: { name: "en-US-GuyNeural", rate: "-10%" },
  },
};

async function azureTTS(
  text: string,
  locale: MediaLocale,
  gender: MediaGender,
  key = process.env.AZURE_SPEECH_KEY ?? "",
  region = process.env.AZURE_SPEECH_REGION ?? "eastasia",
): Promise<Buffer> {
  if (!key) throw new Error("Azure TTS: no API key (set AZURE_SPEECH_KEY or add a pooled 'azure' key)");
  const voice = (AZURE_VOICES[locale] ?? AZURE_VOICES["zh-CN"])[gender];
  const ssml = `<speak version='1.0' xml:lang='${locale}'><voice name='${voice.name}'><prosody rate='${voice.rate}'>${text}</prosody></voice></speak>`;
  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
    },
    body: ssml,
  });
  if (!res.ok) throw new Error(`Azure TTS ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}
