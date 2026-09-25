# UX-25 · Errori accanto all'elemento, nei flussi principali

**Ondata:** 3 · **Stima:** M · **Dipende da:** UX-05 · **Stato:** da fare

## Problema

UX-05 ha fatto sì che gli errori non spariscano più da soli e ha portato accanto all'elemento l'errore della disponibilità alle partite. Restano circa **270 chiamate a `showToast`** con un errore che riguarda un elemento preciso: l'avviso compare in un angolo, lontano da ciò che non è andato, e su telefono copre la barra in basso. Rifarle tutte non vale la pena: conviene farlo dove l'errore è frequente o costoso.

Inoltre il pulsante per togliere un'iscrizione ha un'etichetta generica ("Rimuovi iscrizione"): in una lista di iscritti un lettore di schermo sente lo stesso nome per ogni riga.

## Cosa fare

1. Scegliere i flussi in cui un errore conta di più, e lì mettere l'errore accanto all'elemento (`Alert` sotto la riga o `helperText` del campo), con "Riprova" dove ha senso. Proposta:
   - iscrizione e disiscrizione a un allenamento (`RegistrationForm`, `RosterByRole`);
   - presenze e punteggi nella chiusura dell'allenamento (`TrainingCloseForm`);
   - convocazioni (`ConvocazioniClient`) e statistiche partita (`MatchStatsClient`, `MatchStatsMobileCards`);
   - RSVP agli eventi (`EventRsvp`) e voto ai sondaggi (`PollWidget`).
2. Un piccolo componente condiviso (per esempio `InlineError`: messaggio + "Riprova") per non riscrivere ogni volta lo stesso `Alert`.
3. Etichette con il nome: "Rimuovi l'iscrizione di {name}" (e simili per gli altri pulsanti ripetuti in lista), nei dizionari.
4. Il resto dei `showToast` di errore resta com'è: annotare nel ticket quali flussi sono stati convertiti.

## Criteri di accettazione

- Nei flussi scelti, con un errore di rete simulato, il messaggio compare accanto all'elemento e resta finché non si riprova o si chiude.
- In una lista di iscritti ogni pulsante di rimozione ha un nome accessibile diverso.
- Test dei componenti toccati dove esistono; schermate prima/dopo su telefono.
