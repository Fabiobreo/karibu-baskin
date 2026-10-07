# UX-52 · Album foto da una cartella Google Drive (fase 1)

**Ondata:** 6 · **Stima:** L · **Dipende da:** nessuno · **Stato:** in corso (provato con una cartella vera, manca la PR)

Funzione nuova, chiesta dal committente il 07/10/2026. Non nasce da un riaudit.

## Problema

Dopo un evento o una partita qualcuno (un genitore, un fotografo) condivide una cartella Google Drive pubblica con le foto. Il link gira su WhatsApp e si perde; sul sito quelle foto non esistono. La Gallery di oggi mostra solo i post Instagram e i video YouTube.

Caricare le foto a mano non è un'opzione: sono decine o centinaia per cartella, e lo spazio su Vercel Blob (1 GB) finirebbe in una decina di album.

## Decisioni già prese (committente, 07/10/2026)

1. **Visibilità per album, default "Solo tesserati"**; "Pubblico" è una scelta esplicita dello staff. Le liberatorie dei minori sono ancora aperte.
2. **Diritto a pubblicare:** spunta obbligatoria "Ho il permesso di chi ha scattato le foto", registrata nell'audit.
3. **Album riservati e chi non è tesserato:** in `/gallery` non compaiono; una sola riga "Altri album sono visibili ai tesserati" con "Accedi".
4. **Notifica alla pubblicazione:** facoltativa, spenta di default. **Non fa parte di questa fase.**

## Fuori da questa fase

Fascia "Foto" sulle pagine di evento e partita, aggiornamento automatico dal cron, notifica "Sono arrivate le foto", video e sottocartelle. Il collegamento a evento o partita si salva già ora (campo nel form, link nella pagina dell'album), così la fase 2 non richiede un'altra migration.

## Cosa fare

### 0. Prova tecnica, prima di tutto il resto

Le immagini le serve Google già ridimensionate, con `https://lh3.googleusercontent.com/d/<fileId>=w<larghezza>`. L'host è già in `img-src` della CSP. **Non è un'API documentata**: prima di costruirci sopra, verificare con una cartella vera condivisa "Chiunque abbia il link" che l'immagine si carichi in una finestra anonima (senza cookie di Google), con `referrerPolicy="no-referrer"`, a 400 e a 1.600 px, anche per un file HEIC.

Se la prova fallisce, entra in questa fase la rotta di ripiego `GET /api/albums/photos/[photoId]?w=` che fa da proxy all'API ufficiale (`thumbnailLink` di `files.get`), con rate limit e controllo di visibilità dell'album. In ogni caso l'URL si costruisce in un solo punto: `drivePhotoUrl(fileId, width)` in `@/lib/gallery/drive`.

### 1. Dati

Migration con due modelli e un enum.

- `PhotoAlbum`: `id`, `slug` (unico), `title`, `date`, `driveFolderId` (unico), `visibility` (`AlbumVisibility`: `MEMBERS` default, `PUBLIC`), `coverPhotoId?`, `eventId?` e `matchId?` (al più uno, `onDelete: SetNull`), `photoCount`, `syncedAt`, `unreachableAt?`, `permissionDeclaredById`, `createdAt`, `updatedAt`.
- `AlbumPhoto`: `id`, `albumId` (cascade), `driveFileId`, `name`, `width`, `height`, `takenAt?`, `hidden` (default false), `position`. Unico su `(albumId, driveFileId)`.

Schemi Zod in `src/lib/schemas/photoAlbum.ts` con test.

### 2. Lettura della cartella (`@/lib/gallery/drive.ts`)

- `parseDriveFolderId(link)`: funzione pura, accetta `…/drive/folders/<id>`, `…/drive/u/0/folders/<id>`, `…/open?id=<id>` con o senza parametri, e l'id da solo. Testata.
- `listDriveFolder(folderId)`: Drive API v3 con `GOOGLE_DRIVE_API_KEY` (nuova variabile d'ambiente, da aggiungere a `CLAUDE.md` e `docs/SETUP.md`). Nome della cartella da `files.get`; file da `files.list` con `'<id>' in parents and trashed = false and mimeType contains 'image/'`, campi `id, name, imageMediaMetadata(width, height, time, rotation), createdTime`, paginato, **tetto di 1.000 foto**. Con `rotation` 1 o 3 larghezza e altezza si scambiano. Ordine: data di scatto, poi nome.
- Sottocartelle e file non immagine si contano soltanto (`otherFiles`), per la riga "altri file su Drive".
- Errori distinti: cartella non trovata o non condivisa, cartella senza foto, chiave mancante, quota.
- `syncAlbum(albumId)`: aggiunge le foto nuove, toglie quelle sparite da Drive, **non tocca `hidden`** delle esistenti, aggiorna `photoCount` e `syncedAt`. Se la cartella non risponde più segna `unreachableAt` e non cancella nulla.

### 3. API

Tutte con try/catch attorno a Prisma e risposte JSON; chiavi di rate limit registrate in `routeAccess.test.ts`.

| Rotta                                     | Chi   | Cosa                                                                                                  |
| ----------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------- |
| `POST /api/albums/preview`                | staff | Dal link: titolo proposto, numero di foto, altri file. Non salva                                      |
| `POST /api/albums`                        | staff | Crea l'album e indicizza le foto. 400 senza la spunta del permesso, 409 se la cartella è già un album |
| `PUT /api/albums/[id]`                    | staff | Titolo, data, visibilità, copertina, collegamento                                                     |
| `POST /api/albums/[id]/sync`              | staff | "Aggiorna"                                                                                            |
| `PATCH /api/albums/[id]/photos/[photoId]` | staff | `hidden`                                                                                              |
| `DELETE /api/albums/[id]`                 | staff | Elimina l'album dal sito (Drive non si tocca)                                                         |

Audit: `CREATE_ALBUM` (con il nome di chi ha dichiarato il permesso e la visibilità scelta), `UPDATE_ALBUM` quando cambia la visibilità, `DELETE_ALBUM`, `HIDE_ALBUM_PHOTO`.

Nessuna GET pubblica: le pagine leggono da Prisma.

### 4. Pubblico

**`/gallery`:** sezione "Album" in cima, sopra Instagram e video. Card contornate (`RADIUS.lg`) con copertina, titolo, data e numero di foto; griglia a 3 colonne da `md`, 2 da `sm`, 1 su telefono. Si vedono gli album raggiungibili, con almeno una foto visibile, e con visibilità adatta a chi guarda (`isMemberRole`). Se chi guarda non è tesserato ed esistono album riservati, sotto la griglia la riga "Altri album sono visibili ai tesserati" con "Accedi" (link a `/login?callbackUrl=/gallery`; per l'ospite la riga senza link). Senza album la sezione non c'è e la pagina resta com'è oggi.

**`/gallery/[slug]`:** `PageHero` con colonna piena, breadcrumb "Gallery", titolo, sottotitolo di una riga (data e numero di foto), azione "Apri su Drive" (bottone fantasma); per lo staff `StaffManageButton` verso `/admin/gallery?album=<id>`.

- Sotto la fascia, se c'è un collegamento, una riga con il link all'evento o alla partita.
- Griglia di foto con le proporzioni vere (`aspect-ratio` da `width`/`height`, nessun salto di layout), `loading="lazy"`, `referrerPolicy="no-referrer"`, `<img>` semplice (niente `next/image`: consumerebbe la quota Vercel). `alt`: "Foto 12 di 84, <titolo>".
- Lightbox a tutto schermo: frecce, swipe, tasti freccia ed Esc, contatore, "Apri l'originale" (file su Drive). Si riusa la parte comune di `GalleryGrid` estraendola, senza cambiare il comportamento dei post Instagram.
- In fondo, se ci sono altri file: "Nella cartella ci sono anche N altri file (video o sottocartelle)" con il link a Drive.
- `notFound()` per slug inesistente, album non raggiungibile o senza foto visibili, **prima** di ogni `Suspense`. Niente `loading.tsx` nella cartella `gallery` che copra la sottopagina: l'attuale `loading.tsx` va spostato in un route group `(lista)/`.
- **Album riservato, chi non è tesserato:** la pagina risponde con titolo e data, "Questo album è per i tesserati" e "Accedi" con `callbackUrl` sull'album (per l'ospite: "Lo vedrai quando lo staff conferma il tuo account"). Le foto non entrano nel payload. Chi riceve il link su WhatsApp e non ha fatto l'accesso non trova un 404.
- Album riservati: `noindex` e fuori dalla sitemap. Album pubblici: in sitemap, metadata da `buildMetadata()`, immagine OG generica del sito.

Testi in `it.json` ed `en.json`.

### 5. Staff (`/admin/gallery`)

Due schede nella pagina: **Album** (nuova, la prima) e **Instagram** (quella di oggi, invariata).

- **"Nuovo album"** nello slot `action` di `PageHeader`. Dialog in due passi: (1) si incolla il link e si preme "Leggi cartella"; (2) compaiono titolo (dal nome della cartella), data (dalla foto più vecchia), collegamento facoltativo a un evento o a una partita, visibilità (due scelte con una riga di spiegazione ciascuna, "Solo tesserati" già scelta) e la spunta obbligatoria del permesso.
- Sotto la visibilità, sempre visibile: "La cartella Drive resta aperta a chiunque abbia il link. 'Solo tesserati' vuol dire che il sito non la mostra e non la fa trovare ad altri."
- Scegliendo "Pubblico": avviso "Le foto saranno visibili a chiunque e ai motori di ricerca. Controlla che non ci siano minori senza liberatoria."
- Errori in chiaro: "La cartella non è condivisa con 'Chiunque abbia il link'", "In questa cartella non ci sono foto", "Questa cartella è già un album".
- **Righe** con `RowActions`: azione con l'etichetta "Aggiorna"; nel "⋯" Modifica, Foto, Apri sul sito, Apri su Drive, Elimina (ultima, con conferma: "Le foto su Drive non vengono toccate"). In riga, come testo: numero di foto, visibilità, ultimo aggiornamento; "Non raggiungibile" se `unreachableAt` è valorizzato.
- **"Foto":** dialog con la griglia delle miniature; su ognuna "Nascondi" / "Mostra" e "Usa come copertina". Le nascoste restano visibili allo staff, attenuate e con la parola "Nascosta".
- `?album=<id>` apre la modifica di quell'album e poi pulisce l'URL.

### 6. Documentazione

Paragrafo in `CLAUDE.md` (sottosistemi, modelli, variabile d'ambiente, struttura cartelle) e FAQ o guida solo se cambia un flusso citato.

## Criteri di accettazione

- Da staff, incollando il link di una cartella condivisa con 50 foto: l'album è sul sito in meno di un minuto senza caricare nessun file; su Vercel Blob non compare niente di nuovo.
- Senza la spunta del permesso il salvataggio è rifiutato, dal form e dall'API; l'audit riporta chi l'ha data.
- Album "Solo tesserati": da anonimo e da ospite non compare in `/gallery`, la riga "Altri album…" c'è, il suo URL mostra il messaggio senza nessuna foto nel sorgente della pagina, ha `noindex` e non è in sitemap. Da tesserato si vede tutto.
- Album "Pubblico": visibile a tutti, in sitemap.
- Una foto nascosta non compare né in griglia né nel lightbox, e resta nascosta dopo "Aggiorna".
- "Aggiorna" dopo aver aggiunto 3 foto e tolta 1 su Drive: il conteggio cambia di conseguenza.
- Cartella non più condivisa: dopo "Aggiorna" l'album sparisce dal pubblico e in admin si legge "Non raggiungibile"; ripristinata la condivisione, torna con le stesse foto nascoste.
- Album da 300 foto su telefono (390 × 844): nessun salto di layout durante il caricamento, lightbox con swipe, target da 44 px.
- Tema chiaro e scuro; nessun colore, raggio, peso o `fontSize` letterale nuovo.
- `parseDriveFolderId`, lo scambio di larghezza e altezza con `rotation` e la regola di visibilità hanno test; `npx tsc --noEmit`, `npm test` e `npm run a11y` verdi.

## Rischi noti

- **URL delle immagini non documentato:** vedi punto 0. Se Google lo cambia, si interviene in `drivePhotoUrl()` o si passa al proxy.
- **"Solo tesserati" non è segretezza:** chi ha il link Drive vede comunque le foto. È detto nel form.
- **Quota Drive API:** si chiama solo alla creazione e su "Aggiorna", mai al caricamento di una pagina.

## Esito

Scritto il 07/10/2026 sul branch `feat/ux-52-album-drive`, non ancora in PR.

**Fatto e provato** (dev server, album di prova con id di file finti):

- migration `20261009000000_photo_albums` (scritta con `prisma migrate diff`: `migrate dev` non riesce a ricostruire lo storico nel database ombra);
- lettura della cartella, sync, regole di visibilità, schemi e rotte, con test (`drive.test.ts`, `albumRules.test.ts`, `photoAlbum.test.ts`, `api/albums/route.test.ts`);
- `/gallery` con la sezione Album, `/gallery/[slug]`, lightbox condiviso con i post Instagram (`Lightbox`), `/admin/gallery` a due schede;
- da anonimo: l'album riservato non compare, la riga "Altri album…" c'è, la sua pagina non ha nessun id di foto nel sorgente, ha `noindex` e non è in sitemap; l'album pubblico è in sitemap;
- da staff: nascondere una foto e scegliere la copertina arrivano al database e aggiornano la riga; senza la spunta del permesso l'API risponde 400.

**Prova tecnica del punto 0 (07/10/2026, cartella vera con 8 JPEG): superata, il proxy non serve.**

- La Drive API con la sola API key legge nome, file, dimensioni e data di scatto della cartella; una cartella inesistente o non condivisa risponde 404 (`notFound`), che il sync traduce in "Non raggiungibile".
- `lh3.googleusercontent.com/d/<id>=w400`, `=w800` e `=w1600` rispondono 200 `image/jpeg` senza cookie, alla larghezza chiesta (400 × 600, 1.600 × 2.400).
- **Il `Referer` conta:** senza referer 200, con il dominio del sito 200, con `http://localhost:3000` **429** a ogni tentativo. `referrerPolicy="no-referrer"` sulle `<img>` non è facoltativo: senza, in sviluppo le foto non si vedono.
- Dal pannello staff: "Leggi cartella" propone titolo e data giusti, "Crea album" indicizza le 8 foto, "Aggiorna" risponde "nessuna novità". Sulla pagina pubblica le 8 foto si caricano con spostamento di layout 0 e il lightbox mostra quella a 1.600 px.
- La prima volta che una miniatura viene chiesta Google impiega qualche secondo a prepararla; dalla seconda arriva in pochi millisecondi.

**Non ancora provato:**

- un file HEIC (la cartella di prova ha solo JPEG);
- "Non raggiungibile" togliendo davvero la condivisione a una cartella già diventata album.

**Aggiornamento automatico (aggiunto il 07/10/2026, era fase 2):** il cron `instagram-sync` è diventato `gallery-sync` e ogni mattina alle 06:00 rilegge prima gli album degli ultimi 30 giorni, poi Instagram. Non è un cron nuovo perché il piano Hobby ne concede 7 e sono tutti presi. Le foto aggiunte su Drive compaiono quindi il mattino dopo, o subito con "Aggiorna". La rotta del cron non è stata chiamata davvero (vuole `CRON_SECRET` e l'intestazione di Vercel): è coperta da `albums.test.ts` e dal sync manuale provato sopra.

**Scaricare le foto (aggiunto il 07/10/2026, chiesto dal committente):** nel lightbox "Apri l'originale" è diventato "Scarica": salva l'originale a piena risoluzione con il nome del file, direttamente da Google (`driveDownloadUrl`), senza passare dal nostro server. Il bottone dell'album si chiama "Scarica tutto da Drive" e porta alla cartella, dove lo zip lo prepara Google: farlo dal sito vorrebbe dire far passare centinaia di MB da una funzione Vercel. Con la cartella di prova salita a 91 foto: griglia senza spostamenti di layout, miniature caricate solo vicino allo schermo.

**Pagine da 60 foto (aggiunto il 07/10/2026, deciso con il committente):** con la cartella di prova a 307 foto la pagina era alta 43.000 px e il footer con gli sponsor non si raggiungeva più. Ora un album si sfoglia a pagine da 60 con il numero nell'URL (`/gallery/<slug>?pagina=4`, la prima senza parametro), e sotto la griglia c'è "Precedente / Pagina 4 di 6 / Successiva". Scelte le pagine e non "Mostra altre" perché il numero è un punto a cui tornare e da mandare a qualcuno, e il tasto indietro funziona. Il lightbox scorre comunque tutte le foto: chiudendolo su una foto di un'altra pagina la griglia va a quella pagina, con la foto al centro e il fuoco sopra. Misurato: pagina 4 di 6 alta 9.500 px su desktop e 5.000 su telefono, nessuno scorrimento orizzontale a 375 px. Un numero di pagina oltre la fine porta all'ultima, non a un 404.

**Scelte fatte lavorando:**

- la rotta `GET /api/albums/[id]/photos` (staff) serve al dialog "Foto": il ticket non la elencava;
- `/gallery/[slug]` è una pagina a colonna piena con `PageHero`, non un `EntityHero`: i tre modelli di UX-32 non prevedono l'album fra le entità;
- le chiavi di rate limit delle rotte di scrittura non vanno in `routeAccess.test.ts`, che classifica solo le GET.
