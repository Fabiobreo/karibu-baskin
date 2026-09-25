# UX-26 · Dati di prova per le verifiche rimaste in sospeso

**Ondata:** 3 · **Stima:** S · **Dipende da:** nessuno · **Stato:** fatto (commit su `develop`): `npm run db:seed-ux` / `db:clean-ux`, marcatori `@ux.test` e "[UX]" in `db:check-seed`, interruttore `DISABLE_NOTIFICATIONS` (mai in produzione); le quattro prove fatte nel browser

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

## Esito

- **Seed:** `prisma/scripts/seed-ux-checks.ts`, con `npm run db:seed-ux` e `npm run db:clean-ux`. Id ed email fissi: due `seed` di fila aggiornano le stesse righe (e rimettono le date a partire da oggi, annullando collegamenti e iscrizioni fatti nelle prove), due `clean` di fila non trovano niente. Crea il genitore `genitore@ux.test` con il figlio Tommaso Provini senza ruolo, l'atleta `atleta@ux.test`, un allenamento "[UX]" fra 3 giorni con le iscrizioni aperte, due allenamenti "[UX]" passati con un'iscrizione anonima ciascuno, due partite amichevoli di sabato (squadra agonistica della stagione in corso) contro due avversarie "[UX]" dal nome lungo. `clean` cancella anche gli allenamenti "[UX]" creati a mano dall'admin durante le prove, con le loro iscrizioni.
- **Differenza dal ticket:** "Ti riconosco!" confronta il **nome** dell'iscrizione anonima con quello dell'account, non l'email; il seed usa quindi il nome dell'atleta di prova (l'email c'è comunque).
- **`npm run db:check-seed`** conta ora anche gli utenti `@ux.test`, gli allenamenti con titolo "[UX]" e le avversarie "[UX]".
- **Notifiche:** `notificationsDisabled()` in `src/lib/notifications/devSwitch.ts` vale `true` solo con `DISABLE_NOTIFICATIONS=true` **e** `NODE_ENV` diverso da `production` (stesso doppio cancello di `/api/test-login`). La controllano `dispatchToSubs` (da lì passano tutte le `sendPushTo*`) e le due funzioni delle notifiche in-app; ciò che non parte finisce in console come `[notifiche spente]`. Test in `devSwitch.test.ts`. Documentata in `.env.example` e in CLAUDE.md.
- **Le quattro prove** (25/09/2026, esito annotato anche nei ticket d'origine):
  1. UX-17, questionario per un figlio (mobile): domande in terza persona con i pittogrammi. Riuscita.
  2. UX-06, "Ti riconosco!": caselle vuote, bottone disattivato a zero, collegamento riuscito. Riuscita, con tre difetti minori annotati in UX-06.
  3. UX-14, ciclo di vita dall'admin: creazione, apertura iscrizioni con "Apri e notifica", iscritti, squadre. Riuscita; **0 notifiche in-app** scritte nel database durante tutte le prove (nel DB di sviluppo ci sono 2 iscrizioni push vere, e anche quelle passano dall'interruttore).
  4. UX-17, date lunghe delle prossime partite a 360 px: "sabato 3 ottobre · 15:00" su una riga in home e in `/partite`, pagina larga 360 px. Riuscita.

## Rimasto fuori

- Due notifiche in-app sono scritte direttamente dentro una transazione e **non** passano dall'interruttore: eliminazione di un figlio (`api/children/[childId]`) e risposta a una richiesta di collegamento (`api/link-requests/[requestId]/respond`). Nessuna delle quattro prove le tocca. Neanche le email (Resend) sono coperte.
- Visti durante le prove, da correggere altrove: caselle di "Ti riconosco!" senza nome accessibile, card che sparisce dopo un collegamento parziale, testo al plurale con una sola iscrizione (UX-06); nome lungo dell'avversaria troncato senza modo di leggerlo in `/partite` (UX-17).
- Il commento di `sessionDateSlug` in `src/lib/slugUtils.ts` descrive il formato "2025-03-15T18:00", ma il form admin salva "202503151800" e la funzione non è usata fuori dai test.
- Schermate a pagina scorsa: il pannello browser in emulazione mobile cattura male le pagine scorse (fascia vuota sopra l'header); gli esiti sono stati letti dal DOM e dal database.
