# UX-13 · Chiusura allenamento: presenze esplicite, un solo salvataggio, statistiche da telefono

**Ondata:** 2 · **Stima:** L · **Dipende da:** UX-03 (etichette dei campi statistiche) · **Stato:** da fare

## Problema

Chiudere un allenamento è il compito più difficile del sito, e lo staff lo fa spesso dal telefono a bordo campo.

In `/admin/allenamenti` (`src/components/admin/AdminAllenamentiClient.tsx`):

- tutte le card degli allenamenti da completare sono aperte: con 27 allenamenti la pagina è lunga circa 16.000 px su desktop e 21.000 su mobile;
- le presenze si segnano toccando un pallino che **cicla fra 3 stati** (presente → assente → non marcato). Non si scopre da solo: serve una barra di spiegazione (riga 437) ed è facile sbagliare di un tocco;
- ogni partitella ha il suo "Salva", poi c'è "Concludi allenamento": più salvataggi separati per una sola operazione;
- istruzioni ripetute tre volte (sottotitolo, box informativo, barra suggerimenti);
- su mobile 196 elementi interattivi su 311 sono sotto i 44 px, 14 sotto i 24 px.

Statistiche partita (`src/components/matches/MatchStatsClient.tsx`): tabella di campi numerici piccoli, senza pulsanti +/-: scomoda da telefono.

## Cosa fare

1. **Lista compatta:** ogni allenamento da completare è una riga chiusa (data, titolo, numero iscritti, stato: "presenze mancanti", "risultati mancanti"). Si apre una sola alla volta.
2. **Presenze:** per ogni persona due bottoni espliciti, **Presente** / **Assente**, con icona e testo; lo stato "non marcato" è semplicemente nessuno dei due selezionato. In cima: "Segna tutti presenti".
3. **Un solo salvataggio:** presenze e risultati delle partitelle si salvano con "Salva e concludi" (con la possibilità di "Salva senza concludere"). Mantenere il salvataggio dei risultati compatibile con l'API attuale.
4. **Istruzioni:** una sola, breve, dove serve.
5. **Statistiche da telefono:** su schermi stretti, una card per giocatore con pulsanti +/- grandi (almeno 44 px) per 2 punti, 3 punti, tiri liberi, falli; su desktop la tabella resta, con i campi etichettati (UX-03).
6. Target touch di almeno 44 px per tutti i controlli dei due flussi.

## Criteri di accettazione

- Chiudere un allenamento con 12 iscritti, 2 assenti e 2 partitelle richiede al massimo: apri riga, "Segna tutti presenti", 2 tocchi per gli assenti, 4 punteggi, "Salva e concludi".
- Nessun controllo a stati ciclici.
- Su mobile nessun controllo dei due flussi sotto i 44 px.
- `npm test` verde, compresi i test delle API di chiusura e presenze.
