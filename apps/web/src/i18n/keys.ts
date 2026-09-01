import en from "./en.json"

/**
 * Union of every translation key in en.json — the source of truth locale.
 * Using this as the parameter type for `t()` ensures that only valid keys
 * compile, preventing typos and missing keys at build time.
 */
export type TranslationKey = keyof typeof en