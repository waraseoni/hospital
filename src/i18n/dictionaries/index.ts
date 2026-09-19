import { en, type Dictionary } from "./en";
import { hi } from "./hi";

export type { Dictionary };

export const dictionaries: Record<string, Dictionary> = {
  en,
  hi,
};

export function getDictionary(locale: string): Dictionary {
  return dictionaries[locale] ?? en;
}