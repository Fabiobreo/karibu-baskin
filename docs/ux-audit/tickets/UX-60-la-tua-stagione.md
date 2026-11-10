# UX-60 · "La tua stagione": riepilogo personale di fine stagione

**Ondata:** 7 (engagement) · **Stima:** L · **Dipende da:** UX-59 · **Stato:** da fare · **Scadenza:** pronto per fine maggio 2027 (chiusura della stagione 2026-27)

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
