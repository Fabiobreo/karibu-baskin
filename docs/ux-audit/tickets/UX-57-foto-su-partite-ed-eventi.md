# UX-57 · Foto su partite ed eventi, avviso "Sono arrivate le foto" (album fase 2)

**Ondata:** 7 (engagement) · **Stima:** M · **Dipende da:** UX-52 · **Stato:** da fare

Richiesta del committente del 06/11/2026 (piano di engagement). Riprende due punti che UX-52 aveva lasciato fuori dalla fase 1: la fascia "Foto" sulle pagine di evento e partita, e la notifica alla pubblicazione.

## Problema

Le foto sono il contenuto che le famiglie cercano di più dopo una partita o un evento, e oggi:

- un album collegato a una partita o a un evento (`PhotoAlbum.matchId` / `eventId`, già salvati) si vede solo da `/gallery`: dalla pagina della partita non c'è nessun collegamento, quindi chi apre il risultato non sa che ci sono le foto;
- nessuno viene avvisato quando un album esce, e il link Drive continua a girare su WhatsApp al posto della pagina del sito;
- la home non mostra mai le foto, nemmeno l'ultimo album.

## Decisioni già prese

- Da UX-52 (committente, 07/10/2026): **la notifica è facoltativa e spenta di default**. La spunta "Avvisa" sta nel form dell'album, come per eventi e news.
- Visibilità: un album "Solo tesserati" non si mostra e non si annuncia a chi non è tesserato. Vale anche per la fascia e per la notifica.

## Cosa fare

### 1. Fascia "Foto" su partita ed evento

Componente `AlbumStrip` in `@/components/gallery/` (Server Component, dati da una funzione `loadLinkedAlbums({ matchId } | { eventId }, viewerIsMember)` in `@/lib/gallery/albums`, che applica `visibleAlbumWhere`).

- **Dove:** in `/partite/[slug]` subito dopo il tabellino e prima della distinta; in `/eventi/[slug]` subito dopo la descrizione. Se non c'è nessun album visibile, la fascia non c'è (niente stato vuoto).
- **Cosa mostra:** titolo di sezione `h4` "Foto" con icona decorativa `primary.main`; una riga di 4 miniature (2 su telefono) prese dalle prime foto visibili dell'album, con le proporzioni vere e `referrerPolicy="no-referrer"` (regole di UX-52: `drivePhotoUrl`, `<img>`, niente `next/image`); un bottone `outlined` "Guarda tutte le 84 foto" verso `/gallery/<slug>`. Toccando una miniatura si apre l'album **su quella foto** nel lightbox (`/gallery/<slug>?foto=<photoId>`; se il parametro oggi non esiste, va aggiunto alla pagina dell'album, che apre il lightbox e va alla pagina giusta come già fa alla chiusura).
- **Più album collegati alla stessa partita** (due fotografi): una riga per album, con il nome dell'album sopra.
- **Album riservato e chi non è tesserato:** al posto delle miniature la riga "Ci sono le foto di questa partita, visibili ai tesserati" con "Accedi" (`callbackUrl` sulla partita). Nessuna foto nel payload, come nella pagina dell'album.
- Testi in `it.json` ed `en.json`.

### 2. Avviso "Sono arrivate le foto"

- Nuovo valore `ALBUM_PUBLISHED` in `AppNotificationType` (migration), classificato in `notificationDisplay` (`@/lib/notifications/notificationDisplay`): occhiello "Foto", titolo = titolo dell'album. È un `Record` sull'enum: senza la voce non compila.
- Aggiungerlo ai tipi controllabili in `@/lib/notifications/notifPrefs` (`CONTROLLABLE_TYPES`, etichetta "Nuove foto", descrizione "Quando escono le foto di una partita o di un evento") e quindi ai tipi silenziabili del service worker (`MUTABLE_TYPES` in `public/sw.js`, alzare `VERSION`).
- **Quando parte:** solo alla creazione dell'album con la spunta "Avvisa" accesa (spenta di default, decisione di UX-52), e mai per un album con data più vecchia di 30 giorni (come gli eventi passati che non avvisano). "Aggiorna" e il cron `gallery-sync` non avvisano mai: se il fotografo aggiunge altre foto il giorno dopo, nessuno riceve un secondo avviso.
- **Chi lo riceve:**
  - album collegato a una partita: convocati e giocatori con statistiche di quella partita e i loro genitori (`playerRecipientIds`), più chi ha la preferenza attiva fra i tesserati;
  - album collegato a un evento: chi ha risposto "Ci sarò" e le loro famiglie, più i tesserati;
  - album senza collegamento: tutti i tesserati (`MEMBER_APP_ROLES`).
  - **Mai `sendPushToAll`**, nemmeno per un album pubblico: raggiungerebbe le iscrizioni anonime, e le foto riguardano persone. Push e in-app alle stesse persone (`sendPushToUsers` + `createTargetedAppNotifications`), dentro `inBackground`.
- **Testo:** titolo "Le foto di Karibu – Thiene", corpo "84 foto, scattate da <fotografo se c'è nel titolo, altrimenti niente>". URL: la pagina dell'album, con `withUtm` non serve (è una notifica, si misura con UX-55).
- Nel form dell'album (`/admin/gallery`) la spunta "Avvisa le famiglie" con sotto, in testo, a chi arriverà ("Arriverà ai 14 convocati e alle loro famiglie"). Audit: nel `CREATE_ALBUM` esistente, aggiungere `notified: true/false`.
- "Avvisa di nuovo" dal "⋯" della riga, con le stesse regole di eventi e news (`renotifyRules.ts`: dieci minuti fra due avvisi, album di non più di un mese), campo `PhotoAlbum.lastNotifiedAt` (migration). Il promemoria sostituisce l'avviso precedente in lista (`removeAppNotifications`).

### 3. Ultimo album in home

- In home, nella sezione news (o subito dopo, decidere guardando la pagina con dati veri), una riga compatta "Nuove foto" con la copertina e il titolo dell'**album più recente visibile a chi guarda**, uscito da non più di 14 giorni. Una sola riga, mai una griglia: la home non deve diventare la gallery.
- Dati in una funzione in cache per richiesta (`loadHomeAlbum`), dentro il `Promise.all` delle altre sezioni (regola sullo streaming di CLAUDE.md).

### 4. Guida e documentazione

- `/guida`: nel capitolo sulle notifiche citare il nuovo tipo, nelle due lingue (`guide.test.ts` controlla le etichette).
- `CLAUDE.md`: aggiornare il paragrafo degli album (la fascia e la notifica non sono più "fuori dalla fase 1").

## Criteri di accettazione

- Una partita con un album pubblico collegato mostra la fascia a chiunque; con un album "Solo tesserati" l'anonimo legge la riga con "Accedi" e nel sorgente della pagina non c'è nessun id di foto.
- Toccando la terza miniatura si apre l'album con il lightbox sulla terza foto.
- Creando un album con "Avvisa" accesa, collegato a una partita con 10 convocati di cui 3 minori: ricevono push e in-app i 10 convocati (o i genitori dei minori senza account) e i tesserati con la preferenza attiva; nessuna iscrizione push anonima riceve nulla.
- Con "Avvisa" spenta (default) non parte niente. "Aggiorna" su un album non avvisa mai.
- La preferenza "Nuove foto" si spegne dal profilo e dal bottone "Silenzia" della notifica.
- Con `DISABLE_NOTIFICATIONS=true` si prova il flusso senza avvisare nessuno.
- Tema chiaro e scuro, telefono a 390 px, target da 44 px; `npx tsc --noEmit`, `npm test`, `npm run a11y` verdi.
