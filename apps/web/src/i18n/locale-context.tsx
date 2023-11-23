"use client";

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from "react";
import en from "./en.json";
import id from "./id.json";
import { useSettings } from "@/stores/settings";

export type Locale = "en" | "id";

const TRANSLATIONS: Record<Locale, Record<string, string>> = { en, id };

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children, initialLocale }: { children: ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(() => initialLocale ?? "en");
  const setSettings = useSettings((s) => s.set);

  useEffect(() => {
    const apply = () => {
      const stored = localStorage.getItem("navia-locale") as Locale | null;
      const next: Locale =
        stored === "en" || stored === "id"
          ? stored
          : navigator.language?.slice(0, 2) === "id"
            ? "id"
            : "en";
      setLocaleState((cur) => {
        if (cur === next) return cur;
        localStorage.setItem("navia-locale", next);
        document.cookie = `navia-locale=${next};path=/;max-age=31536000;samesite=lax`;
        return next;
      });
    };
    if (document.readyState === "complete") {
      apply();
    } else {
      window.addEventListener("load", apply);
      return () => window.removeEventListener("load", apply);
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("navia-locale", l);
    document.cookie = `navia-locale=${l};path=/;max-age=31536000;samesite=lax`;
    setSettings({ locale: l });
  }, [setSettings]);

  const t = useCallback((key: string, params?: Record<string, string>): string => {
    const dict = TRANSLATIONS[locale];
    let val = dict[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        val = val.replace(`{${k}}`, v);
      }
    }
    return val;
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useTranslation must be used within LocaleProvider");
  return ctx;
}
