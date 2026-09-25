# UX-26 · Dati di prova per le verifiche rimaste in sospeso

**Ondata:** 3 · **Stima:** S · **Dipende da:** nessuno · **Stato:** da fare

## Problema

Alcune modifiche dei ticket precedenti sono coperte da test ma **non sono state provate nel browser**, perché il database di sviluppo non ha i dati che servono o perché provarle manderebbe notifiche vere:

| Da    | Cosa non provato                                                                       | Perché                                                |
| ----- | -------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| UX-17 | Questionario del ruolo compilato per un figlio (domande in terza persona, pittogrammi) | nessun allenamento con iscrizioni aperte              |
| UX-06 | Collegamento delle iscrizioni anonime a un account (punto 1)                           | nessun utente con iscrizioni anonime da collegare     |
| UX-14 | Creazione, apertura iscrizioni e squadre di un allenamento futuro                      | invia push e notifiche in-app agli utenti di sviluppo |
| UX-17 | Date lunghe ("sabato 17 ottobre · 15:00") nelle card delle prossime partite su mobile  | nessuna partita futura                                |

## Cosa fare

1. Uno script di seed per le verifiche (`prisma/scripts/seed-ux-checks.ts`, idempotente) che crea con dati riconoscibili (`@ux.test`, titoli "[UX]"):
   - un allenamento futuro con iscrizioni aperte;
   - un genitore di prova con un figlio **senza** ruolo;
   - iscrizioni anonime con l'email di un utente di prova;
   - due partite future con nomi di squadra lunghi.
2. Uno script gemello che cancella tutto ciò che ha creato. Aggiungere il dominio `@ux.test` e i titoli "[UX]" ai controlli di `npm run db:check-seed`, così non finiscono in produzione.
3. Notifiche: una variabile d'ambiente di sviluppo (per esempio `DISABLE_NOTIFICATIONS=true`) che fa uscire subito `sendPushTo*` e la creazione delle notifiche in-app, per provare il ciclo di vita dell'allenamento senza avvisare nessuno. Mai attiva in produzione.
4. Rifare le quattro prove della tabella e annotare l'esito qui e nei ticket d'origine.

## Criteri di accettazione

- Seed e pulizia girano due volte di fila senza errori e senza duplicati.
- `npm run db:check-seed` segnala i dati `@ux.test`.
- Le quattro prove fatte, con schermate, e nessuna notifica inviata durante le prove.
