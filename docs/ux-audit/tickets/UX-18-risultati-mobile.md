# UX-18 · Righe risultato leggibili su mobile

**Ondata:** 2 · **Stima:** S · **Dipende da:** nessuno · **Stato:** fatto (commit su `develop`): riga partita condivisa `PlayedMatchRow` con la nostra squadra sempre a sinistra; sotto i 600 px data ed esito sopra, squadre una per riga col punteggio

## Problema

In `/risultati` (`src/app/risultati/page.tsx`) su schermi da 390 px i nomi delle squadre vengono troncati ("Orsi Ba…", "Lupi Be…", "Monte…"): proprio il dato che conta. Inoltre la squadra del Karibu sta a sinistra o a destra a seconda di casa/trasferta, e la lettura verticale della lista si spezza.

## Cosa fare

1. Su schermi stretti, riga su due livelli: sopra le squadre per intero, sotto punteggio ed esito.
2. La nostra squadra **sempre a sinistra**, con casa/trasferta indicata dall'icona e dal testo già presenti.
3. Stessa regola nelle liste di partite in home e nel profilo giocatore ("Statistiche per partita"), se usano la stessa impaginazione.

## Criteri di accettazione

- A 360 px nessun nome di squadra troncato con i nomi attuali più lunghi del girone.
- Karibu sempre nella stessa posizione in tutte le righe.

## Esito

- `src/components/matches/PlayedMatchRow.tsx`: una sola riga per le partite giocate, usata da `/risultati` e dalla pagina squadra (`PlayedMatchCard`), che prima avevano due copie dello stesso codice. Sotto i 600 px: data e casa/trasferta a sinistra, esito a destra; sotto, la nostra squadra e l'avversaria una per riga, ognuna col suo punteggio, senza troncare i nomi. Dal tablet in su: `Karibu 67–52 Avversaria` sulla stessa riga.
- Nostra squadra sempre a sinistra anche nelle prossime partite (`/partite` e `UpcomingMatchRow` nella pagina squadra); casa/trasferta resta nell'icona e nel testo.
- Il profilo giocatore ("Statistiche per partita") metteva gia' la nostra squadra per prima: invariato.
- Verificato a 360 px con i nomi del girone di sviluppo.

## Rimasto fuori

- La pagina squadra su mobile e' piu' larga dello schermo (schermata a 447 px con viewport di 360), anche prima di questo ticket: da indagare a parte.
