# UX-31 · Pesi tipografici a tre, regola ESLint estesa

**Ondata:** 4 · **Stima:** M (PR per area, come UX-27) · **Dipende da:** UX-27 · **Stato:** fatto (su `develop`, un commit per area)

## Problema

UX-10 e UX-27 hanno messo a posto le **dimensioni** (4-11 per pagina invece di 23). I **pesi** no:

- `misura-codice.mjs` conta **472** `fontWeight` 700-900 scritti a mano in 148 file; una ricerca più larga (`fontWeight={...}` compreso) ne trova circa 1.000;
- nel tema h1 e h2 sono a 900, h3 e h4 a 800, h5 a 700; titoli di card, chip, etichette e numeri stanno fra 600 e 800;
- ogni pagina misurata usa 5-6 pesi diversi.

Con tutto fra 700 e 900 la gerarchia la fanno solo le dimensioni, e i testi secondari grigi sul crema perdono ancora di più. Inter a 900 con tracking negativo sembra compressa.

Inoltre la regola ESLint di UX-27 (`eslint.config.*`, riga 57) controlla `fontSize` solo dentro `sx`, `InputProps` e `slotProps`. Le sfuggono:

- `style={{ fontSize: "0.75rem" }}` e `"0.8rem"` in `src/components/layout/Footer.tsx:120`, `:130`, `:224`, `:236`;
- `primaryTypographyProps={{ fontWeight, fontSize: "0.95rem" }}` in `src/components/layout/SiteHeader.tsx:707`, più `fontSize: "0.95rem"` a `:731`.

## Cosa fare

1. **Tre pesi** nel tema: 400 (testo), 600 (etichette, titoli di card, bottoni, h6), 800 (titoli di pagina e di sezione, h1-h5, numeri `stat`). Niente 500, 700, 900.
2. Togliere i `fontWeight` locali passando dalle varianti (`variant="h6"`, `subtitle2`, `overline`, `stat`), per area, come in UX-27. Dove serve un'enfasi dentro un paragrafo, `<strong>` (600 dal tema).
3. **ESLint:**
   - nuova regola su `fontWeight` letterali, con le stesse esenzioni di `fontSize`;
   - estendere entrambe le regole a `style`, `primaryTypographyProps`, `secondaryTypographyProps` e `componentsProps.typography`.
4. Sistemare `Footer.tsx` e `SiteHeader.tsx` sulla scala.
5. Rivedere il tracking dei titoli (`letterSpacing` negativo) dopo il passaggio a 800.

## Criteri di accettazione

- `misura-codice.mjs`: "fontWeight 700-900 a mano" sotto 20 (solo eccezioni commentate: template email, immagini OG, immagine delle squadre per `html2canvas`).
- Al massimo 3 pesi di testo per pagina nella rimisura (`dom.pesiTesto`).
- `npm run lint` in `error` con le regole estese, `tsc`, `npm test`, `npm run a11y` verdi.

## Com'è andata

- **Scala:** `FONT_WEIGHT` in `@/lib/fontWeight` (`regular` 400, `semibold` 600, `bold` 800), sul modello di `RADIUS` e `TYPE_SCALE`. Il tema la usa per le varianti (h1-h5 e `stat` 800; h6, `subtitle*`, `overline`, `button` 600) e per i pesi "di sistema" di MUI (`fontWeightMedium` 600: intestazioni di tabella, tab, badge; `fontWeightLight` 400). `<strong>`/`<b>` a 600 da `MuiCssBaseline`.
- **Tracking:** titoli da `-1px`/`-0.8px`/... a `-0.02em`…`-0.005em`, proporzionale alla dimensione.
- **Migrazione:** con uno script sull'AST (non committato). Regole: 900 e 800 → `bold`; 700 e 600 → `semibold`; 500 e 400 → `regular`. Il peso locale si toglie quando la variante lo dà già (h1-h5/`stat` con 700+, h6/`subtitle*`/`overline` con 600-700, `body*` senza peso, `Button`/`Chip`/`Tab` a 600): 423 tolti, 757 portati sulla scala, in 221 file. Unico caso con i due rami uguali (`EventChip`, 700/600) diventato 600/400.
- **ESLint:** nuova regola sui `fontWeight` letterali in qualunque oggetto di stile (sx, `style`, `*TypographyProps`, costanti) e nella prop `fontWeight`, rami di una ternaria compresi. La regola sui `fontSize` copre ora anche `style`, `componentsProps`, `primaryTypographyProps` e `secondaryTypographyProps`; ne sono esenti (blocco a parte in `eslint.config.mjs`) email, immagini OG, tabellino e `ShareTeamsButton`, dove i px sono quelli del disegno. I pesi valgono anche lì.
- **Footer, SiteHeader, `global-error`:** dimensioni su `TYPE_SCALE` (0,95rem → `md`, 0,88/0,9rem → `sm`, 0,8rem → `sm`, 0,75rem → `xs`).
- **Immagini OG:** due pesi (400 e 800), le etichette stanno sul peso dei titoli; tolto `public/fonts/Inter-700.ttf`, non più usato.
- **Misure:** "fontWeight 700-900 a mano" da 472 a 0; `pesiTesto` a 3 su tutte le 70 pagine della rimisura (prima 4-6). `lint`, `tsc`, `npm test` (1.890) e `npm run a11y` verdi.
