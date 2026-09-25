# UX-20 · Pagine più larghe dello schermo su mobile

**Ondata:** 3 · **Stima:** S · **Dipende da:** nessuno · **Stato:** da fare

## Problema

A 360 px alcune pagine sono più larghe dello schermo: si trascinano di lato e la barra di navigazione in basso si allarga con loro (sul telefono il viewport di layout segue il contenuto). Misura del 25/09/2026 con Playwright, `document.documentElement.scrollWidth` su viewport di 360 px:

| Pagina                     | Larghezza | Causa trovata                                                          |
| -------------------------- | --------- | ---------------------------------------------------------------------- |
| `/giocatori/[slug]`        | 647 px    | testo nascosto di `RoleBadge`                                          |
| `/profilo`                 | 647 px    | testo nascosto di `RoleBadge`                                          |
| `/squadre/[season]/[slug]` | 447 px    | testo nascosto di `RoleBadge` (rosa)                                   |
| `/marcatori`               | 466 px    | da capire: un `Box` vuoto arriva a 466 px, vicino al banner dei cookie |
| `/`, `/risultati`          | 360 px    | nessun problema                                                        |

**Causa principale.** In `src/components/common/RoleBadge.tsx` il testo per i lettori di schermo ("Ruolo 5") usa `visuallyHidden` con `position: "absolute"`, ma il contenitore del badge (`Box component="span"`, `display: inline-flex`) non è `position: relative`. Lo span si posiziona rispetto a un antenato lontano e finisce oltre il bordo destro. Axe non lo segnala perché lo span è ritagliato a 1 px.

## Cosa fare

1. `RoleBadge`: `position: "relative"` sul contenitore, così il testo nascosto resta dentro il badge.
2. Cercare altri testi nascosti con lo stesso schema (`grep -rn 'clip: "rect'`) e correggerli allo stesso modo; valutare un solo `visuallyHidden` condiviso (MUI ne ha uno in `@mui/utils`).
3. `/marcatori`: trovare l'elemento che sborda a 360 px (in DevTools: gli elementi con `getBoundingClientRect().right > innerWidth` e nessun antenato con `overflow` nascosto) e correggerlo.
4. Aggiungere a `npm run a11y` un controllo che fallisce se su mobile `scrollWidth > clientWidth`, sulle stesse pagine: il difetto era invisibile ad axe e alle schermate a pagina intera.

## Criteri di accettazione

- A 360 px `scrollWidth === clientWidth` su tutte le pagine di UX-01, per anonimo, atleta e admin.
- Il lettore di schermo legge ancora "Ruolo 5" sul badge.
- Il controllo del punto 4 fallisce se si toglie la correzione del punto 1.
