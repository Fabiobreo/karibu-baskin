# UX-07 · Bottone primario, arancio solo sugli elementi toccabili, hover delle card, tab

**Ondata:** 1 · **Stima:** M · **Dipende da:** nessuno · **Stato:** fatto (commit su `develop`): bottone e chip pieni su `#C84B00` (hover `#A83F00`), token `primary.fill`, arancio tolto da occhielli, chip informativi e numeri chiave, sollevamento solo sulle card che si toccano, tab senza maiuscolo

## Problema

- Il bottone primario usa `#BF360C` (scelto per reggere il testo bianco): una tinta che tira al rosso mattone, più rossa dell'arancio della maglia `#E65100`. Arancio e nero sono i colori della squadra, ma il bottone non li rappresenta.
- L'arancio è usato anche su elementi **non toccabili**: chip "Area personale", "Sondaggio", "In evidenza", eyebrow sopra i titoli, numeri chiave. Così l'arancio non dice più "qui si può agire" (regola COGA: un colore, un significato).
- Tutte le card si sollevano al passaggio del mouse (`src/theme.ts:490-503`), anche quelle non cliccabili: falsa promessa di interazione.
- Le tab sono metà in maiuscolo (default MUI, per esempio "CONVOCATI", "UTENTI (112)") e metà no ("Futuri", "Profilo").

## Decisione: variante B

Scelta del committente (2026-09-24), dopo il confronto sul sito reale: [`../img/varianti-bottone-1-pubblico.png`](../img/varianti-bottone-1-pubblico.png), [`../img/varianti-bottone-2-admin-scuro.png`](../img/varianti-bottone-2-admin-scuro.png) (colonna "Variante B").

| Stato  | Colore                                                      | Contrasto con il bianco |
| ------ | ----------------------------------------------------------- | ----------------------- |
| Riposo | `#C84B00`: stessa tinta della maglia (circa 22°), più scura | 4,71:1                  |
| Hover  | `#A83F00`                                                   | 6,22:1                  |

Il testo resta **bianco**: `contrastText`, chip e riempimenti con etichetta bianca non cambiano logica.

Scartata la variante A (testo nero su `#E65100`): più vicina alla maglia, ma con un impatto molto più ampio sul codice e l'hover obbligato a schiarire.

## Cosa fare

1. **Token.** In `src/theme.ts` una costante per il riempimento arancio (per esempio `ORANGE_FILL = "#C84B00"`, `ORANGE_FILL_HOVER = "#A83F00"`), esposta anche in palette come `primary.fill` (aggiungere il campo all'augmentation di `PaletteColor`, come già fatto per `onLight`) così da poterla usare in `sx`.
2. **Bottone e chip.** `MuiButton.containedPrimary` (riposo, hover, ombra con la stessa tinta) e `MuiChip.filledPrimary` usano `ORANGE_FILL`, in tema chiaro e scuro.
3. **Riempimenti scritti a mano.** I 7 `bgcolor: "primary.main"` con testo bianco sono oggi a 3,78:1: passano a `primary.fill`. Punti: `src/app/page.tsx:165`, `ImageUploader.tsx:142`, `LoSapeviCard.tsx:53`, `LoSapeviCarousel.tsx:85,120`, `NotificationItem.tsx:87`. `SimulatorResult.tsx:82` è una barra senza testo e può restare `primary.main`.
4. **Da non cambiare.**
   - Il testo arancio su fondo chiaro resta `#BF360C` (`primary.onLight`, 69 usi): `#C84B00` su crema fa 4,28:1, sotto la soglia. Ci sono quindi due arancioni con ruoli diversi: `fill` per i riempimenti, `onLight` per il testo.
   - `primary.main` (`#E65100`) resta per bordi, indicatori e icone (soglia 3:1) e per la fascia "Arancioni" delle squadre.
   - `calendar.match`, `match.draw` e `primary.dark` con testo bianco reggono già (5,60:1): valutare solo se allinearli a `fill` per coerenza visiva.
5. **Arancio solo su ciò che si tocca:** eyebrow, chip informativi e numeri chiave passano a nero/grafite (`text.primary`) o al grigio secondario; l'arancio resta su bottoni, link, tab attive, indicatori di selezione, icone di azione.
6. **Hover delle card** con sollevamento solo sulle card interattive: una variante o una prop (per esempio le card che contengono `CardActionArea` o hanno `href`/`onClick`), non tutte le `MuiCard`.
7. **Tab:** `MuiTab` con `textTransform: "none"` nel tema.

## Criteri di accettazione

- Bottone primario e chip pieni su `#C84B00` (hover `#A83F00`) in tema chiaro e scuro.
- Nessun testo bianco su `#E65100` (verificato da UX-01).
- Nessun elemento non interattivo in arancio pieno.
- Le card non cliccabili non si muovono al passaggio del mouse.
- Tutte le tab senza maiuscolo forzato.

## Esito

- **Token:** `ORANGE_FILL` / `ORANGE_FILL_HOVER` in `theme.ts`, esposti come `primary.fill` (augmentation di `PaletteColor`) in tema chiaro e scuro. Ombra del bottone con `alpha(ORANGE_FILL)`, non piu' un `rgba` scritto a mano.
- **Bottone e chip:** `containedPrimary` e `MuiChip.filledPrimary` su `ORANGE_FILL`. I 7 riempimenti scritti a mano passano a `primary.fill` (`SimulatorResult` resta `primary.main`).
- **Colore del ruolo 3** (`ROLE_COLORS`) da `#E65100` a `#C84B00`: i chip "Ruolo 3" avevano testo bianco a 3,79:1, l'unico caso trovato di bianco su `#E65100`. Anche il bottone di `global-error.tsx` (senza tema). Il ridisegno dei colori dei ruoli resta a UX-11.
- **Arancio solo su cio' che si tocca:**
  - i 29 occhielli `overline` arancioni passano a `text.secondary`, con le 5 icone decorative accanto;
  - il chip sopra il titolo di `PageHero` e' sempre neutro (bianco traslucido): tolta la prop `chipWhite`;
  - chip informativi neutri: "Sondaggio" (`PollChip`), "In evidenza" (`FeaturedCard`), "Sondaggio aperto" (bordato; "chiuso" resta grigio pieno), data evento, "N da giocare", "Atleta", contatore convocati, stagione in esportazione, tipo squadra nel form partita;
  - numeri chiave in `text.primary`: statistiche del club in `/squadre`, migliori marcatori della partita, punti nella riga convocato, punti nelle card mobile dei marcatori.
  - restano arancioni bottoni, link, tab attive, indicatori, colonna di ordinamento attiva dei marcatori, il chip "Mostra tutti" del calendario (si tocca) e il logotipo "Baskin" della home.
- **Hover delle card:** `MuiCard` non e' usato da nessun componente; l'override ora solleva solo card link, bottone o con `CardActionArea` (`:is`, `a > &`, `:has`). Il sollevamento vero stava in 12 `onHover` scritti a mano, tutti su elementi cliccabili tranne due: tolto dai traguardi (`AchievementsGrid`) e, in `LeaderCard`, tenuto solo quando c'e' il link al profilo.
- **Tab:** `MuiTab` con `textTransform: "none"`.
- **Verifica** con Playwright, prima e dopo, desktop e mobile, tema chiaro e scuro, su home, news, partita, squadre, profilo, admin utenti e il Baskin: bottone `rgb(200, 75, 0)` ovunque, nessun testo bianco su `#E65100` (prima 6 chip "Ruolo 3"), nessuna tab in maiuscolo (prima 2 per pagina), nessun chip arancio pieno non toccabile (prima "Chi siamo", "Area personale", "Sondaggio"...). `npm run a11y`: nessuna nuova violazione, meno nodi in 9 voci della baseline.

**Rimasto fuori**

- Occhielli e icone arancioni **dentro gli hero** (`primary.light` su fondo scuro, es. `/classifiche`, `/marcatori`, `/partite`, `/risultati`): li riprende UX-08, che rifa' gli hero.
- Icone decorative arancioni fuori dagli occhielli (icone dei valori in home, delle regole in `/il-baskin`, del titolo in `/profilo/traguardi`, dei sondaggi): non sono testo e non sono pieni, ma non si toccano. Da valutare con UX-08/UX-10.
- `calendar.match`, `match.draw` e `primary.dark` restano su `#BF360C` (gia' 5,60:1 col bianco): non allineati a `fill`.
- Immagini generate (OG del giocatore, tabellino) hanno ancora `#E65100` scritto a mano: rientrano nel tema parcheggiato "Immagini OG allineate ai nuovi colori".
