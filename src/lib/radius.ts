/**
 * Scala dei raggi (UX-30): l'unica fonte dei `borderRadius` del sito.
 *
 * Prima i numeri negli `sx` venivano moltiplicati per `shape.borderRadius`
 * (10), quindi `borderRadius: 2` faceva 20 px e `3` ne faceva 30, accanto a
 * card del tema a 14: nella stessa pagina convivevano cinque raggi diversi.
 * Qui i valori sono stringhe in px, che `sx` non moltiplica.
 *
 * - `sm`: chip, badge, etichette piccole, barre sottili;
 * - `md`: bottoni, campi, elementi dentro una card (è anche `shape.borderRadius`,
 *   quindi Alert, menu e tooltip di MUI stanno nella scala);
 * - `lg`: card e superfici di primo livello (Card e Paper del tema);
 * - `pill`: pillole e barre di avanzamento.
 *
 * Per i cerchi resta `"50%"`, per gli angoli vivi `0`: sono le sole eccezioni
 * che la regola ESLint lascia passare.
 */
export const RADIUS = {
  sm: "6px",
  md: "8px",
  lg: "14px",
  pill: "999px",
} as const;

/** `shape.borderRadius` del tema, in numero: vale `RADIUS.md`. */
export const SHAPE_RADIUS = 8;
