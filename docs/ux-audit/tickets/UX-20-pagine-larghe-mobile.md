# UX-20 · Pagine più larghe dello schermo su mobile

**Ondata:** 3 · **Stima:** S · **Dipende da:** nessuno · **Stato:** fatto (commit su `develop`): testo nascosto di `RoleBadge` e `GuestOnboardingCard` sul `visuallyHidden` di `@mui/utils` con contenitore `relative`; `npm run a11y` misura ogni pagina mobile a 360 px e fallisce se sborda

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

## Esito

- **Causa vera, più precisa di quella scritta sopra.** Nel `visuallyHidden` locale di `RoleBadge` c'era `width: 1` e `m: -1`: nel `sx` di MUI `width: 1` vale **100%** e `m: -1` vale **-8 px**. Lo span "Ruolo 5" era quindi largo quanto il blocco di riferimento (un antenato lontano, perché il badge non era `relative`) e partiva dal badge: da qui i 647 px.
- `RoleBadge` e `GuestOnboardingCard` usano ora il `visuallyHidden` di `@mui/utils` (valori in px, già usato in `/partite/[slug]`); i due oggetti locali sono spariti. Il contenitore del badge e il titolo del passo di onboarding sono `position: relative`, così il testo nascosto resta comunque dentro.
- `/marcatori` e `/partite/[slug]` (463 px, non era in tabella) sbordavano per lo stesso badge: con la correzione sono a 360 px. In `/partite` la tabella statistiche è più larga, ma scorre nel suo contenitore.
- `e2e/a11y.mjs`: nel giro mobile, dopo axe, la pagina viene ristretta a 360 px e si confronta `scrollWidth` con 360 (non con `clientWidth`, che su telefono segue il contenuto). Se sborda lo segnala con i tre elementi più a destra non contenuti da un `overflow` e lo script esce con 1, senza baseline.
- Verifiche: senza la correzione di `RoleBadge` lo script fallisce (giocatore 647 px con colpevole "Ruolo 5", partita 463, marcatori 466); con la correzione `npm run a11y` passa su tutte le pagine di anonimo, atleta e admin. Il lettore di schermo trova ancora "Ruolo 5" (albero di accessibilità). `tsc` e `npm test` verdi.

## Rimasto fuori

- Nessun `visuallyHidden` condiviso nuovo: basta quello di `@mui/utils`. Chi scrive un testo nascosto a mano con valori numerici nel `sx` ricade nello stesso errore; non c'è una regola ESLint che lo impedisca.
