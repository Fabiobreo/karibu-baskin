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

export const CLUB_SOCIAL = {
  instagram: "https://www.instagram.com/karibubaskin",
  facebook: "https://www.facebook.com/karibubaskin",
  youtube: "https://youtube.com/@karibubaskin",
} as const;
