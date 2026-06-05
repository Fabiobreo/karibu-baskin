import { it, enUS } from "date-fns/locale";
import type { Locale } from "date-fns";

export function getDateFnsLocale(localeCode: string): Locale {
  return localeCode === "en" ? enUS : it;
}
