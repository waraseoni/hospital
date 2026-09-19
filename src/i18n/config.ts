export interface Language {
  code: string;
  name: string;
  nativeName: string;
  dir: "ltr" | "rtl";
}

export const LANGUAGES: Language[] = [
  { code: "en", name: "English", nativeName: "English", dir: "ltr" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", dir: "ltr" },
];

export const DEFAULT_LOCALE = "en";

export const LOCALE_COOKIE = "hms_locale";

export function isLocale(code: string): code is string {
  return LANGUAGES.some((l) => l.code === code);
}

export function getLocaleCode(code: string | null | undefined): string {
  if (code && isLocale(code)) return code;
  return DEFAULT_LOCALE;
}

export function getLanguage(code: string): Language {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

export function matchBrowserLocale(
  browserLang?: string | null | undefined
): string {
  if (!browserLang) return DEFAULT_LOCALE;
  const short = browserLang.toLowerCase().split("-")[0];
  return isLocale(short) ? short : DEFAULT_LOCALE;
}