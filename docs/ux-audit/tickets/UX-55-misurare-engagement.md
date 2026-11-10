# UX-55 · Misurare l'engagement: metriche, UTM e aperture delle notifiche

**Ondata:** 7 (engagement) · **Stima:** M · **Dipende da:** nessuno · **Stato:** da fare

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
