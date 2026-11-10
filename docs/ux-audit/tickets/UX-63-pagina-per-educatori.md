# UX-63 · Pagina per scuole, educatori e servizi

**Ondata:** 7 (engagement) · **Stima:** M · **Dipende da:** UX-55, UX-62 · **Stato:** da fare · **In attesa di:** testi e contatti del club (punto 2)

Richiesta del committente del 06/11/2026 (piano di engagement).

## Problema

Molte famiglie arrivano al baskin perché qualcuno glielo consiglia: un insegnante di sostegno, un educatore, una neuropsichiatra, un'assistente sociale, una cooperativa. Sono loro i **moltiplicatori**: un educatore convinto porta più atleti di molti post. Oggi il sito parla alle famiglie e ai curiosi, ma non a chi indirizza le famiglie, che ha bisogno di cose diverse:

- capire in due minuti che cos'è il baskin e perché fa bene (non le regole complete);
- sapere età, requisiti, costi, assicurazione, accompagnamento: le domande che la famiglia farà a lui;
- avere qualcosa da **dare in mano** alla famiglia (un foglio, un link);
- un contatto diretto per organizzare una prova con un gruppo (classe, centro diurno).

## Cosa fare

### 1. Pagina `/per-educatori`

Pagina pubblica di contenuto: `PageHero` con colonna `reading`, breadcrumb dal menu "Il club" (o dove deciderà il committente), testi in `it.json`/`en.json` (namespace `pages.educators`). URL non localizzato (regola i18n).

Sezioni, in quest'ordine:

1. **In breve** — tre righe: che cos'è il baskin, chi gioca insieme, dove e quando. Rimanda a `/il-baskin` per le regole.
2. **Per chi è** — età minima, ruoli Baskin spiegati con parole semplici (dai testi di UX-17/UX-21, non una copia: si riusano le stesse chiavi), "non serve saper giocare a basket".
3. **Le domande delle famiglie** — 6-8 domande con risposta breve: quanto costa, che assicurazione c'è, serve il certificato medico, il genitore deve restare, cosa portare, come si comincia. Le risposte che esistono già in `faqs.ts` si **riferiscono** con un link, non si copiano.
4. **Un gruppo in palestra** — come portare una classe o un gruppo di un centro a provare: periodo, numero di persone, chi contattare. Bottone `contained` verso il modulo contatti con l'oggetto già scelto ("Prova per un gruppo"): aggiungere il campo "oggetto" al modulo di `src/app/actions/contact.ts` se non c'è, con l'opzione nuova, e riportarlo nell'email allo staff.
5. **Da stampare** — un foglio A4 (punto 2) e il QR verso `/contatti#vieni-a-provare` con `withUtm(..., { source: "volantino", medium: "print", campaign: "educatori" })`.
6. **Blocco d'invito** `BrandCta` in fondo ("Vuoi che ne parliamo?"): è il solo della pagina (regola UX-29).

JSON-LD: nessuno nuovo (la pagina non è un evento né un'organizzazione diversa). Metadati da `buildMetadata()`; in sitemap.

### 2. Foglio da stampare

- Pagina `/per-educatori/foglio` ottimizzata per la stampa (A4, `@media print` dentro `sx` via `GlobalStyles` di MUI, niente file `.css`): logo, tre frasi, orari e sede da `@/lib/clubVenue`, contatti da `@/lib/clubContacts`, QR. Bottone "Stampa" (`window.print()`) visibile solo a schermo.
- Niente PDF generato dal server: la stampa del browser lo salva già in PDF, e il foglio resta aggiornato da solo quando cambiano orari o contatti.
- **Testi del club:** le frasi, il costo e le risposte alle domande li scrive il club. Fino ad allora la pagina non va in menu né in sitemap (bandiera `EDUCATORS_PAGE_READY` in `@/lib/content`).

### 3. Dove si trova

- Link nel footer, colonna dei link ("Per scuole ed educatori").
- Link dalla pagina `/il-baskin`, in fondo ("Sei un insegnante o un educatore?").
- Nella guida per lo staff di UX-62, il link pronto da mandare a scuole e servizi.

### 4. Misura

Con UX-55: visite alla pagina (Vercel Analytics) e, nel modulo contatti, quante richieste arrivano con oggetto "Prova per un gruppo" o con `utm_campaign=educatori`.

## Criteri di accettazione

- La pagina si legge su telefono a 390 px e con il lettore di schermo (titoli `h2` per ogni sezione); il foglio stampato da Chrome sta in una sola pagina A4 senza tagli.
- Il QR del foglio porta a `/contatti#vieni-a-provare` con i parametri UTM giusti.
- Il modulo contatti con oggetto "Prova per un gruppo" arriva allo staff con l'oggetto scritto.
- Prima che il club fornisca i testi la pagina non è raggiungibile da menu, footer e sitemap.
- Testi in `it.json` ed `en.json`, approvati dal committente; `guide.test.ts`, `npx tsc --noEmit`, `npm test`, `npm run a11y` verdi.
