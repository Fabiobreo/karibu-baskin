/**
 * Larghezze delle pagine (UX-37). Header e fascia sono a tutta larghezza;
 * dentro, ogni pagina ha una colonna centrata larga quanto serve al suo
 * contenuto, e intestazione (titolo, breadcrumb, "Gestisci") e contenuto
 * stanno nella stessa colonna, cosi' la pagina resta simmetrica:
 * - piena (`Container maxWidth="lg"`, 1.136 px): griglie e tabelle;
 * - `MAIN_WIDTH`: pagine a colonna singola (liste di righe, profilo, dettagli);
 * - `READING_WIDTH`: testi lunghi (righe oltre 75-80 caratteri si leggono male).
 */
export const MAIN_WIDTH = 880;
export const READING_WIDTH = 760;

export type PageColumn = "full" | "main" | "reading";

const COLUMN_WIDTH: Record<PageColumn, number | undefined> = {
  full: undefined,
  main: MAIN_WIDTH,
  reading: READING_WIDTH,
};

/** `sx` della colonna centrata dentro il `Container` (piena: nessun limite). */
export function columnSx(column: PageColumn) {
  return { maxWidth: COLUMN_WIDTH[column], mx: "auto" } as const;
}
