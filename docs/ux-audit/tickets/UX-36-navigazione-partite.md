# UX-36 · Navigazione di sezione Partite, titoli senza doppioni

**Ondata:** 4 · **Stima:** M · **Dipende da:** UX-32 · **Stato:** da fare

## Problema

Il menu "Partite" apre quattro pagine (Prossime `/partite`, Risultati `/risultati`, Classifiche `/classifiche`, Marcatori `/marcatori`) che non hanno una navigazione comune, e ognuna rimedia a modo suo:

- `/classifiche` ha nell'hero 3 bottoni fantasma (Classifica marcatori, Tutti i risultati, Calendario);
- `/marcatori` ne ha 2;
- `/risultati` nessuno;
- `/partite` un link "Vedi i risultati →" in fondo.

Titoli ripetuti:

- `/classifiche` ha hero "Classifiche · Stagione 2025-26" e subito sotto H2 "Classifica campionato · Stagione 2025-26: classifica e calendario per giornata";
- `/risultati`, `/classifiche` e `/marcatori` ripetono "La stagione 2026-27 non è ancora iniziata. Qui sotto vedi la stagione 2025-26.", e `/marcatori` aggiunge "Dati relativi alla stagione 2025-26…".

Fuori sezione: `/squadre` si intitola "ASD Karibu Baskin", con il chip "Chi siamo" e 4 numeri del club. La pagina Squadre fa anche da "chi siamo".

Nota: il riordino del **menu principale** resta parcheggiato; questo ticket riguarda solo la navigazione **dentro** la sezione.

## Cosa fare

1. Tab di sezione nello slot del page header (UX-32), uguali nelle 4 pagine: **Prossime · Risultati · Classifica · Marcatori**, con la pagina corrente attiva (link veri, non tab client).
2. Selettore di stagione condiviso sotto le tab, con un solo avviso quando la stagione scelta non è ancora iniziata.
3. Tolti i bottoni fantasma dagli hero e il link in fondo a `/partite`.
4. `/classifiche`: un solo titolo; il sottotitolo dice cosa c'è sotto.
5. `/squadre`: titolo "Squadre". I numeri del club e la storia stanno in home ("Chi siamo") o in una futura pagina "Il club" (da decidere col club); qui restano squadre, archivio e simulatore.

## Criteri di accettazione

- Dalle 4 pagine si passa a ciascuna delle altre in un tocco, senza aprire il menu.
- Nessun titolo o avviso ripetuto nella stessa pagina.
- Testi in `it.json` ed `en.json`; `npm run a11y` verde.
