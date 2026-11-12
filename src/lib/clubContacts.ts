/**
 * Contatti e dati dell'associazione, in un posto solo: li usano il footer
 * (UX-39) e i dati strutturati. La sede sta in `@/lib/clubVenue`.
 */
export const CLUB_LEGAL_NAME = "ASD Karibu Baskin Montecchio Maggiore";
export const CLUB_EMAIL = "asdkaribubaskin@gmail.com";
export const CLUB_TAX_ID = "04301440246";
/** Ente di affiliazione e numero, come li dichiara il club. */
export const CLUB_AFFILIATION = "EISI ETS, nr. VEN10";

export const CLUB_PHONES = [
  { name: "Elisa", label: "349 297 2703", href: "tel:+393492972703" },
  { name: "Andrea", label: "335 531 0195", href: "tel:+393355310195" },
] as const;

/**
 * Telefono pubblico del club (UX-62): uno solo, lo stesso nei dati strutturati
 * e sulla scheda Google, che lo confronta con quello del sito.
 */
export const CLUB_PHONE = CLUB_PHONES[0];

export const CLUB_SOCIAL = {
  instagram: "https://www.instagram.com/karibubaskin",
  facebook: "https://www.facebook.com/karibubaskin",
  youtube: "https://youtube.com/@karibubaskin",
} as const;

/**
 * Scheda Google del club (Google Maps, UX-62): "Asd Karibu Baskin Montecchio
 * Maggiore", trovata il 12/11/2026. Link stabile per `cid`; entra nei `sameAs`
 * del JSON-LD. Come curarla: `docs/workflows/scheda-google.md`.
 */
export const CLUB_GOOGLE_PROFILE_URL: string | null =
  "https://maps.google.com/?cid=10043041815261947815";
