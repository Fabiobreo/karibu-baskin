# UX-49 · Tinta squadra dove convive con azioni ed esiti

**Ondata:** 5 · **Stima:** S · **Dipende da:** decisione del committente · **Stato:** da fare, in attesa di decisione

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

## Criteri di accettazione

Da scrivere dopo la decisione. In ogni caso: `palette.test.ts` e `teamColors.test.ts` verdi, nessun colore nuovo, `npm run a11y` verde in chiaro e in scuro, e la regola in CLAUDE.md aggiornata se cambia.
