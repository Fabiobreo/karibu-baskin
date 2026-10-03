# UX-51 · Rifiniture dal secondo riaudit

**Ondata:** 5 · **Stima:** S · **Dipende da:** nessuno · **Stato:** fatto (03/10/2026); il punto 2 non si fa

Nato dal [riaudit del 02/10/2026](../RIAUDIT-2026-10-02.md), problema 8. Nove punti piccoli e indipendenti: si possono fare in più commit.

## Cosa fare

1. **"In corso" scritto due volte.** Sulla card in evidenza di un allenamento in corso (`SessionCard`, in home e in `/allenamenti`) c'è una pillola "In corso" sopra la card e un chip "In corso" nella testata. Ne basta uno: quello nella testata.
2. **Tessera sponsor scura.** Nel nastro del footer cinque tessere sono bianche e una (il logo del fotografo) ha il fondo scuro: è il fondo dell'immagine, non della tessera. Serve una versione del logo su fondo chiaro o trasparente, da chiedere allo sponsor; senza, la tessera resta com'è (la visibilità promessa non si tocca).
3. **Copertine degli eventi senza foto** (`CoverFallback`). Sono quasi nere, con un bagliore bruno negli angoli: il marrone era stato tolto dagli hero in UX-08. Togliere il bagliore (grafite delle fasce) o sostituirlo con la superficie pesca; da confrontare a schermo.
4. **Tabella statistiche nel dettaglio partita, su telefono** (`MatchStatsTab`). Il nome va su due righe e le colonne oltre "2pt" sono tagliate: la tabella scorre in orizzontale senza un segnale. Colonna del nome fissa e un'ombra o una sfumatura sul bordo destro; oppure le card di `/marcatori` su telefono.
5. **Classifica su telefono** (`/classifiche`). I nomi delle squadre vanno a capo ("Leoni / Verona") e il pallino della nostra squadra finisce sopra il nome. Colonna del nome più larga (le colonne numeriche hanno margine) e pallino sulla stessa riga.
6. **Foto nel form d'iscrizione** (`RegistrationForm`). Chi ha una foto di profilo vede un cerchio grigio con l'iniziale. Usare l'avatar dell'utente, come nell'header.
7. **Stemma nel login** (`/login`). Pallone generico al posto dello stemma del club: c'era già nell'audit del 24/09.
8. **Titolo di `/admin/audit`.** L'h1 parte 36 px a destra del breadcrumb (152 contro 188 px a 1.440, 16 contro 52 a 390), a differenza delle altre pagine admin. Misurato dal DOM; la causa (probabilmente un elemento davanti al titolo) è da guardare nella pagina.
9. **Bottone principale dell'admin.** Sta nella riga del titolo in Utenti, nella riga delle tab in Allenamenti, sotto l'avviso in Partite. Portarlo sempre nello slot azione di `PageHeader`, sulla riga del titolo.

## Revisione (03/10/2026, designer)

Il ticket regge; correzioni e decisioni per punto (prevalgono sul "Cosa fare"):

1. Via le due pillole esterne (`HomeSessionsSection`, `AllenamentiClient`); restano il chip nella testata e il contorno `live` della card.
2. **Non si fa**: la tessera è scura per scelta (`ownBackground: true` in `SponsorBanner`) e il logo del fotografo su fondo chiaro non esiste (committente, 03/10/2026). La tessera resta com'è.
3. Il bagliore è quello arancio di `heroGradient.dark`, che sul grafite diventa bruno: `CoverFallback` passa a `heroGradient.band`. Niente pesca (le copertine si toccano, e le linee del campo sparirebbero).
4. Il codice è `MatchStatsTable`: colonne "#" e nome fisse (`position: sticky`, fondo e hover della riga), ombre di scorrimento con `background-attachment: local` (spariscono a fine corsa), contenitore `role="region"` + `tabIndex={0}` + nome, come in `GironeFullView`. Le note escono dalla colonna fissa (riga sotto o tooltip).
5. `GironeFullView`: pallino e nome in un `inline-flex` senza a capo; padding orizzontale più stretto delle celle numeriche su `xs`; controllare a schermo che non torni lo scorrimento con il nome più lungo.
6. `CurrentUser` riceve `image` (dove si costruisce: server e `/api/users/me`) e il form mostra la stessa foto dell'header; "Utente" scritto a mano passa ai dizionari.
7. Stemma `/logo.png` con `next/image` a 64-72 px, `alt="Karibu Baskin"`.
8. Causa: la prop `icon` di `PageHeader` usata solo da `/admin/audit`. Si toglie dalla pagina e dal componente.
9. Il bottone principale va nello slot `action` di `PageHeader`, che lo tiene a destra anche quando va a capo (`ml: "auto"`). Una taglia sola: default (40 px) e 44 su telefono (`TOUCH_TARGET_ON_PHONE`). In Allenamenti e Partite il componente client disegna `PageHeader` (titolo e breadcrumb dalla pagina), niente `?nuovo=1`. In Partite resta solo per l'admin e spento senza squadre; nello stato vuoto il secondo bottone pieno diventa `outlined`.

## Criteri di accettazione

- Un solo "In corso" per card.
- Dettaglio partita e classifica a 390 px: nessun nome a capo dentro una riga della tabella, e lo scorrimento orizzontale, se resta, ha un segnale visibile.
- Nel form d'iscrizione la foto, quando c'è, è quella dell'header.
- In `/admin/utenti`, `/admin/allenamenti` e `/admin/partite` il bottone principale è alla stessa altezza e allo stesso bordo destro, a 1.440 e a 390 px.
- `npm run a11y` verde.

## Esito

- 1: tolte le pillole esterne in `HomeSessionsSection` e `AllenamentiClient`; resta il chip nella testata.
- 3: `CoverFallback` su `heroGradient.band`.
- 4: `MatchStatsTable` con "#" e nome fissi, ombra destra `local`/`scroll`, regione focalizzabile; le note in una riga sotto il giocatore. A 390 px: tabella 711 px in 356 visibili, nessun nome a capo.
- 5: `GironeFullView`, nome e pallino in `inline-flex` senza a capo, padding delle colonne numeriche stretto su `xs`. A 390 px: nessun nome a capo e nessuno scorrimento (nome più lungo 136 px).
- 6: `CurrentUser` porta `image`/`customImage` (già in `/api/users/me`); "Utente" in `trainings.unnamedUser`.
- 7: `/logo.png` a 72 px con `next/image`.
- 8: tolta la prop `icon` di `PageHeader`; h1 e breadcrumb a 152 px (1.440) e 16 px (390) anche in `/admin/audit`.
- 9: azione nello slot di `PageHeader` (su telefono riga propria a destra, sottotitolo sotto; 44 px su telefono gestiti dal componente, perché `TOUCH_TARGET_ON_PHONE` da `sm` azzera il minimo e il bottone scendeva a 37 px). Bottone principale in Utenti, Allenamenti e Partite: a 1.440 top 125, bordo destro 1.288, alto 40; a 390 top 168, bordo destro 374, alto 44. Nello stato vuoto di Partite "Aggiungi partita" è `outlined`.
- Correzioni dopo la revisione critica: in `MatchStatsTable` su `xs` il nome si ferma a 88 px con i puntini (intero nel `title` e nel testo accessibile) e le celle hanno 8 px di margine, così accanto alle colonne fisse restano visibili almeno tre colonne di numeri; la cella del giocatore ha `aria-describedby` verso la sua nota. L'h1 di `PageHeader` accetta `titleRef` (punto fisso del focus dopo un'eliminazione).

## Rimasto fuori

Restano fra i parcheggiati del README: dati ripetuti nel profilo giocatore, riordino del menu, immagine delle squadre da condividere con testo a 9-11 px.
