# UX-51 · Rifiniture dal secondo riaudit

**Ondata:** 5 · **Stima:** S · **Dipende da:** nessuno · **Stato:** da fare

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

## Criteri di accettazione

- Un solo "In corso" per card.
- Dettaglio partita e classifica a 390 px: nessun nome a capo dentro una riga della tabella, e lo scorrimento orizzontale, se resta, ha un segnale visibile.
- Nel form d'iscrizione la foto, quando c'è, è quella dell'header.
- In `/admin/utenti`, `/admin/allenamenti` e `/admin/partite` il bottone principale è alla stessa altezza e allo stesso bordo destro, a 1.440 e a 390 px.
- `npm run a11y` verde.

## Rimasto fuori

Restano fra i parcheggiati del README: dati ripetuti nel profilo giocatore, riordino del menu, immagine delle squadre da condividere con testo a 9-11 px.
