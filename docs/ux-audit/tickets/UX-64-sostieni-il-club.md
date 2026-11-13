# UX-64 · Sostieni il club: 5×1000, donazioni e volontari

**Ondata:** 7 (engagement) · **Stima:** M · **Dipende da:** UX-55 · **Stato:** scartato dal committente (12/11/2026)

Richiesta del committente del 06/11/2026 (piano di engagement).

## Problema

Il sito chiede alle persone solo di iscriversi e di rispondere. Non dà nessun modo di **aiutare**, che per un'associazione è la forma di coinvolgimento più forte: chi dona o fa il volontario si sente parte del club, ne parla e torna. Oggi:

- non c'è una pagina per il 5×1000, che costa niente a chi lo dà ed è la prima fonte di sostegno per molte associazioni sportive;
- chi vuole fare una donazione (un nonno, un'azienda che non è sponsor) non trova come;
- chi vorrebbe dare una mano (accompagnare in trasferta, fare foto, preparare un evento) non sa a chi dirlo;
- sponsor e sostenitori sono la stessa cosa nella testa di molti: la pagina `/sponsor` è per le aziende, manca il posto per le persone.

## Cosa fare

### 1. Dati da chiedere al club, prima di scrivere codice

Scriverli qui quando arrivano:

- l'associazione è iscritta negli elenchi per il **5×1000** (ASD iscritta al Registro nazionale delle attività sportive dilettantistiche con i requisiti, oppure ETS)? Codice fiscale da indicare;
- per le donazioni: IBAN dell'associazione e intestazione esatta; se e come rilascia una ricevuta; se le donazioni sono detraibili (dipende dalla forma giuridica: **la pagina non lo promette se non è confermato per scritto dal commercialista del club**);
- una o due "cose da comprare" concrete per la campagna (es. "le canotte nuove della stagione", "il pulmino per le trasferte"), con importo obiettivo;
- i compiti per i volontari e chi li coordina.

### 2. Pagina `/sostienici`

Pagina pubblica di contenuto, `PageHero` colonna `reading`, testi in `it.json`/`en.json` (`pages.support`). Tre sezioni, ognuna con un'àncora uguale nelle due lingue (`#5x1000`, `#dona`, `#volontari`), così lo staff può mandare il link alla sezione giusta.

1. **Il tuo 5×1000** (solo se il punto 1 lo conferma): perché conta, il codice fiscale scritto grande con un bottone "Copia" (toast "Codice fiscale copiato"), tre passi per indicarlo nella dichiarazione (730, modello Redditi, CU per chi non presenta la dichiarazione), e cosa ci ha fatto il club l'anno scorso con quei fondi (testo del club). Una riga "Dillo anche a chi ti fa la dichiarazione" con un bottone di condivisione per WhatsApp (UX-56, `campaign: "5x1000-<anno>"`).
2. **Fai una donazione:** l'obiettivo della campagna con una **barra di avanzamento** (importo raccolto / obiettivo, numeri in testo accanto alla barra: secondo segnale, WCAG 1.4.1; colore `primary`, è lo stato di un'azione del club, non una valenza), IBAN con "Copia", causale suggerita. Nessun pagamento online in questa fase: niente dati di pagamento sul sito, niente fornitori da integrare.
3. **Dai una mano:** l'elenco dei compiti (accompagnare, fotografare, organizzare, guidare il pulmino…) con una riga ciascuno, e il modulo contatti con l'oggetto "Voglio fare il volontario" (stesso campo oggetto di UX-63).

Blocco `BrandCta` in fondo, uno solo, verso la sezione che conta di più in quel periodo (5×1000 da aprile a giugno, donazione il resto dell'anno): la regola sta in una funzione pura `supportFocus(date)` con test.

### 3. La campagna si aggiorna senza deploy

- L'importo raccolto cambia nel tempo. Modello `SupportCampaign`: `title`, `goalCents`, `raisedCents`, `active`, `updatedAt` (migration). Una sola campagna attiva alla volta.
- Admin: in `/admin/news` o in una sezione nuova "Sostegno" di `ADMIN_NAV` (decidere con il committente; per una riga sola basta una scheda in una sezione esistente), un form con obiettivo, raccolto e "attiva", solo admin. Audit `UPDATE_SUPPORT_CAMPAIGN`.
- Senza campagna attiva la sezione donazioni mostra solo IBAN e causale, senza barra.

### 4. Dove si trova

- Footer, colonna dei link: "Sostienici".
- `/sponsor`: in fondo una riga "Sei una persona e non un'azienda? Puoi sostenerci anche tu" verso `/sostienici`.
- Home: **niente** sezione fissa (la home ha già il suo `BrandCta` per chi non ha un account). Da aprile a giugno, se il 5×1000 è confermato, una riga nella sezione news (un post del club è il modo giusto: lo staff lo pubblica dalla bacheca, con la spunta "Avvisa").

### 5. Misura

Con UX-55: visite a `/sostienici` per sezione d'arrivo (dalle ancore non si misura, dagli UTM sì), richieste di volontariato dal modulo contatti. L'importo raccolto lo aggiorna lo staff.

## Criteri di accettazione

- Senza la conferma del 5×1000 la sezione non c'è (bandiera in `@/lib/content/support.ts` con i dati del club; nessun codice fiscale nel codice finché non è confermato).
- "Copia" del codice fiscale e dell'IBAN funziona su telefono e dà il toast; su un browser senza appunti il dato resta selezionabile.
- La barra di avanzamento ha i numeri scritti accanto, `role="progressbar"` con `aria-valuenow/min/max` e un nome accessibile.
- Il modulo contatti con oggetto "Voglio fare il volontario" arriva allo staff con l'oggetto.
- Nessuna frase sulla detraibilità senza la conferma scritta del club.
- Tema chiaro e scuro, 390 px, testi in `it.json`/`en.json`; `npx tsc --noEmit`, `npm test`, `npm run a11y` verdi.

## Fuori da questo ticket

- Pagamenti online (Satispay, PayPal, carta): richiede un fornitore, un conto collegato e una decisione del direttivo. Se arriva, è un ticket a parte.
