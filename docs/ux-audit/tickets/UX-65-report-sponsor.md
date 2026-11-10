# UX-65 · Report per gli sponsor e sponsor in evidenza

**Ondata:** 7 (engagement) · **Stima:** M · **Dipende da:** UX-55 · **Stato:** da fare

Richiesta del committente del 06/11/2026 (piano di engagement).

## Problema

La visibilità promessa agli sponsor è rispettata ovunque (nastro in ogni pagina, `/sponsor`, sezione in Contatti: decisione "Sponsor" del README e UX-39). Ma a fine stagione il club non ha niente da mostrare a uno sponsor quando gli chiede di rinnovare: nessun numero di visite, nessun clic sul suo logo, nessun elenco degli eventi in cui è comparso. Lo sponsor deve fidarsi.

E durante la stagione lo sponsor è solo un logo fra gli altri: non c'è mai un momento in cui il club lo ringrazia per nome.

## Cosa fare

### 1. Clic sui loghi, contati senza tracciare

- I loghi del nastro (`SponsorBanner`), di `/sponsor` e di `/contatti` oggi linkano direttamente al sito dello sponsor (`url` in `@/lib/sponsors`). Passano invece da una rotta nostra: `GET /api/sponsor/[id]/go` che incrementa un contatore e risponde con un redirect 302 verso `url`.
- Modello `SponsorDailyStat`: `day`, `sponsorId`, `clicks`, unico su `(day, sponsorId)`. **Nessun dato su chi clicca** (niente IP salvato, niente cookie). Rate limit per IP per non contare i clic ripetuti a raffica (si contano, non si scartano in silenzio: dopo 5 clic in un minuto dallo stesso IP la rotta reindirizza senza incrementare).
- Il link resta un vero `<a href>` (accessibile, si apre in una nuova scheda, `rel="noopener sponsored"`): `LinkBehavior` tratta `/api/*` come link semplice (regole in `@/lib/linkTarget`), quindi funziona già.
- `id` sconosciuto: 404, mai un redirect aperto verso un URL preso dalla richiesta.
- Robots: la rotta è già sotto `/api`, esclusa dai crawler (verificarlo in `robots.ts`), così i bot non gonfiano i numeri.

### 2. Report di stagione (`/admin/sponsor`)

Nuova voce in `ADMIN_NAV` "Sponsor" (admin e dirigente in lettura: `director: true`, è un dato da mostrare ai partner, non una scrittura). Pagina con:

- **Selettore stagione** (date da `Season`).
- **Per ogni sponsor**, una card: logo, clic sul logo nella stagione e per mese (barre), e i numeri del club uguali per tutti, perché il nastro è su ogni pagina: pagine viste del sito nella stagione (inserite a mano dallo staff dal pannello di Vercel Analytics, campo "Visite della stagione" salvato su `Season.pageViews`; Vercel non dà un'API sul piano Hobby), partite giocate, eventi, album pubblicati, tesserati, notifiche inviate (da `PushDailyStat` di UX-55).
- **"Scarica il report"** per uno sponsor: pagina stampabile `/admin/sponsor/[id]/report?stagione=` (A4, una pagina, stessa tecnica del foglio di UX-63: `@media print` dentro `GlobalStyles`), con logo del club e dello sponsor, i numeri sopra, 4 foto della stagione scelte dallo staff da album **pubblici** (mai foto riservate in un documento che esce dal club) e un ringraziamento scritto dal club.

### 3. Sponsor in evidenza

- **Post di ringraziamento:** nell'editor delle news (`PostEditor`) un modello "Sponsor in evidenza": sceglie uno sponsor da `@/lib/sponsors`, precompila titolo ("Grazie a <nome>"), copertina (`squareLogo` o logo) e un testo da completare con la descrizione di `pages.sponsor.sponsorsData.<id>`. Lo staff lo pubblica quando vuole; la proposta è uno al mese, a rotazione, scritta nella guida per lo staff.
- **"Partita offerta da":** campo facoltativo `Match.sponsorId` (migration), scelto nel form partita dello staff. Nella pagina della partita, sotto il tabellino, una riga "Partita offerta da <logo> <nome>" con il link tracciato del punto 1; nel tabellino immagine (UX-56) il logo piccolo in fondo. Una sola riga, neutra: non cambia l'ordine e la visibilità degli altri sponsor nel nastro (la visibilità promessa resta uguale per tutti).
- Mai sponsor accanto ai dati di un minore (riga "Per te" di UX-58, profili, card dei traguardi).

## Criteri di accettazione

- Cliccando un logo nel nastro si arriva al sito dello sponsor in una nuova scheda e `SponsorDailyStat` del giorno aumenta di uno; un id inventato risponde 404.
- Nessuna tabella nuova contiene IP, user agent o identificativi.
- `/admin/sponsor` mostra i clic per sponsor e per mese; il dirigente la vede in sola lettura; l'allenatore secondo la regola che si decide in `ADMIN_NAV` (proposta: sì, sola lettura).
- Il report di uno sponsor stampato da Chrome sta in una pagina A4 e non contiene foto di album "Solo tesserati".
- Un post "Sponsor in evidenza" si crea con titolo, copertina e testo precompilati.
- Una partita con `sponsorId` mostra la riga "Partita offerta da" e il logo nel tabellino; senza, niente cambia.
- `adminNav.test.ts` e `routeAccess.test.ts` aggiornati; `npx tsc --noEmit`, `npm test`, `npm run a11y` verdi.

## Rischi noti

- **Numeri piccoli:** i clic sui loghi saranno poche decine a stagione. Nel report vanno presentati accanto alle visite del sito e agli eventi, non da soli, e mai gonfiati.
- **Aspettative degli sponsor:** "Partita offerta da" è visibilità in più per uno; se il club lo vende come pacchetto, va deciso dal direttivo, non dal sito.
