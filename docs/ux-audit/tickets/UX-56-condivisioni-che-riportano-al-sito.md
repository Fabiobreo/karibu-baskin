# UX-56 · Condivisioni che riportano al sito

**Ondata:** 7 (engagement) · **Stima:** M · **Dipende da:** UX-55 (helper `withUtm`) · **Stato:** fatto (11/11/2026), manca la prova su telefoni veri (vedi "Esito")

Richiesta del committente del 06/11/2026 (piano di engagement).

## Problema

La comunità del club vive su WhatsApp, e il sito ci arriva soprattutto come **immagini**: il tabellino (`MatchTabellinoButton`, `GET /api/matches/[matchId]/tabellino`), la distinta dei convocati (`CallupsActions` + `CallupsShareCard`) e le squadre dell'allenamento (`ShareTeamsButton`). Sono belle e vengono condivise, ma un'immagine non porta nessun clic: chi la riceve non sa che sul sito c'è la partita con le statistiche, gli MVP e le foto.

Nel dettaglio:

- `navigator.share` viene chiamato con `files` e `title`, a volte con un `text` generico ("Tabellino Karibu Baskin"), **mai con l'indirizzo della pagina**;
- nel tabellino c'è la scritta `karibubaskin.it`, ma non l'indirizzo della partita;
- `ShareSection` (WhatsApp, copia link, QR) manda l'URL senza parametri, quindi in Vercel Analytics queste visite non si distinguono dalle altre;
- alcune pagine che vale la pena far girare non hanno nessun bottone di condivisione (da verificare: dettaglio news, album, risultati della giornata).

## Cosa fare

### 1. Testo e link insieme all'immagine

In `@/lib/shareImage` aggiungere a `shareElementAsImage` un parametro `link: { url: string; text: string }`, e usarlo anche in `MatchTabellinoButton` (che oggi ha la sua copia della logica: va portata sull'helper, senza cambiare il comportamento).

- `navigator.share({ files, title, text: "<testo>\n<url>" })`. Il testo lo sceglie chi chiama, sempre da `it.json`/`en.json` (namespace `share`):
  - tabellino: "Karibu – Thiene 42-38. Statistiche, MVP e foto: <url>";
  - convocati: "I convocati per Karibu – Thiene di sabato 12. Tutti i dettagli: <url>";
  - squadre dell'allenamento: "Le squadre di giovedì: <url>".
- URL sempre da `withUtm(path, { source: "whatsapp", medium: "share", campaign: "<tipo>" })`, con `campaign` uguale a `tabellino`, `convocati`, `squadre`, `evento`, `news`, `album`, `profilo`. Il `source` è `whatsapp` anche se poi l'utente sceglie un'altra app dal foglio di condivisione: è quello che succede quasi sempre, e il foglio non dice quale app è stata scelta.
- **Ripiego (desktop o browser senza condivisione di file):** dopo il download dell'immagine il toast dice "Immagine scaricata. Link copiato: incollalo nel messaggio", e il link è davvero negli appunti (`navigator.clipboard.writeText`). Se gli appunti non sono disponibili, il toast dice solo "Immagine scaricata".
- Da provare su un Android e un iPhone veri con WhatsApp: su Android il testo diventa la didascalia dell'immagine; su iOS alcune versioni scartano `text` quando ci sono `files`. Se su iOS il testo si perde, il ripiego è lo stesso del desktop (copia del link negli appunti prima di aprire il foglio, con il toast). Scrivere l'esito nel ticket.

### 2. L'indirizzo dentro l'immagine

- **Tabellino** (`tabellino/route.tsx`): al posto di `karibubaskin.it` in fondo, l'indirizzo corto della partita (`karibubaskin.it/partite/<slug>`), troncato con i puntini se supera la larghezza. Il tabellino ha cache CDN pubblica e non contiene minori: l'indirizzo non cambia nessuna delle due regole.
- **Convocati e squadre** (`CallupsShareCard`, card delle squadre): una riga in fondo "Dettagli su karibubaskin.it" più l'indirizzo corto. **Niente QR**: in una foto vista sul telefono non lo inquadra nessuno, e occupa spazio. (Il QR resta in `ShareSection`, dove serve per mostrarlo a qualcuno vicino.)
- Colori dalla palette (`NEUTRAL`), come il resto delle card: html2canvas non legge il tema.

### 3. `ShareSection` e `PlayerShareButtons` con UTM

- Il link di WhatsApp, il "Copia link" e il QR usano `withUtm`, con `medium: "share"` e `source` rispettivamente `whatsapp`, nessuno (copia: si lascia `share` come medium e `source=link`; aggiungere `link` ai valori ammessi in UX-55) e `qr`.
- Nuovi `kind` per i testi di WhatsApp: `news`, `album`, `match`, `player` (oggi solo `training` ed `event`), con le chiavi in `share.*`.

### 4. Bottoni di condivisione dove mancano

Verificare e, dove manca, aggiungere:

| Pagina            | Dove                                              | Componente                     |
| ----------------- | ------------------------------------------------- | ------------------------------ |
| `/news/[slug]`    | sotto il titolo (`PageHeader`, slot `action`)     | `ShareSection` (`kind="news"`) |
| `/gallery/[slug]` | accanto a "Scarica tutto da Drive", nella fascia  | `ShareSection dark`            |
| `/partite/[slug]` | nelle `actions` dell'`EntityHero`, se non c'è già | `ShareSection dark`            |

Per un **album "Solo tesserati"** il bottone c'è (lo usa un tesserato per mandarlo a un altro tesserato), e il testo di WhatsApp lo dice: "Album per i tesserati: entra con il tuo account". Chi non è tesserato trova già la pagina con "Accedi" (UX-52).

### 5. Anteprima del link

Verificare che ogni pagina condivisa abbia titolo, descrizione e immagine OG giusti (`buildMetadata()`): è l'anteprima che WhatsApp mostra sotto il link, e spesso conta più dell'immagine. Con il link di una partita l'anteprima deve dire squadre e risultato, non "Karibu Baskin". Per i profili dei minori resta l'immagine OG generica (regola di `@/lib/minors`).

## Criteri di accettazione

- Su un Android vero, "Condividi" del tabellino in WhatsApp produce un messaggio con l'immagine e una didascalia che contiene l'URL della partita con `utm_source=whatsapp&utm_medium=share&utm_campaign=tabellino`.
- Stessa prova su un iPhone vero; se il testo si perde, il link è negli appunti e il toast lo dice. L'esito è scritto qui sotto.
- Da desktop: l'immagine si scarica, il link è negli appunti, il toast lo dice.
- Il tabellino e le immagini di convocati e squadre riportano l'indirizzo corto, leggibile a 390 px di larghezza dello schermo che la riceve.
- `MatchTabellinoButton` usa `shareElementAsImage`/l'helper comune; non c'è più una seconda copia della logica di condivisione.
- I nuovi testi sono in `it.json` ed `en.json`; `guide.test.ts` verde (se il capitolo della guida sulla condivisione cita un'etichetta cambiata, va aggiornato in tutte e due le lingue).
- `npx tsc --noEmit`, `npm test`, `npm run a11y` verdi.

## Fuori da questo ticket

- Un accorciatore di link nostro (`/s/abc`): gli URL con UTM sono lunghi, ma in WhatsApp diventano un'anteprima e non si leggono. Se ne riparla solo se servono sui volantini (lì c'è il QR).

## Esito (11/11/2026)

Fatto, con le decisioni del committente dell'11/11/2026:

- **Indirizzo:** il sito è `www.karibubaskin.it` (`karibubaskin.it` ci porta con un 308, percorso compreso). È il ripiego di `SITE_URL` in `@/lib/siteUrl`; sulle immagini si scrive la forma corta senza "www." (`SHORT_HOST`, `shortAddress()` in `@/lib/shareLinks`).
- **Le visite si contano nel database** (il committente ha scelto questa strada, invece di affidarsi a Vercel Analytics): `ShareVisitStat` (giorno, campagna, fonte, numero; mai una colonna di persona o dispositivo), scritto da `POST /api/share/visit`, che `ReferralCapture` chiama una volta per scheda quando l'indirizzo ha `utm_medium=share` con fonte e campagna dell'elenco. Si legge in "Coinvolgimento" di `/admin/metriche` (riquadro "Visite dalle condivisioni" e tabella per cosa si è condiviso). Righe oltre 13 mesi cancellate dal cron domenicale.
- **Tabellino:** non è più un'icona nello slot dello staff ma il bottone "Immagine del risultato", nella riga di condivisione dell'hero accanto a WhatsApp, Copia link e QR (la partita ora ha anche questi, sempre).
- **Anteprima dell'album:** la copertina scelta dallo staff (o la prima foto visibile), solo per gli album pubblici; un album "Solo tesserati" tiene la card generica, perché l'anteprima la vede chiunque riceva il link.

Note sul resto:

- `shareElementAsImage` e `shareImageBlob` (`@/lib/shareImage`) sono l'unica logica di condivisione delle immagini; `MatchTabellinoButton` usa `shareImageBlob`. Se il foglio del telefono rifiuta (es. `NotAllowedError` quando l'immagine ha impiegato troppo), si ripiega sul download con il messaggio negli appunti.
- `ShareSection` riceve il percorso (`path`), non più l'URL, e costruisce un link per bottone: `whatsapp`, `link` (nuova fonte di UX-55, "Copia link") e `qr`. Campagne: `tabellino`, `convocati`, `squadre`, `allenamento`, `evento`, `partita`, `news`, `album`, `profilo`.
- Indirizzo nel tabellino: **a capo su due righe, non troncato con i puntini** come chiedeva il punto 2: un indirizzo tagliato non si può digitare. 34 px su 1.080, circa 12 px su uno schermo di 390.
- La news non ha `PageHeader`: i bottoni stanno sotto titolo e data.
- `PlayerShareButtons`: nel foglio del telefono il link passa solo come `url`, non più anche dentro il testo (WhatsApp lo scriveva due volte).

**Da fare: prova su telefoni veri.** Non si può fare dal computer. Su un Android e su un iPhone, con WhatsApp: "Immagine del risultato" su una partita giocata, "Condividi" nei convocati (staff) e nelle squadre di un allenamento. Va controllato che il messaggio abbia l'immagine e, come didascalia, la frase con il link. Se su iPhone il testo si perde, si aggiunge la copia del link negli appunti prima di aprire il foglio, con l'avviso. Scrivere qui l'esito.
