# UX-09 · Niente grigio `text.disabled` come testo

**Ondata:** 1 · **Stima:** M · **Dipende da:** nessuno · **Stato:** fatto (commit su `develop`): `text.disabled` via da testi e icone piccole, secondo segnale sugli stati, regola ESLint; baseline a11y da 40 a 20 voci

## Problema

`text.disabled` (`#9E9E9E` in tema chiaro) è usato **293 volte in 96 file** come colore di testo normale: date, didascalie, etichette dei contatti, "(+13)" nei marcatori. Su bianco fa 2,67:1, sotto la soglia AA (4,5:1). È la causa principale delle violazioni di contrasto rilevate da axe (138 elementi in `/admin/allenamenti`, 174 in `/marcatori` su mobile). In tema scuro il token supera già la soglia: il problema è solo in chiaro.

Anche `#999795` su `#F7F4F1` (2,65:1) compare in alcune didascalie.

## Perché non è una sostituzione meccanica

Divisione degli usi (stima dall'analisi del codice):

- **circa 174 su testo:** diventano `text.secondary`;
- **circa 87 su icone:** quelle decorative degli stati vuoti (icone grandi da 56 px, per esempio `app/classifiche/page.tsx:230`) sono esenti; quelle che portano informazione hanno bisogno di almeno 3:1;
- **9 su bordi:** da valutare caso per caso;
- **157 dentro ternari** (`cond ? "text.disabled" : …`) che indicano uno **stato**: "non marcato", "zero", "passato". Passando a `text.secondary` lo stato si perde: serve un secondo segnale (icona, trattino, corsivo, etichetta).

## Cosa fare

1. Non ridefinire `palette.text.disabled`: MUI lo usa per i controlli disabilitati, che sono esenti dal requisito di contrasto.
2. Sostituire gli usi su testo con `text.secondary`.
3. Per i ternari di stato, aggiungere un secondo segnale oltre al colore e usare `text.secondary`.
4. Icone informative: almeno 3:1.
5. Correggere anche `#999795` e simili (`grep -rn "999795" src`).
6. Aggiungere una regola ESLint (nello stesso array `no-restricted-syntax` esistente in `eslint.config.mjs`, non in un nuovo blocco, che sostituirebbe la regola sui colori esadecimali) che vieti `color: "text.disabled"` fuori dai casi documentati.

## Criteri di accettazione

- axe non segnala `color-contrast` dovuti a `#9E9E9E` sulle pagine di UX-01.
- Gli stati "non marcato / zero / passato" restano distinguibili anche senza colore.

## Esito

- **Conteggi reali** (292 occorrenze in 96 file): 176 su testo, 98 su icone, 6 su bordi. I ternari di stato erano **20, non 157** come stimato.
- **Testo:** 169 usi passano a `text.secondary` (`#666666`, 5,74:1 su bianco).
- **Icone:** 69 piccole passano a `text.secondary`; restano in `text.disabled` solo le 27 icone grandi degli stati vuoti (`fontSize` >= 40), decorative.
- **Bordi:** i 6 `borderColor: "text.disabled"` (hover delle card, bottone Google) restano: non sono testo.
- **Ternari di stato:** tutti hanno ora un segnale oltre al colore. Dove c'era gia' ("—", "0", "Nessuna email", corsivo, barrato, icona apri/chiudi) basta il grigio leggibile. Aggiunto il barrato all'atleta assente in `AdminAllenamentiClient` e il bordo al chip del ruolo scoperto in `ConvocazioniToolbar`; filtri spenti del calendario barrati con i filtri accesi in `text.primary`.
- **Riempimenti sotto un'etichetta bianca:** "Concluso" in `SessionCard` su `grey.700` (prima `text.disabled`, 2,67:1; `text.secondary` in scuro sarebbe stato 2,3:1), "Oggi" in `SessionCard` e il giorno corrente del calendario su `primary.fill` (prima `primary.main`, 3,79:1).
- **Arancio su testo non toccabile tolto dove stava negli stessi ternari:** conteggi admin (gironi, statistiche partite), colonna punti in `MatchStatsTable`.
- **`#999795`** non c'era piu'. Corretto invece `#999` nell'immagine condivisibile delle squadre (`ShareTeamsButton`, 2,7:1).
- **Regola ESLint** nello stesso array `no-restricted-syntax` di `eslint.config.mjs`, in `warn` come le altre: vieta `color: "text.disabled"` (anche dentro un ternario) e `color="text.disabled"`, esentando gli oggetti `sx` con `fontSize` >= 40. Oggi: 0 segnalazioni.
- **Verifica:** `npm run a11y`, 20 voci della baseline sparite (40 → 20). Rilanciando axe sulle pagine rimaste nessun nodo `color-contrast` e' dovuto a `#9E9E9E`. Schermate prima/dopo su marcatori, risultati, profilo giocatore, calendario, admin allenamenti e dashboard.

**Rimasto fuori** (i nodi `color-contrast` ancora in baseline, 139 in tutto, non dipendono da `text.disabled`):

- Chip con testo bianco su colori medi: ruolo utente "Atleta" in `/admin/utenti` (blu `info` `#0288D1`, 28 nodi), squadre con colore dal database (`#E65100` "Arancioni", `#43A047`), "N senza email" (`warning`), bottoni `warning` su fondo chiaro.
- In `/admin/allenamenti` le card sbiadite degli allenamenti gia' chiusi (ruoli e "0 giocatori" bianchi su pastello): opacita' ridotta su un contenitore.
- Da valutare in un ticket a parte, insieme a UX-11 (colori dei ruoli).
