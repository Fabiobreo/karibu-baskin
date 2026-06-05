"use client";
import { createContext, useContext, useTransition } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/locales";
import { LOCALE_COOKIE } from "@/i18n/locales";

interface LocaleCtx {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  isPending: boolean;
}

const LocaleContext = createContext<LocaleCtx>({
  locale: "it",
  setLocale: () => {},
  isPending: false,
});

export function LocaleContextProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function setLocale(newLocale: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, isPending }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocaleSwitch() {
  return useContext(LocaleContext);
}
