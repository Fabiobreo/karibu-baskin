import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, isValidLocale, LOCALE_COOKIE } from "./locales";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;

  let locale = DEFAULT_LOCALE;

  if (isValidLocale(cookieLocale)) {
    locale = cookieLocale;
  } else {
    // Auto-detect dalla prima preferenza del browser
    const headersList = await headers();
    const acceptLanguage = headersList.get("accept-language") ?? "";
    const preferred = acceptLanguage.split(",")[0]?.trim().split(/[-_]/)[0] ?? "";
    if (isValidLocale(preferred)) {
      locale = preferred;
    }
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
