# UX-60 · "La tua stagione": riepilogo personale di fine stagione

**Ondata:** 7 (engagement) · **Stima:** L · **Dipende da:** UX-59 · **Stato:** fatto (12/11/2026) · **Scadenza:** pronto per fine maggio 2027 (chiusura della stagione 2026-27)

Richiesta del committente del 06/11/2026 (piano di engagement).

## Problema

A fine stagione il club festeggia in palestra, ma il sito non dice niente: la stagione semplicemente finisce, e i numeri di ognuno (presenze, partite, punti, traguardi) restano sparsi fra profilo, marcatori e partite. Un riepilogo personale "come è andata la tua stagione", sul modello dei riepiloghi annuali delle app musicali, è il contenuto con la maggiore probabilità di essere condiviso da tutte le famiglie nello stesso momento, ed è un buon motivo per riaprire il sito a giugno, quando non ci sono allenamenti.

## Cosa fare

### 1. Dati (`@/lib/season/seasonRecap.ts`, puro e testato)

`buildSeasonRecap(person, season)` restituisce, per una persona (persona unica, `@/lib/person`) e una stagione:

- **presenze agli allenamenti** (`attended = true`) e quota sugli allenamenti a cui poteva iscriversi (stessa regola di "Stagione fedele" in UX-59);
- **partite giocate**, punti, miglior partita (più punti; a parità, la più recente), MVP;
- **traguardi sbloccati in quella stagione** (`EarnedBadge.unlockedAt` dentro le date della stagione);
- **la squadra** (o le squadre) con la tinta (`teamColor`), per il colore della card;
- **un numero del club** uguale per tutti: allenamenti fatti, partite giocate, punti segnati dal club. Fa sentire parte di qualcosa anche chi ha numeri piccoli.

Regola di tono, da rispettare in ogni testo: **nessun confronto con gli altri** (niente "sei nel 10% migliore", niente posizione in classifica). Ogni numero è detto in positivo e da solo; se un numero è zero, quella voce non compare (chi non ha giocato partite vede solo gli allenamenti e i traguardi).

### 2. Pagina `/profilo/stagione/[season]`

- Area utente: `PageHeader`, niente fascia (regola UX-32), colonna `main`.
- Una sequenza verticale di card grandi, una per voce, che si scorrono una dopo l'altra (non un carosello: si legge con lo scorrimento normale e funziona con il lettore di schermo). Ogni card: un numero `stat`, una frase ("Sei venuto a 38 allenamenti. Più di uno a settimana!"), un'icona o l'emoji del traguardo.
- In cima il selettore "per chi" quando il genitore ha più figli (stesso componente del profilo, `splitOwnChild`).
- Si vede solo dal proprio account (o dal genitore per il figlio). Nessuna versione pubblica.
- Raggiungibile da: card in `/profilo` ("La tua stagione 2026-27 è pronta"), notifica (punto 4), e la card "prossima azione" della home (`loadNextAction`) quando non c'è niente di più urgente, per 30 giorni dalla pubblicazione.

### 3. Immagine da condividere

- `SeasonRecapShareCard`, formato verticale 1080 × 1920 (storia di Instagram e stato di WhatsApp), stili inline e colori da `@/lib/palette`, fondo nella tinta della squadra (`teamFill`) o grafite senza tinta.
- Contenuto: nome di battesimo, stagione, 3 numeri al massimo (i più alti fra presenze, partite, punti, traguardi), logo del club, "karibubaskin.it".
- Generata nel browser con `shareElementAsImage`, testo e link con `withUtm(..., { campaign: "stagione-2026-27" })` verso la home (mai verso la pagina personale, che è privata).
- **Minori:** stessa regola di UX-59: solo nome di battesimo, generata dal genitore nel suo browser, riga di avvertenza sotto il bottone.

### 4. Quando si apre

- La stagione si "chiude" per il riepilogo quando lo staff passa a una nuova stagione "in corso" in `/admin/squadre` (`Season.isCurrent`), **oppure** con un bottone esplicito "Pubblica i riepiloghi della stagione" nella stessa pagina (admin). Il bottone è il modo normale: la stagione nuova può essere impostata a settembre, troppo tardi.
- Nuovo campo `Season.recapPublishedAt` (migration). Prima di quella data la pagina risponde 404 anche se l'URL è giusto.
- Alla pubblicazione, un avviso a tutti i tesserati con almeno un dato nella stagione (e ai genitori per i figli): "La tua stagione 2026-27 è pronta", tipo `SYSTEM` (non serve un tipo nuovo per un avviso all'anno). Dentro `inBackground`, a lotti come gli altri invii.
- **Prova generale:** prima della pubblicazione lo staff vede il proprio riepilogo e quello di qualunque atleta da `/admin/utenti` ("Anteprima riepilogo"), per controllare i numeri.

### 5. Le stagioni passate

- La pagina funziona per ogni stagione con `recapPublishedAt`; in `/profilo` un elenco "Le tue stagioni" con i link. Per la stagione 2025-26 (già finita) lo staff può pubblicare i riepiloghi a mano per provare il flusso, se i dati delle presenze sono sufficienti (UX-13 è del settembre 2026: probabilmente no, e va detto).

## Criteri di accettazione

- `buildSeasonRecap` ha test per: atleta con solo allenamenti, atleta con partite e badge, figlio con account collegato (dati sommati), voce a zero che non compare.
- Nessun testo confronta la persona con altri; una revisione dei testi con il committente è fatta e scritta qui.
- Prima di `recapPublishedAt` la pagina risponde 404; dopo, la vede solo la persona o il genitore (403 per gli altri tesserati, 404 per gli anonimi).
- L'immagine si genera su un telefono Android e un iPhone veri, pesa meno di 1,5 MB, è leggibile come storia di Instagram.
- L'avviso di pubblicazione arriva solo a chi ha dati nella stagione; con `DISABLE_NOTIFICATIONS=true` non arriva a nessuno.
- Tema chiaro e scuro, telefono a 390 px, lettore di schermo (le card hanno un titolo `h2` ciascuna); `npx tsc --noEmit`, `npm test`, `npm run a11y` verdi.

## Rischi noti

- **Presenze incomplete:** il riepilogo è buono quanto le presenze segnate. Da aprile, nella dashboard admin, un avviso "Ci sono N allenamenti senza presenze segnate" con il link a "Da completare" di `/admin/allenamenti`.
- **Picco di generazione:** le immagini si fanno nel browser, quindi nessun carico sul server; l'unico carico è la pagina, normale.

## Com'è stato fatto (12/11/2026)

Proposta discussa e approvata prima di scrivere codice. Le decisioni prese:

- **Traguardi della stagione ricalcolati, non letti da `EarnedBadge.unlockedAt`**: per lo storico quella data è il giorno del backfill, e nel 2026-27 comparirebbero traguardi di anni prima. `badgesOfSeason` (in `@/lib/season/seasonRecap`) dà quelli che la persona ha contando tutto fino alla stagione compresa, tolti quelli che aveva prima, come `badgesUnlockedByMatch` di UX-58. Si ragiona per stagione, non per data: "Stagione fedele" e "Top scorer" (`topScorerSeasons` in `badgeService.ts`, estratto da `loadBadgeInput`) cadono nella stagione giusta.
- **Quota di presenze solo se alta**: il numero degli allenamenti c'è sempre; "N su M" solo con almeno 10 allenamenti segnati e almeno 2 su 3, contati dal primo a cui è venuto (regola di "Stagione fedele"). Una quota bassa non si può dire in positivo.
- **Frasi neutre**, senza participi al maschile o al femminile ("38 allenamenti con noi", "Migliore in campo, secondo gli allenatori"): il genere manca a molti.
- **Pubblicazione solo con il bottone** dell'admin (pannello "La tua stagione" in `/admin/squadre`, `SeasonRecapPublishPanel`, `POST /api/competitive-teams/seasons/recap`), con conferma e la spunta "Avvisa chi ha dati nella stagione" accesa. Segnare in corso una stagione nuova non pubblica niente: se la stagione lasciata non è pubblicata, all'admin compare un promemoria. `DELETE` sulla stessa rotta ritira la pubblicazione (per un errore nei numeri). Entrambe nel registro attività (`PUBLISH_SEASON_RECAP`, `UNPUBLISH_SEASON_RECAP`). Il campo è `Season.recapPublishedAt` (migration `20261112120000_season_recap`); la condizione sta nell'`updateMany`, così due clic non mandano due avvisi.
- **Tipo di avviso nuovo `SEASON_RECAP`** invece di `SYSTEM`, così le aperture si contano a parte in "Metriche" (etichetta "La tua stagione"). Il titolo è il contenuto ("🎉 La tua stagione 2026-27 è pronta", ai genitori "La stagione 2026-27 di Marco è pronta", un avviso per figlio, con `?per=`). Destinatari: chi ha una presenza segnata o una partita nella stagione (`loadSeasonParticipants`) e i genitori della sua scheda, solo tesserati (`announceSeasonRecaps` in `@/lib/season/recapNotify`). Con `DISABLE_NOTIFICATIONS=true` non parte niente (lo fanno già `sendPushToUsers` e le notifiche in-app).
- **Chi vede la pagina** (`recapAccess`): la persona e i genitori dopo la pubblicazione; allenatori e admin sempre, anche prima, con il banner "Anteprima per lo staff" (da `/admin/utenti`, "Anteprima riepilogo" nella scheda di ogni persona: `?utente=` per un account, `?per=` per una scheda figlio). Il dirigente no. **Differenza dal ticket:** agli altri tesserati la pagina risponde 404 e non 403 (Next non ha una pagina 403 senza la funzione sperimentale `forbidden()`, e il 404 non dice nemmeno se la persona esiste); a chi non ha fatto l'accesso manda al login invece del 404, perché dall'avviso su un telefono con la sessione scaduta si deve poter arrivare.
- **Stagione 2025-26 non pubblicata**: le presenze sono segnate su 16 allenamenti su 70, quindi la voce "allenamenti" direbbe molto meno del vero. È servita, con l'anteprima e una pubblicazione di prova senza avvisi poi ritirata, a provare il flusso con dati veri (10 partite, 138 punti, 17 traguardi per un atleta di prova).
- **Campagna UTM `stagione`** (non `stagione-2026-27`): le campagne delle condivisioni sono un elenco chiuso (`SHARE_CAMPAIGNS`, UX-56), e la stagione la dice la data della visita.

**Pagina** `/profilo/stagione/[season]` (`SeasonRecapView`): intestazione `PageHeader`, colonna `main`, card una sotto l'altra con un `h2` ciascuna: apertura nella tinta della squadra (`teamFill`, grafite senza tinta), allenamenti, partite e punti, la partita più bella (solo con almeno due partite e dei punti; a parità di punti la più recente; nelle amichevoli interne senza il nome dell'avversaria), MVP, traguardi nuovi, "Insieme quest'anno" (allenamenti fatti, partite giocate e punti del club, uguali per tutti: `loadClubSeasonTotals`), condivisione. Le voci a zero non ci sono; senza nessuna voce un messaggio "Niente da raccontare, per ora". Chi ha figli sceglie di chi con dei bottoni ("Tu", poi i nomi); un genitore senza ruolo Baskin apre il primo figlio. Calcoli puri e testati in `@/lib/season/seasonRecap` (`seasonRecap.test.ts`: solo allenamenti, partite e traguardi, figlio con account collegato con le due chiavi sommate una volta, voci a zero, accessi); query in `loadSeasonRecap.ts`.

**Immagine** `SeasonRecapShareCard`: 540 × 960 a scala 2 (1080 × 1920), nome di battesimo, squadra, i tre numeri più alti fra allenamenti, partite, punti e traguardi, logo, "karibubaskin.it". Provata nel browser: 139 KB. Messaggio "La mia stagione 2026-27 con il Karibu Baskin 🏀" e link alla home con `utm_campaign=stagione`. Per un minore, sotto il bottone, la stessa avvertenza dei traguardi.

**Dove si trova:** "Le tue stagioni" in `/profilo` (`SeasonRecapLinks`, solo con dei riepiloghi pubblicati in cui chi guarda o un figlio ha dei dati: `loadRecapLinks`); la card "prossima cosa da fare" (`loadNextAction`) propone "La tua stagione è pronta" al posto di "Sei a posto" per 30 giorni dalla pubblicazione, mai sopra un'azione più urgente; l'avviso. Guida all'app aggiornata (capitolo "Profilo e traguardi", it e en).

**Presenze incomplete:** da aprile ad agosto, finché i riepiloghi della stagione in corso non sono pubblicati, la dashboard admin dice "Ci sono N allenamenti di questa stagione senza presenze segnate" con "Segna le presenze" verso "Da completare" (`countUnmarkedTrainings`, `attendanceReminderDue`).

**Testi da rivedere con il committente** (criterio di accettazione ancora aperto): titoli delle card, le quattro frasi sugli allenamenti ("Quasi sempre in palestra: {n} su {m}!", "{n} su {m}: una bella costanza.", "Una stagione in palestra, un allenamento dopo l'altro.", "Ogni allenamento è un passo avanti."), "Ogni partita con la maglia del Karibu conta." per chi ha giocato senza punti, "Insieme quest'anno", il testo dell'avviso. Stanno in `seasonRecap` di `it.json`/`en.json` e in `recapNotify.ts`.

**Non verificato:** l'immagine su un Android e un iPhone veri (provata solo nel browser del computer, intercettando il foglio di condivisione) e `npm run a11y` (la pagina non è nell'elenco fisso delle pagine misurate). Da fare prima di fine maggio 2027, insieme alla revisione dei testi.
