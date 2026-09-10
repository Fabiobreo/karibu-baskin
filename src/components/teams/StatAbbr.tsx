import { Box } from "@mui/material";

interface StatAbbrProps {
  /** Sigla mostrata in tabella: G, V, P, S, Pt… */
  short: string;
  /** Nome esteso, letto dagli screen reader e mostrato in hover. */
  full: string;
}

/**
 * Intestazione di colonna abbreviata.
 *
 * Nelle classifiche di girone le intestazioni sono lettere singole e "P"
 * (pareggi) accanto a "S" (sconfitte) e' ambiguo anche per chi segue il
 * campionato. `<abbr title>` risolve senza occupare spazio in piu': l'hover lo
 * mostra e gli screen reader lo annunciano.
 *
 * La sottolineatura tratteggiata di default va tolta: dentro un `<th>` in
 * maiuscoletto sembra un errore di rendering.
 */
export default function StatAbbr({ short, full }: StatAbbrProps) {
  return (
    <Box component="abbr" title={full} sx={{ textDecoration: "none", cursor: "help", border: 0 }}>
      {short}
    </Box>
  );
}
