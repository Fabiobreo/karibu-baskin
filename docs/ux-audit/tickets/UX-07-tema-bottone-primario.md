# UX-07 · Bottone primario, arancio solo sugli elementi toccabili, hover delle card, tab

**Ondata:** 1 · **Stima:** M · **Dipende da:** nessuno · **Stato:** da fare

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
