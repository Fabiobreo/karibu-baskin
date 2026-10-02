/**
 * Le quattro pagine della sezione Partite (UX-36): stesso ordine nel menu
 * dell'header e nelle tab di sezione (`MatchesSectionNav`).
 */
export type MatchesSection = "upcoming" | "results" | "standings" | "scorers";

interface MatchesSectionItem {
  key: MatchesSection;
  path: string;
  /** La pagina ha un selettore di stagione: le prossime partite no, esistono solo nella stagione in corso. */
  seasonal: boolean;
}

export const MATCHES_SECTIONS: readonly MatchesSectionItem[] = [
  { key: "upcoming", path: "/partite", seasonal: false },
  { key: "results", path: "/risultati", seasonal: true },
  { key: "standings", path: "/classifiche", seasonal: true },
  { key: "scorers", path: "/marcatori", seasonal: true },
];

/**
 * Indirizzo di una pagina della sezione. La stagione scelta a mano segue
 * l'utente fra le pagine che hanno il selettore: chi guarda i risultati del
 * 2024-25 e tocca "Classifiche" si aspetta la classifica del 2024-25.
 */
export function matchesSectionHref(section: MatchesSection, season?: string | null): string {
  const item = MATCHES_SECTIONS.find((s) => s.key === section)!;
  if (!season || !item.seasonal) return item.path;
  return `${item.path}?season=${encodeURIComponent(season)}`;
}
