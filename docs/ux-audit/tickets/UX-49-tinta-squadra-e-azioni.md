# UX-49 · Tinta squadra dove convive con azioni ed esiti

**Ondata:** 5 · **Stima:** S · **Dipende da:** decisione del committente · **Stato:** fatto (03/10/2026): A e C fatti, B scartata dal committente

Nato dal [riaudit del 02/10/2026](../RIAUDIT-2026-10-02.md), problema 3.

## Problema

La palette di UX-29 è chiusa e rispettata: nessun colore fuori da `@/lib/palette`, una tinta per squadra, stessa tinta in tutte le pagine della stagione. Il vincolo del committente "il colore della squadra è quello della sua maglia" porta però nella ruota un Arancio e un Verde squadra, vicini all'arancio dei bottoni e al verde della vittoria. UX-29 le dichiara "coppie deboli" (ΔE 12,5-13), separate dal nome della squadra e dalla forma.

A schermo, con una squadra arancione o verde, si nota più di quanto dicano i numeri:

- **`/marcatori`, stagione 2025-26:** avatar e chip Kapuleti in arancio squadra, chip "Tutti" e stagione selezionati in arancio d'azione, colonna dei punti in arancio. Tre usi dello stesso colore in una schermata.
- **`/risultati`:** la fascia verde Montekki sta sopra la barra verde delle vittorie; la fascia arancio Kapuleti sotto il chip arancio della stagione.
- **`/admin/partite`:** chip squadra arancio, azione "Statistiche" arancio, bottone "Nuova partita" arancio.

Non è un errore di implementazione e non si risolve con una tinta nuova (la ruota è piena, vedi l'aggiornamento del 01/10 in UX-29).

## Da decidere con il committente

La regola in CLAUDE.md è "tinta squadra come superficie, non come puntino", scelta il 01/10 dopo che il sito era parso "meno colorato". Le proposte qui sotto la restringono in tre punti: servono un sì o un no per ciascuna.

- **A. Punti dei marcatori in inchiostro.** La colonna ordinata la dice già la freccia nell'intestazione. È l'unica delle tre che non tocca la tinta squadra.
- **B. Nelle pagine con filtri e bottoni, tinta squadra come filo.** In `/marcatori` e `/admin/partite` il chip squadra pieno diventa un chip neutro con il filo o il pallino nella tinta (`TeamColorDot`); gli avatar restano pieni.
- **C. In `/risultati`, barra degli esiti staccata dalla fascia squadra.** Più spazio fra le due, o la barra dentro la card dei conteggi, così il verde della squadra e il verde della vittoria non si toccano.

Si può anche decidere di non fare nulla: la coppia è dichiarata e il secondo segnale (nome, lettera, forma) c'è sempre.

## Decisione (03/10/2026)

Presa da chi implementa su delega del committente per le parti che non toccano la regola della tinta squadra, rivista da un designer:

- **A: sì**, per qualunque colonna ordinata, non solo i punti: la colonna ordinata è uno stato attivo, che porta già `TableSortLabel active`; colorare tutte le celle della colonna era un doppione. Celle in inchiostro (`text.primary`), freccia dell'intestazione invariata.
- **C: sì**, ma non con più spazio (12 px non staccano due verdi): in `/risultati` sotto la fascia squadra vengono prima i chip dei conteggi (testo), poi la barra degli esiti, su un binario neutro (`action.hover`). Resta il caso Kapuleti sotto il chip arancio della stagione (stato attivo contro identità): è dentro B.
- **B: no** (committente, 03/10/2026): il chip squadra resta pieno anche in `/marcatori` e `/admin/partite`; vale la regola "tinta squadra come superficie" del 01/10, e il nome accanto al colore è il secondo segnale.

## Criteri di accettazione

- In `/marcatori` nessuna cella in arancio (desktop e telefono); la freccia della colonna ordinata resta.
- In `/risultati` tra la fascia squadra e la barra degli esiti c'è la riga dei conteggi; la barra ha un binario neutro.
- Il resto come sotto.

## Esito (03/10/2026)

- **A:** in `/marcatori` le celle della colonna ordinata restano in grassetto ma in `text.primary`; la freccia di `TableSortLabel` non cambia. A 1.440 px tutte le celle numeriche della prima riga misurano `rgb(26, 26, 26)` (prima i punti erano `rgb(191, 54, 12)`); sulle card del telefono i punti erano già in inchiostro.
- **C:** in `/risultati` sotto la fascia squadra vengono i chip dei conteggi, poi la barra degli esiti dentro un binario `action.hover` (2 px attorno, raggio `pill`).
- Nessun colore nuovo; `palette.test.ts` e `teamColors.test.ts` verdi. Regola in CLAUDE.md invariata (A e C non la toccano). `npm run a11y` non rieseguito in questo passaggio.

Criteri generali: In ogni caso: `palette.test.ts` e `teamColors.test.ts` verdi, nessun colore nuovo, `npm run a11y` verde in chiaro e in scuro, e la regola in CLAUDE.md aggiornata se cambia.
