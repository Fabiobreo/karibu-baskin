export const LOCALES = ["it", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "it";
export const LOCALE_COOKIE = "karibu-locale";

export function isValidLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}
