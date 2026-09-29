/**
 * Ritorno alla pagina di partenza dopo l'accesso.
 *
 * `/login?callbackUrl=/allenamento/abc` riporta chi entra dove stava. Il
 * parametro arriva dall'URL, quindi chiunque può scriverlo: si accettano solo
 * percorsi interni, altrimenti un link `/login?callbackUrl=https://…` farebbe
 * del nostro login un trampolino verso un altro sito (open redirect).
 */
export function safeCallbackPath(raw: string | string[] | null | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return "/";
  // Un solo "/" iniziale: "//host" e "/\host" i browser li leggono come un altro sito.
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (/[\\\u0000-\u001f]/.test(value)) return "/";
  return value;
}

/** Link alla pagina di accesso che poi riporta a `path`. */
export function loginHref(path: string): string {
  const safe = safeCallbackPath(path);
  return safe === "/" ? "/login" : `/login?callbackUrl=${encodeURIComponent(safe)}`;
}
