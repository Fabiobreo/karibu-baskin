/**
 * Scala dei pesi del testo (UX-31): l'unica fonte dei `fontWeight` del sito.
 *
 * Prima ogni pagina usava cinque o sei pesi fra 500 e 900, quasi tutto fra 700
 * e 900: la gerarchia la facevano solo le dimensioni, e Inter a 900 con il
 * tracking negativo sembrava compressa. Ora i pesi sono tre:
 *
 * - `regular`: testo corrente;
 * - `semibold`: etichette, titoli di card, nomi in una lista, bottoni, chip,
 *   `h6`, `subtitle*`, `overline`, `<strong>` dentro un paragrafo;
 * - `bold`: titoli di pagina e di sezione (`h1`-`h5`) e numeri `stat`.
 *
 * Dove basta, meglio la variante (`variant="h6"`, `subtitle2`, `stat`) che un
 * peso locale. La regola ESLint segnala i numeri scritti a mano.
 */
export const FONT_WEIGHT = {
  regular: 400,
  semibold: 600,
  bold: 800,
} as const;
