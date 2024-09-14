import { useSettings } from "@/stores/settings";
import { DEFAULT_LANGUAGE, isSupportedLanguage, languageInfo } from "@/lib/languages";
import type { LanguageCode, ExamType } from "@/types";

/**
 * Active learning language.
 *
 * Lives on the settings store so the choice is persisted (localStorage +
 * /api/settings) and shared across the app. Data stores subscribe via
 * `subscribeLearningLanguage` to re-hydrate when the language changes.
 */

export function getLearningLanguage(): LanguageCode {
  return useSettings.getState().language || DEFAULT_LANGUAGE;
}

export function setLearningLanguage(language: LanguageCode) {
  const store = useSettings.getState();
  const currentExam = store.activeExamType;
  const validExams = languageInfo(language).examTypes;
  
  // Reset exam type to first valid one if current isn't valid for new language
  const examUpdate = validExams.includes(currentExam) 
    ? {} 
    : { activeExamType: validExams[0] as ExamType };
  
  store.set({ language, ...examUpdate });
}

/** Resolve an optional `?lang=` query value to a supported language code. */
export function langFromParam(raw?: string | null): LanguageCode {
  if (raw && isSupportedLanguage(raw)) return raw;
  return getLearningLanguage();
}

/** Subscribe to changes of the active learning language. Returns unsubscribe. */
export function subscribeLearningLanguage(listener: () => void): () => void {
  let prev = getLearningLanguage();
  return useSettings.subscribe((state) => {
    const next = state.language || DEFAULT_LANGUAGE;
    if (next !== prev) {
      prev = next;
      listener();
    }
  });
}
