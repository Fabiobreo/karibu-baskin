"use client";
import { useLocale } from "next-intl";
import { getDateFnsLocale } from "@/lib/dateLocale";
import type { Locale } from "date-fns";

export function useActiveDateLocale(): Locale {
  return getDateFnsLocale(useLocale());
}
