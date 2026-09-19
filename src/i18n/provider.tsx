"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LANGUAGES,
  getLanguage,
  getLocaleCode,
  matchBrowserLocale,
} from "./config";
import {
  getDictionary,
  type Dictionary,
} from "./dictionaries";

type DotKeysOf<T> = T extends object
  ? {
      [K in keyof T]-?: K extends string
        ? T[K] extends string
          ? K
          : // nested object -> recurse with parents
            // biome-ignore lint/correctness/noUnusedVariables: template literal helper
            K extends string
            ? `${K}.${DotKeysOf<T[K]>}`
            : never
        : never;
    }[keyof T]
  : never;

export type I18nKey = DotKeysOf<Dictionary>;

interface I18nContextValue {
  locale: string;
  dictionary: Dictionary;
  setLocale: (code: string) => void;
  t: (key: I18nKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function resolvePath(obj: Dictionary, path: string): string {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[part];
    return undefined;
  }, obj) as string;
}

function readStoredLocale(): string {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const cookie = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${LOCALE_COOKIE}=`));
    if (cookie) return getLocaleCode(cookie.split("=")[1]);
    const stored = window.localStorage.getItem("hms_hm_lang");
    if (stored) return getLocaleCode(stored);
    return matchBrowserLocale(navigator.language);
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<string>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = readStoredLocale();
    if (stored !== DEFAULT_LOCALE) {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = useCallback((code: string) => {
    const safe = getLocaleCode(code);
    setLocaleState(safe);
    try {
      window.localStorage.setItem("hms_hm_lang", safe);
    } catch {
      // ignore storage errors
    }
    document.cookie = `${LOCALE_COOKIE}=${safe};path=/;max-age=31536000;samesite=lax`;
  }, []);

  useEffect(() => {
    const lang = getLanguage(locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = lang.dir;
  }, [locale]);

  const dictionary = useMemo(() => getDictionary(locale), [locale]);

  const t = useCallback(
    (key: I18nKey) => {
      const value = resolvePath(dictionary, key);
      return value ?? key;
    },
    [dictionary]
  );

  const value = useMemo(
    () => ({ locale, dictionary, setLocale, t }),
    [locale, dictionary, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within <I18nProvider>");
  }
  return ctx;
}

export { LANGUAGES };
