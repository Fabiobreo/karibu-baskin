# UX-25 · Errori accanto all'elemento, nei flussi principali

**Ondata:** 3 · **Stima:** M · **Dipende da:** UX-05 · **Stato:** fatto (commit su `develop`): componente `InlineError` e sette flussi convertiti; pulsanti di rimozione con il nome della persona

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

## Esito

- **`InlineError`** (`src/components/common/InlineError.tsx`): `Alert` di errore con titolo in grassetto ("Iscrizione non salvata."), motivo, "Riprova" e chiusura. Resta finché non si riprova o si chiude; `role="alert"` lo fa annunciare al lettore di schermo. Con "Riprova" MUI nasconderebbe la X di chiusura: il componente mette entrambi i bottoni.
- **Flussi convertiti** (l'errore compare accanto all'elemento, non più in un toast):
  1. Iscrizione a un allenamento (`useRegistrationForm` + `RegistrationForm`): sopra il bottone di invio, in entrambi i form (atleta e allenatore). "Riprova" ripete l'invio.
  2. Rimozione dalla lista iscritti e presenze (`RosterByRole`): in testa alla lista, con il nome ("Iscrizione di Chiara Gallo non tolta.", "Presenza di … non salvata."). In lista le pastiglie stanno una accanto all'altra: un avviso sotto la singola pastiglia avrebbe spezzato la riga. Anche l'errore delle presenze segnate in automatico è passato qui.
  3. Chiusura dell'allenamento (`TrainingCloseForm`): c'era già un avviso vicino ai bottoni (UX-05); ora è `InlineError`, con "Riprova" che ripete l'ultimo salvataggio (salva o conclude). L'errore di validazione dei punteggi resta senza "Riprova".
  4. Convocazioni (`ConvocazioniClient`): sotto la barra con "Salva"; con due squadre il messaggio dice quale non è stata salvata.
  5. Statistiche partita (`MatchStatsClient`): l'errore del salvataggio non sta più in cima alla pagina ma accanto a "Salva statistiche", in fondo alla tabella; il motivo arriva dal server (`readError`). `MatchStatsMobileCards` non salva da sé: coperto dal genitore.
  6. RSVP agli eventi (`EventRsvp`): sotto i bottoni della persona a cui si riferisce (genitore o figlio), o sotto "Salva" negli eventi con opzioni.
  7. Voto ai sondaggi (`PollWidget`): sotto il bottone "Vota".
- **Nomi accessibili:** "Rimuovi l'iscrizione di {name}" (`trainings.removeRegistrationOf`) su pastiglie e lista allenatori: 8 iscritti, 8 nomi diversi.
- Testi nuovi in it/en: `trainings.registrationNotSaved`, `unregisterFailed`, `attendanceFailed`, `removeRegistrationOf`, `events.rsvpNotSaved`, `poll.voteNotSaved` (admin in italiano).
- **Seed di UX-26:** aggiunto un evento "[UX]" futuro (per provare l'RSVP), segnalato da `db:check-seed`; a ogni `seed` si annullano iscrizioni e risposte fatte durante le prove.
- **Verifica** con Playwright a 390 px, ogni chiamata intercettata con un 500: in tutti e sette i flussi l'avviso compare accanto all'elemento, con "Riprova"; per l'iscrizione, tolto l'errore, "Riprova" iscrive davvero e l'avviso sparisce. `tsc`, `npm test` (1790), `npm run a11y` verdi.

## Rimasto fuori

- Gli altri `showToast` di errore restano: pannelli admin (utenti, partite, eventi, news, gironi, squadre), profilo (figli, avatar, preferenze), gallery, suggerimenti, link genitore-figlio. Da convertire quando si toccano quei file.
- La chiave `trainings.removeRegistration` non è più usata: si può togliere dai dizionari.
- Nessun test di componente: questi file non ne avevano.
- Schermate "prima" non fatte: il dev server è condiviso con un'altra sessione. Prima l'errore era un toast in basso a sinistra.
