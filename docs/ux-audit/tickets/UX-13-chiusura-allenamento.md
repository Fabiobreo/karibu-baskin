# UX-13 · Chiusura allenamento: presenze esplicite, un solo salvataggio, statistiche da telefono

**Ondata:** 2 · **Stima:** L · **Dipende da:** UX-03 (etichette dei campi statistiche) · **Stato:** fatto (commit su `develop`): righe chiuse una alla volta, presenze Presente/Assente, un solo salvataggio, statistiche con contatori da telefono; chiusura in 7 tocchi

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

## Esito

- **Lista compatta** (`AdminAllenamentiClient`): un `Accordion` per allenamento, se ne apre uno alla volta. La riga chiusa mostra data, titolo, iscritti e cosa manca ("Presenze da segnare: N", "N risultati mancanti", "Squadre da creare", "Pronto da concludere"). Altezza della pagina su telefono da **22.739 a 4.142 px**.
- **`TrainingCloseForm`**:
  - presenze con due bottoni espliciti **Presente** / **Assente** (icona + testo, 44px); nessuno dei due = non segnato; toccando quello scelto lo si toglie. In cima "Segna tutti presenti" (solo sui non segnati);
  - squadre, poi i punteggi delle partitelle;
  - un solo salvataggio: **Salva e concludi** oppure **Salva senza concludere**;
  - l'errore resta scritto sopra i bottoni finche' non si riprova (UX-05); modifiche non salvate protette alla chiusura della pagina.
- **API:** nuova `PUT /api/sessions/[sessionId]/attendance` (presenze in blocco, in una transazione, solo iscrizioni di quell'allenamento, 5 test). I risultati passano ancora da `match-results` (POST/PUT/DELETE, che ricalcolano il TrueSkill): API invariata. Logica pura in `@/lib/trainingClose` (7 test).
- **Istruzioni:** una sola frase dentro il modulo; tolti il box informativo e la legenda del ciclo a tre stati, sottotitolo accorciato.
- **Bug trovato e corretto:** `POST /api/teams/[sessionId]` filtrava con `NOT: { attended: false }`, che in SQL scarta anche i NULL (non segnati). La creazione automatica delle squadre rispondeva "Nessun atleta iscritto" quando le presenze non erano ancora segnate, cioe' quasi sempre. Ora `OR: [{ attended: null }, { attended: true }]`, test aggiornato. `TeamDisplay` ha un nuovo `beforeGenerate`: il modulo salva le presenze in sospeso prima di creare le squadre, cosi' gli assenti appena segnati restano fuori.
- **Statistiche da telefono:** sotto `md` una card per giocatore (`MatchStatsMobileCards`) con contatori −/+ da 44px (`StatStepper`) per i soli campi del suo ruolo, punti calcolati e note; da `md` in su la tabella resta, con i campi etichettati. Chip MVP e bottoni a 44px.
- **Target touch:** 0 controlli sotto 44px nei due flussi su telefono (prima 64 nelle statistiche). Portati a 44px anche i controlli di `TeamDisplay` (2/3 squadre, Crea squadre, Componi a mano) e le icone di `TeamsHeader`/`ShareTeamsButton`. `ToggleButton` senza maiuscolo forzato nel tema.
- **Verifica** con Playwright su telefono, con un allenamento di prova (12 iscritti anonimi) creato e poi cancellato. Chiusura in **7 tocchi**: apri riga, Segna tutti presenti, 2 Assente, 2 punteggi, Salva e concludi; la creazione delle squadre non e' contata. Nel database: 10 presenti, 2 assenti, 1 risultato, allenamento concluso. `npm test` verde (compresi i test di presenze, squadre e risultati), `npm run a11y`: spariti i `target-size` di `/admin/allenamenti`, baseline 20 → 18.

**Rimasto fuori**

- Una partitella per coppia di squadre: con 2 squadre c'e' **una** partitella, non due. Il criterio "2 partitelle, 4 punteggi" vale con 3 squadre (3 partitelle, 6 punteggi). Piu' partitelle fra le stesse due squadre richiederebbero un cambio di modello (`matchup` univoco per coppia).
- Su desktop la tabella delle statistiche ha ancora campi alti 27px (fuori dal criterio, che riguarda il telefono).
- `TrainingMatchResults` (pagina pubblica dell'allenamento concluso) conserva il suo "Salva" per partitella: lo staff la usa per correggere a posteriori.
