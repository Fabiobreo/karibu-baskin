import { SITE_URL } from "@/lib/siteUrl";

/**
 * Parametri UTM dei link che escono dal club (UX-55), con una regola sola:
 * valori scritti qui, così non nascono `whatsapp`, `WhatsApp` e `wa` insieme.
 * Elenco dei link pronti per lo staff: docs/workflows/link-con-utm.md.
 */

export const UTM_SOURCES = [
  "whatsapp",
  "instagram",
  "facebook",
  "email",
  "volantino",
  "qr",
  "partner",
  // Scheda Google del club (UX-62), con `medium: "maps"`.
  "google",
  // "Copia link" dei bottoni di condivisione (UX-56): non si sa dove finirà.
  "link",
] as const;
export type UtmSource = (typeof UTM_SOURCES)[number];

/**
 * `share` condivisione dal sito, `bio` link nella bio, `print` carta,
 * `referral` siti di altri, `maps` la scheda Google del club (UX-62).
 */
export const UTM_MEDIUMS = ["share", "bio", "print", "referral", "maps"] as const;
export type UtmMedium = (typeof UTM_MEDIUMS)[number];

/** Campagna: minuscole, cifre e trattini (`open-day-2027`, `5x1000-2027`). */
const CAMPAIGN_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface UtmParams {
  source: UtmSource;
  medium: UtmMedium;
  campaign?: string;
}

/**
 * URL assoluto su `SITE_URL` con `utm_source`, `utm_medium` e, se c'è,
 * `utm_campaign`; l'ancora resta in fondo. Un URL esterno torna com'è, e i
 * parametri UTM già presenti non si duplicano né si riscrivono.
 */
export function withUtm(path: string, { source, medium, campaign }: UtmParams): string {
  if (campaign !== undefined && !CAMPAIGN_RE.test(campaign)) {
    throw new Error(`Campagna UTM non valida: "${campaign}" (minuscole e trattini)`);
  }
  const site = new URL(SITE_URL);
  const url = new URL(path, `${SITE_URL}/`);
  if (url.origin !== site.origin) return path;
  const params: [string, string | undefined][] = [
    ["utm_source", source],
    ["utm_medium", medium],
    ["utm_campaign", campaign],
  ];
  for (const [key, value] of params) {
    if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
  }
  return url.toString();
}

// ── Da dove arriva chi scrive (cookie `karibu-ref`) ─────────────────────────

/**
 * Cookie tecnico di prima parte: al primo arrivo con parametri UTM si salvano
 * fonte, mezzo e campagna, nessun identificativo, per 30 giorni. Lo legge solo
 * il modulo contatti, per scrivere allo staff "Arrivato da: instagram, bio".
 * Citato nell'informativa privacy.
 */
export const REF_COOKIE = "karibu-ref";
export const REF_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export interface ReferralInfo {
  source: string;
  medium: string | null;
  campaign: string | null;
}

/** Solo lettere, cifre e pochi segni, al più 40 caratteri: chiunque può scrivere un URL. */
function clean(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 40);
  return v || null;
}

/** I parametri UTM di un indirizzo, `null` se manca `utm_source`. */
export function referralFromSearch(search: string): ReferralInfo | null {
  const params = new URLSearchParams(search);
  const source = clean(params.get("utm_source"));
  if (!source) return null;
  return {
    source,
    medium: clean(params.get("utm_medium")),
    campaign: clean(params.get("utm_campaign")),
  };
}

export function encodeReferral(ref: ReferralInfo): string {
  return [ref.source, ref.medium ?? "", ref.campaign ?? ""].join("|");
}

export function decodeReferral(raw: string | null | undefined): ReferralInfo | null {
  if (!raw) return null;
  let value: string;
  try {
    value = decodeURIComponent(raw);
  } catch {
    return null;
  }
  const [source, medium, campaign] = value.split("|");
  const s = clean(source);
  if (!s) return null;
  return { source: s, medium: clean(medium), campaign: clean(campaign) };
}

/** "volantino, print" oppure "instagram, bio, open-day-2027". */
export function describeReferral(ref: ReferralInfo): string {
  return [ref.source, ref.medium, ref.campaign].filter(Boolean).join(", ");
}
