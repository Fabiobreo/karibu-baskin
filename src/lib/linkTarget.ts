/**
 * Decide se un `href` va reso con un `<a>` semplice invece che con `next/link`.
 *
 * `next/link` naviga lato client, ma solo verso pagine dell'app. Servono
 * un'ancora semplice e un caricamento vero:
 * - gli URL assoluti (`http(s)://`, `//…`) e gli schemi `mailto:`, `tel:`,
 *   `webcal:`: fuori dall'app o gestiti da un'altra applicazione;
 * - le rotte `/api/*`: esportazioni e file `.ics`, non pagine;
 * - i link con `download`, che il browser deve scaricare.
 */
export function isPlainAnchorHref(href: string, download?: unknown): boolean {
  if (download !== undefined && download !== false) return true;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return true;
  if (href.startsWith("//")) return true;
  return href === "/api" || href.startsWith("/api/") || href.startsWith("/api?");
}
