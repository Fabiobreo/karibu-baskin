/**
 * URL pubblico del sito, usato per metadata SEO, OG, canonical, sitemap e robots.
 *
 * Configurabile via `NEXT_PUBLIC_SITE_URL` (prefisso NEXT_PUBLIC_ così è
 * disponibile anche nei Client Component). Fallback sul dominio del club,
 * `www.karibubaskin.it` (`karibubaskin.it` ci porta con un 308): link
 * canonici, sitemap e anteprime puntano lì anche dove la variabile manca.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.karibubaskin.it").replace(
  /\/$/,
  ""
);

/** Host senza protocollo, per testo display (es. "www.karibubaskin.it"). */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");

/**
 * Indirizzo da leggere, senza "www.": quello scritto sulle immagini condivise
 * (UX-56). `karibubaskin.it/...` porta a `www.karibubaskin.it/...` con lo
 * stesso percorso.
 */
export const SHORT_HOST = SITE_HOST.replace(/^www\./, "");
