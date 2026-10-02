# UX-36a · Navigazione di sezione Partite, titoli senza doppioni

**Ondata:** 4 · **Stima:** M · **Dipende da:** UX-32 · **Stato:** fatto (su `develop`)

> Il 01/10/2026 il ticket UX-36 è stato diviso in due: qui la navigazione della sezione Partite (punti 1-4), in [UX-36b](UX-36b-squadre-e-il-club.md) la pagina `/squadre` e la pagina nuova "Il club" (punti 5-6), che aspetta i testi del club.

## Problema

Il menu "Partite" apre quattro pagine (Prossime `/partite`, Risultati `/risultati`, Classifiche `/classifiche`, Marcatori `/marcatori`) che non avevano una navigazione comune, e ognuna rimediava a modo suo:

- `/classifiche` aveva nell'hero 3 bottoni fantasma (Classifica marcatori, Tutti i risultati, Calendario);
- `/marcatori` ne aveva 2;
- `/risultati` nessuno, più un link "Vedi le prossime partite →" in fondo;
- `/partite` un link "Vedi i risultati →" in fondo.

Nomi diversi per la stessa pagina: la voce di menu "Risultati" apriva una pagina intitolata "Partite ufficiali", la voce "Marcatori" una pagina intitolata "Classifica interna" (accanto a una "Classifica campionato").

Titoli e avvisi ripetuti:

- `/classifiche` aveva l'hero "Classifiche · Stagione 2025-26" e subito sotto l'H2 "Classifica campionato · Stagione 2025-26: classifica e calendario per giornata";
- `/marcatori` diceva la stagione nei chip, nell'avviso e in "Dati relativi alla stagione 2025-26…";
- i chip di stagione erano copiati in tre pagine; `/partite` li aveva anche se le prossime partite di una stagione passata non esistono.

Nota: il riordino del **menu principale** resta parcheggiato; questo ticket riguarda solo la navigazione **dentro** la sezione.

## Decisioni (01/10/2026)

- **Una parola per pagina:** voce di menu, tab e h1 dicono la stessa cosa. Gli h1 diventano "Risultati" e "Marcatori". La tab di `/partite` è "Prossime" (l'h1 resta "Prossime partite": a 360 px quattro voci lunghe non ci stanno).
- **Niente selettore di stagione su `/partite`:** mostra solo la stagione in corso.
- **La stagione scelta segue l'utente** fra Risultati, Classifiche e Marcatori; `/classifiche` accetta `?season=`.
- **Tab ferme su desktop (02/10/2026):** le quattro intestazioni usano la colonna piena, anche su Prossime e Risultati dove il contenuto sta nella colonna `main` (880 px). È un'eccezione alla regola di UX-37 (intestazione sopra il suo contenuto): senza, le tab si spostavano di 128 px sotto il cursore passando da una pagina all'altra. Ora la prima voce sta a 65 px dal bordo su tutte e quattro a 1.280 px.
- **Stessa altezza di fascia nelle quattro pagine:** tutte hanno un sottotitolo fisso di una riga, così le tab non saltano passando da una pagina all'altra.

## Cosa è stato fatto

1. **Tab di sezione** `MatchesSectionNav` (`@/components/matches/MatchesSectionNav`, voci in `@/lib/matches/sectionNav`) nello slot `nav` di `PageHero`, uguali nelle 4 pagine e nei loro `loading.tsx`: **Prossime · Risultati · Classifiche · Marcatori**. Sono link veri dentro un `<nav>`, con `aria-current="page"` sulla pagina corrente e il filo arancio di 3 px come stato attivo. Con `nav` la fascia non ha padding in basso: le tab toccano il bordo.
2. **Selettore di stagione** `SeasonSelector` (`@/components/common/SeasonSelector`) su Risultati, Classifiche e Marcatori: chip da 32 px quando le stagioni sono più di una, una riga di testo quando è una sola, e l'unico avviso di ricaduta della pagina.
3. Tolti i bottoni fantasma dagli hero e i link in fondo a `/partite` e `/risultati`.
4. `/classifiche`: un solo titolo, il sottotitolo dice cosa c'è sotto ("Classifica e calendario di ogni girone"); il nome del girone è l'`h2`.
5. `/marcatori`: la riga d'aiuto non ripete più la stagione.

## Review del 02/10/2026

Corretti dopo la review:

- **`?season=` non validato.** Un parametro ripetuto (`?season=a&season=b`) arrivava come array e faceva cadere `/risultati` e `/marcatori` (difetto che c'era già, esteso a `/classifiche` dal nuovo parametro); un testo qualunque finiva scritto nella pagina ("Nessun girone per la stagione …"). Ora passa da `parseSeasonParam` (`@/lib/season/seasonUtils`): vale solo una stagione ben formata, il resto è "nessuna scelta".
- **Filo della tab attiva** largo quanto il padding, quindi a sinistra del titolo: ora sta sotto la sola parola e parte dal bordo della colonna. Su telefono la prima voce è allineata al titolo e l'ultima al bordo destro.
- **`/classifiche` e `/partite` fuori da `npm run a11y`:** aggiunte allo script. Su `/classifiche` è emersa una violazione grave che c'era già (le due tabelle che scorrono di lato non ricevevano il focus): ora sono regioni con nome e `tabIndex`.

## Misure (02/10/2026)

- Fascia alta 145 px a 360 px e 153 px a 1.280 px, uguale su tutte e quattro le pagine.
- A 360 px le quattro tab stanno in 340 px senza scorrere, alte 44 px; a 320 px scorrono di 6 px dentro la fascia, la pagina non sborda.
- `npx tsc --noEmit`, `npm run lint`, `npm test` (1.987 test) e `npm run a11y -- --only=anon` (ora con le quattro pagine) verdi.

## Aperto

- Su telefono, con il testo ingrandito, le quattro voci scorrono di lato senza un segnale visibile.

## Criteri di accettazione

- Dalle 4 pagine si passa a ciascuna delle altre in un tocco, senza aprire il menu.
- Nessun titolo o avviso ripetuto nella stessa pagina.
- Voce di menu, tab e h1 con la stessa parola.
- Testi in `it.json` ed `en.json`; `npm run a11y` verde.

## Rimasto fuori

- `/squadre` e la pagina "Il club": [UX-36b](UX-36b-squadre-e-il-club.md).
- Il dettaglio di una partita (`/partite/[slug]`) non ha le tab: è un `EntityHero` con il suo breadcrumb.
