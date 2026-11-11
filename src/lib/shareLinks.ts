import { SHORT_HOST } from "@/lib/siteUrl";
import { withUtm, type UtmSource } from "@/lib/utm";

/**
 * Link delle condivisioni dal sito (UX-56): ogni bottone "Condividi" porta un
 * link con `utm_medium=share` e la campagna del tipo di pagina, così le visite
 * che arrivano da una condivisione si contano (`ShareVisitStat`, in
 * "Coinvolgimento" di `/admin/metriche`).
 */

/** Cosa si è condiviso. Elenco chiuso: un valore nuovo va anche in `SHARE_CAMPAIGN_LABEL`. */
export const SHARE_CAMPAIGNS = [
  "tabellino",
  "convocati",
  "squadre",
  "allenamento",
  "evento",
  "partita",
  "news",
  "album",
  "profilo",
] as const;
export type ShareCampaign = (typeof SHARE_CAMPAIGNS)[number];

/** Da dove parte il link: il messaggio (WhatsApp o il foglio del telefono), "Copia link", il QR. */
export const SHARE_SOURCES = ["whatsapp", "link", "qr"] as const satisfies readonly UtmSource[];
export type ShareSource = (typeof SHARE_SOURCES)[number];

export function isShareCampaign(v: unknown): v is ShareCampaign {
  return typeof v === "string" && (SHARE_CAMPAIGNS as readonly string[]).includes(v);
}

export function isShareSource(v: unknown): v is ShareSource {
  return typeof v === "string" && (SHARE_SOURCES as readonly string[]).includes(v);
}

/**
 * URL assoluto da condividere. Il `source` è `whatsapp` anche quando dal
 * foglio di condivisione si sceglie un'altra app: succede di rado, e il foglio
 * non dice quale app è stata scelta.
 */
export function shareUrl(
  path: string,
  campaign: ShareCampaign,
  source: ShareSource = "whatsapp"
): string {
  return withUtm(path, { source, medium: "share", campaign });
}

/** "karibubaskin.it/partite/karibu-thiene": l'indirizzo da leggere su un'immagine. */
export function shortAddress(path: string): string {
  const clean = path.split(/[?#]/)[0].replace(/\/$/, "");
  return `${SHORT_HOST}${clean.startsWith("/") ? clean : `/${clean}`}`;
}

/** Testo del messaggio: la frase e, sulla riga sotto, il link. */
export function shareMessage(text: string, url: string): string {
  return `${text}\n${url}`;
}

/**
 * Arrivo da una condivisione, letto dall'indirizzo della pagina: `null` se il
 * link non viene da un bottone del sito (`utm_medium=share` con fonte e
 * campagna dell'elenco). I link dello staff con `utm_medium=share` (es. il
 * messaggio WhatsApp ai genitori di altre società) non hanno una campagna di
 * questo elenco e non si contano qui.
 */
export function shareVisitFromSearch(
  search: string
): { campaign: ShareCampaign; source: ShareSource } | null {
  const params = new URLSearchParams(search);
  if (params.get("utm_medium") !== "share") return null;
  const source = params.get("utm_source");
  const campaign = params.get("utm_campaign");
  if (!isShareSource(source) || !isShareCampaign(campaign)) return null;
  return { campaign, source };
}
