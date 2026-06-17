/**
 * URL pubblico del sito, usato per metadata SEO, OG, canonical, sitemap e robots.
 *
 * Configurabile via `NEXT_PUBLIC_SITE_URL` (prefisso NEXT_PUBLIC_ così è
 * disponibile anche nei Client Component). Fallback sul dominio Vercel di default.
 * Impostare questa variabile quando si passa a un dominio custom, per evitare
 * che link canonici, sitemap e anteprime social puntino al dominio sbagliato.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://karibu-baskin.vercel.app"
).replace(/\/$/, "");

/** Host senza protocollo, per testo display (es. "karibu-baskin.vercel.app"). */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
