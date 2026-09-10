import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isValidLocale, LOCALE_COOKIE } from "./locales";

/**
 * Lingua della richiesta: il cookie `karibu-locale` se valido, altrimenti
 * italiano. Nient'altro.
 *
 * Prima si ricadeva sull'header `Accept-Language` del browser. Con la lingua
 * gestita via cookie e nessun prefisso negli URL, questo faceva sì che lo
 * stesso indirizzo restituisse contenuti in lingue diverse a seconda di chi lo
 * chiedeva: un crawler con `Accept-Language: en` riceveva corpo inglese con
 * titolo, description e `og:locale` italiani, senza `hreflang` né `Vary` a
 * dichiararlo. Ora un URL senza cookie è sempre italiano e deterministico, che
 * è quello che vedono i motori di ricerca e le anteprime social. L'inglese
 * resta disponibile come preferenza esplicita dal selettore di lingua.
 */
export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isValidLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
