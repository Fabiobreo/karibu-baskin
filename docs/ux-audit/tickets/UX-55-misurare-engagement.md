# UX-55 · Misurare l'engagement: metriche, UTM e aperture delle notifiche

**Ondata:** 7 (engagement) · **Stima:** M · **Dipende da:** nessuno · **Stato:** fatto (11/11/2026, su `develop`)

Richiesta del committente del 06/11/2026 (piano di engagement). Non nasce da un riaudit. È il primo ticket dell'ondata perché tutti gli altri si giudicano con questi numeri: senza, non si sa se una cosa ha funzionato.

## Problema

`/admin/metriche` (KB-32) conta già molto dai dati del database, ma non risponde alle tre domande che contano per il coinvolgimento:

1. **Le famiglie usano il sito ogni settimana?** Oggi c'è "utenti attivi" su una finestra unica; manca l'andamento settimana per settimana e manca la vista per famiglia (un genitore che risponde per due figli è una famiglia attiva, non tre persone).
2. **Le notifiche vengono aperte?** Se ne mandano molte (allenamenti, squadre, convocazioni, news, eventi, compleanni), ma non sappiamo quali vengono toccate e quali vengono ignorate. Senza questo dato non si può decidere cosa tagliare.
3. **Da dove arriva chi chiede di provare?** I link che escono (bio di Instagram, WhatsApp, volantini, sito del Comune) non hanno parametri, quindi Vercel Analytics li mescola tutti in "diretto".

Vincolo: il piano Vercel Hobby non registra eventi personalizzati (`track()`, vedi CLAUDE.md), e non vogliamo strumenti di terze parti. Tutto quello che serve si ricava dal nostro database o si registra in forma **aggregata e senza identificativi**.

## Cosa fare

### 1. Nuove misure in `/admin/metriche`

Calcoli puri in `@/lib/metrics/adminMetrics` (con test), query in `loadAdminMetrics.ts`, come le metriche esistenti. Una sezione "Coinvolgimento" in cima alla pagina, con le misure qui sotto; ogni misura ha il suo numero, il confronto con le 4 settimane prima (testo: "+3 rispetto al mese scorso", **niente verde/rosso**, è un KPI e da UX-29 resta neutro) e una riga di spiegazione in italiano semplice.

| Misura                                | Come si calcola                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Famiglie attive alla settimana**    | Una famiglia è il gruppo di account legati da `ChildGuardian` / `Child.userId` (stessa regola di `loadFamily` in `@/lib/eventFamily`); un tesserato senza legami è una famiglia da solo. Attiva = almeno un account con una sessione rinnovata nella settimana (dalla scadenza a scorrimento, come oggi, con `@/lib/sessionPolicy`). Si mostra la quota sul totale delle famiglie tesserate e un grafico a barre delle ultime 12 settimane |
| **Risposte alle disponibilità**       | Per le partite delle ultime 8 settimane: quota di giocatori della rosa che hanno risposto prima della prima convocazione salvata, e **tempo mediano** fra l'apertura (creazione della partita o primo promemoria) e la risposta                                                                                                                                                                                                            |
| **Iscrizioni agli allenamenti**       | Quota di iscrizioni fatte dalla persona stessa (o dal genitore) rispetto a quelle aggiunte dallo staff con `ManageParticipantsDialog` (`ADD_REGISTRATION` nell'audit). Più alta è, più le famiglie usano l'app invece di scrivere all'allenatore                                                                                                                                                                                           |
| **Da contatto a tesserato**           | Ultimi 6 mesi: account GUEST creati → GUEST con almeno un allenamento → diventati ATHLETE o PARENT. Tre numeri in fila, con i giorni mediani fra un passo e l'altro                                                                                                                                                                                                                                                                        |
| **Aperture delle notifiche per tipo** | Vedi punto 2. Tabella: tipo, inviate, aperte, quota. Ordinata dalla quota più bassa: è la lista delle candidate da tagliare                                                                                                                                                                                                                                                                                                                |

Ogni rapporto senza dati è `null` ("n.d."), mai 0% (regola già in uso).

### 2. Aperture delle notifiche, aggregate

- Nuovo modello `PushDailyStat`: `day` (data, fuso Europe/Rome), `type` (`AppNotificationType`), `sent`, `opened`. Unico su `(day, type)`. **Nessun `userId`**: serve a sapere se un tipo funziona, non chi ha aperto cosa.
- `sent`: in `@/lib/notifications/webpush.ts`, dopo ogni invio riuscito, un `upsert` con `increment` (una riga per tipo e giorno, non per destinatario: si somma il numero di invii riusciti del lotto).
- `opened`: in `public/sw.js`, nel gestore `notificationclick` (fuori dal ramo `mute`), `fetch("/api/push/opened", { method: "POST", body: { type } })` dentro `e.waitUntil`, con `catch` muto. La rotta valida `type` contro l'enum, ha rate limit per IP e fa l'`upsert`. Nessuna autenticazione richiesta (la notifica può arrivare a un'iscrizione anonima), nessun dato salvato oltre al contatore.
- Le notifiche in-app aperte dalla campanella o da `/notifiche` contano già come lette (`AppNotificationRead`): nella tabella si mostrano a parte, "lette nell'app", perché misurano un'altra cosa.
- Alzare `VERSION` del service worker (oggi `karibu-v13`) e aggiornare `src/lib/serviceWorker.test.ts`.
- Pulizia: le righe più vecchie di 13 mesi le cancella il cron `cleanup-notifications` (niente cron nuovo: sono già 7, il massimo del piano).

### 3. Parametri UTM, una regola sola

- Helper `withUtm(path, { source, medium, campaign? })` in `@/lib/utm` (puro, con test): restituisce l'URL assoluto su `SITE_URL` con `utm_source`, `utm_medium` e, se c'è, `utm_campaign`. Non aggiunge parametri a URL esterni e non duplica quelli già presenti.
- Valori ammessi, scritti come costanti nello stesso file (così non nascono `whatsapp`, `WhatsApp` e `wa` insieme):
  - `source`: `whatsapp`, `instagram`, `facebook`, `email`, `volantino`, `qr`, `partner`;
  - `medium`: `share` (condivisione dal sito), `bio` (link nella bio), `print` (carta), `referral` (siti di altri);
  - `campaign`: libero ma minuscolo con trattini (`open-day-2027`, `5x1000-2027`).
- In `docs/workflows/` una pagina breve `link-con-utm.md` per lo staff: quali link usare nella bio di Instagram, sui volantini e nel messaggio al Comune, già pronti da copiare.
- **Contatto da chi arriva con un UTM:** al primo arrivo con parametri UTM il sito salva `source/medium/campaign` in un cookie tecnico di prima parte (`karibu-ref`, 30 giorni, nessun identificativo). Il modulo contatti (`src/app/actions/contact.ts`) lo aggiunge all'email di notifica allo staff ("Arrivato da: Instagram, bio"). È l'unico modo di sapere, senza tracciamento, da quale canale arriva chi chiede di provare. Va citato nella pagina privacy (cookie tecnico, finalità, durata), in tutte e due le lingue.

## Criteri di accettazione

- In `/admin/metriche` la sezione "Coinvolgimento" mostra le cinque misure; con il DB di sviluppo nessuna va in errore e quelle senza dati dicono "n.d.".
- Una famiglia con due genitori e un figlio con account conta una volta sola.
- Inviando una notifica di prova e toccandola dal telefono, `PushDailyStat` ha `sent` e `opened` aumentati di uno per quel tipo; toccando "Silenzia" `opened` non cambia.
- Nella tabella `PushDailyStat` non c'è nessuna colonna che identifichi una persona o un dispositivo.
- `withUtm("/contatti#vieni-a-provare", { source: "instagram", medium: "bio" })` restituisce l'URL assoluto con i due parametri e l'ancora in fondo; test per URL già con parametri, URL esterni, valori non ammessi (errore di tipo).
- Aprendo il sito con `?utm_source=volantino&utm_medium=print` e poi inviando il modulo contatti, l'email allo staff riporta "Arrivato da: volantino, print".
- Il dirigente vede la sezione in sola lettura (la pagina è già `director: true`).
- `npx tsc --noEmit`, `npm test` e `npm run a11y` verdi.

## Rischi noti

- **Vercel Analytics e UTM:** da verificare se il piano Hobby mostra i parametri UTM nel pannello. Se no, l'unica lettura resta quella del modulo contatti (punto 3); i parametri non fanno danni e servono comunque il giorno che si cambia piano.
- **Aperture sottostimate:** su iOS e su alcuni Android una notifica aperta toccando il gruppo, o con il telefono offline, non chiama la rotta. Il numero va letto come confronto fra tipi, non come valore assoluto. Va scritto sotto la tabella.
- **Famiglie:** la regola di raggruppamento deve essere la stessa di `loadFamily`; se cambia lì, cambia qui. Estrarre la parte comune invece di copiarla.

## Esito

- **Coinvolgimento in `/admin/metriche`:** sezione in cima (`EngagementSection`), con `MetricTile`/`MetricSection` spostati in `@/components/admin/MetricTile`. Sei tessere (famiglie attive negli ultimi 7 giorni; rosa che risponde prima delle convocazioni; tempo mediano di risposta; iscrizioni fatte dalle famiglie; da contatto a tesserato in 6 mesi; push aperte), ognuna con il confronto con 4 settimane prima in testo neutro (`@/lib/metrics/formatMetric`: "+3 rispetto al mese scorso", "+5 punti…", "Nessun confronto con il mese scorso"), poi il grafico a barre delle 12 settimane e la tabella delle aperture per tipo, dalla quota più bassa, con "Lette nell'app" a parte e la nota sulla sottostima. La vecchia sezione "Coinvolgimento" (sondaggi, eventi) ora si chiama "Sondaggi ed eventi". Calcoli puri in `adminMetrics.ts` (`computeFamilyActivity`, `computeAvailabilityEngagement`, `computeRegistrationSource`, `computeGuestFunnel`, `computeNotificationOpens`), query in `loadEngagementMetrics.ts`. Il dirigente la vede come il resto della pagina, in sola lettura (non ci sono comandi).
- **Famiglie:** la parte comune con `loadFamily` è in `@/lib/familyLinks` (`childLinkedAccounts`: genitori della scheda più il suo account), usata da tutte e due; `groupFamilies` fa la partizione seguendo i legami fino in fondo (una partizione non può fermarsi a due passi come `loadFamily`; nelle famiglie dell'app coincidono). Contano gli account tesserati; un ospite non fa da ponte.
- **Storico settimanale (scelta tecnica, diversa dal testo del ticket):** una sessione dice solo l'ultimo uso, quindi una settimana passata non si ricostruisce dalle sessioni. Il cron domenicale `cleanup-notifications` salva i numeri della settimana in `WeeklyActivityStat` (`saveWeeklyActivitySnapshot`: famiglie, famiglie attive, account attivi, nessun identificativo); il grafico usa quelle fotografie più gli ultimi 7 giorni calcolati al momento, e il confronto con 4 settimane fa c'è solo dalla quarta domenica dopo il deploy. Fino ad allora il grafico ha una barra sola e la tessera dice "Nessun confronto", come spiega la pagina.
- **Disponibilità:** prima convocazione salvata = primo `UPDATE_CALLUPS` del registro (`MatchCallup` non ha data); la domanda si apre alla creazione della partita o 14 giorni prima se inserita molto prima (calendari importati), chi risponde prima conta zero; le risposte segnate dallo staff non contano; la Karibu usa la rosa di stagione (`loadSeasonRosterSizes`, estratta da `loadAdminMetrics`).
- **Da contatto a tesserato:** ospiti = account creati negli ultimi 6 mesi ancora `GUEST` o con un `UPDATE_ROLE` da `GUEST` nel registro (chi lo staff ha creato già atleta non è un contatto); tesserato = primo `UPDATE_ROLE` da `GUEST` ad `ATHLETE`/`PARENT`; allenamento = prima iscrizione propria o di un figlio, solo se precede il tesseramento.
- **Aperture delle push:** `PushDailyStat` (giorno a Roma, tipo, `sent`, `opened`, unico su giorno+tipo, nessuna colonna di persona o dispositivo). `type` è una stringa e non l'enum, per contare anche la notifica di prova del profilo (`TEST`, criterio di accettazione); i valori ammessi stanno in `PUSH_STAT_TYPE` di `@/lib/notifications/pushStatTypes`. `sent`: `recordPushSent` in `dispatchToSubs` (una scrittura per lotto, un errore non ferma l'invio). `opened`: `public/sw.js` (`karibu-v14`) nel `notificationclick` fuori dal ramo "Non più queste" chiama `POST /api/push/opened` (Zod, 30 al minuto per IP, nessuna autenticazione, 204). Aggiunto il tipo alle push che non l'avevano (compleanni, traguardi, nuovo utente, ruolo sportivo), altrimenti non si contavano. Righe oltre 13 mesi cancellate dal cron `cleanup-notifications`. Migration `20261111120000_engagement_stats` (scritta con `prisma migrate diff`: il DB ombra di `migrate dev` non si ricrea dallo storico) applicata al DB di sviluppo.
- **UTM:** `withUtm` e costanti in `@/lib/utm` (campagna non valida = errore a runtime, fonte e mezzo fuori elenco = errore di tipo); pagina per lo staff `docs/workflows/link-con-utm.md`. Cookie `karibu-ref` scritto da `ReferralCapture` nel layout radice (nel browser, non in un middleware: niente invocazioni in più), primo arrivo vince, 30 giorni, valori ripuliti; il modulo contatti lo legge e l'email allo staff ha la riga "Arrivato da". Informativa privacy aggiornata (cookie `karibu-ref` e contatore delle aperture): la pagina `/privacy` esiste solo in italiano, quindi niente versione inglese da aggiornare.
- **Verifiche:** `tsc --noEmit` ed ESLint puliti; Vitest verde (nuovi test su famiglie, misure, testi del confronto, `withUtm` e cookie, `/api/push/opened`, `recordPushSent`, cron, modulo contatti, service worker: apertura contata, "Non più queste" no, rete assente). Nel browser col DB di sviluppo: la sezione si carica senza errori, le misure senza dati dicono "n.d.", nessuno scorrimento orizzontale a 375 px; `?utm_source=volantino&utm_medium=print` scrive il cookie; `/api/push/opened` risponde 204 e 400 per un tipo sconosciuto. Non provati: una push vera toccata dal telefono (in sviluppo il service worker non è registrato) e l'email reale del modulo contatti (coperta dai test).
- **Da verificare dopo il deploy:** se il pannello Vercel Analytics del piano attuale mostra i parametri UTM.
