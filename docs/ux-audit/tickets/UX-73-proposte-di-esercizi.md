# UX-73 · Proposte di esercizi dagli atleti, nel Playbook

**Ondata:** 9 (strumenti dello staff) · **Stima:** M · **Dipende da:** UX-72 · **Stato:** da fare

Richiesta del committente del 19/11/2026: "se volessi permettere agli atleti di suggerire esercizi, usando il playbook?"

## Problema

- Gli atleti hanno idee per gli allenamenti (un gioco visto altrove, una variante di un esercizio che piace), ma oggi possono solo dirle a voce o scriverle in un suggerimento di testo, dove un esercizio si spiega male.
- Il Playbook (UX-72) ha già tutto per disegnare un esercizio: campo, pedine, passi, frecce ricavate. Lo usa solo lo staff.
- Proporre un esercizio e vederlo fare in palestra è un bel modo di sentirsi parte della squadra. Il motivo è questo, non le metriche (vedi la scelta del committente sui giochi: si fa perché è bello, non per il traffico).

## Idea di fondo: una proposta è un esercizio in bozza dell'atleta, discusso col filo dei Suggerimenti

Niente flusso nuovo: si riusano i due pezzi che ci sono.

1. **L'editor del Playbook** (`DrillEditor`), in una versione ridotta fuori dal pannello.
2. **I Suggerimenti** (`Suggestion` + `SuggestionNote`), per il dialogo fra lo staff e chi ha proposto: note interne, risposte all'autore, avviso `SUGGESTION`, lettura in `/profilo/suggerimenti`.

Lo staff non riceve un esercizio "pubblicato da un atleta": riceve una proposta, la guarda, risponde e, se gli piace, **la adotta**. Da lì è un esercizio dello staff come gli altri.

## Come funziona

### Chi propone

- Chi ha un account con un ruolo da tesserato (`isMemberRole`): atleti, genitori, dirigenti, staff che gioca. Gli ospiti no.
- I figli senza account non propongono: il genitore potrebbe farlo a nome loro, ma nel primo rilascio no (decisione del committente).

### Cosa si propone

- **Solo esercizi** (tipi Riscaldamento ed Esercizio), **mai schemi**: gli schemi sono il gioco da partita della squadra e restano dello staff. L'editor delle proposte non offre i tipi degli schemi e l'API li rifiuta.
- Titolo, campo (intero o metà), il disegno, una descrizione ("come si fa, perché mi piace"). Niente squadra, durata, visibilità, pubblicazione: le decide lo staff quando adotta.

### Il percorso

1. **Proponi.** In `/playbook/esercizi` un bottone "Proponi un esercizio" (solo tesserati) apre `/playbook/proponi`, con l'editor ridotto. Si salva quando si vuole (bozza), poi "Invia allo staff".
2. **Inviata.** L'esercizio prende lo stato `PROPOSED` e nasce un `Suggestion` collegato (categoria nuova `ESERCIZIO`, testo = descrizione). Allo staff arriva l'avviso dei suggerimenti che c'è già ("Nuovo suggerimento", allenatori e admin).
3. **Lo staff guarda.** In `/admin/playbook` una terza scheda **"Proposte"** (con il numero di quelle nuove), oltre a Esercizi e Schemi. Ogni proposta si apre nel visore, con il filo del suggerimento accanto (`SuggestionThread`): note interne e risposte all'autore, come oggi.
4. **Esito.**
   - **Adotta:** l'esercizio diventa una bozza dello staff (`DRAFT`, `adoptedAt`, `createdById` resta l'autore, `updatedById` lo staff), lo staff lo sistema e lo pubblica quando vuole. All'autore va una risposta automatica: "Lo staff ha preso il tuo esercizio: lo trovi nel Playbook quando sarà pubblicato." Quando viene pubblicato, un secondo avviso: "Il tuo esercizio è nel Playbook".
   - **Non adesso:** lo staff risponde (risposta all'autore) e archivia; l'esercizio resta in `PROPOSED` archiviato, invisibile a tutti tranne l'autore, che lo può rileggere.
5. **L'autore segue.** In `/profilo/suggerimenti` la proposta compare con il suo disegno (miniatura che apre il visore) e le risposte dello staff, come gli altri suggerimenti. Finché non è adottata la può modificare o ritirare.

### Chi vede una proposta

- **Prima dell'adozione:** solo l'autore e lo staff (allenatori e admin; il dirigente in sola lettura, come il resto del Playbook). Mai nella libreria, mai in sitemap, mai nella ricerca, mai in una scaletta (la PUT della scaletta accetta già solo `PUBLISHED`).
- **Dopo l'adozione:** valgono le regole di UX-72 (bozza dello staff → pubblicata → eventualmente pubblica).

## Decisioni del committente (19/11/2026)

- **Le proposte sono firmate.** I Suggerimenti restano anonimi (`Suggestion.userId` non arriva mai allo staff: `adminSuggestion.ts`), ma una proposta di esercizio no: è un'eccezione chiusa, solo per la categoria `ESERCIZIO`, e il modulo lo dice ("Lo staff vedrà il tuo nome"). Sull'esercizio pubblicato c'è la riga "Idea di Marco" (solo il nome di battesimo), **visibile solo ai tesserati**: mai sulla pagina di un esercizio reso pubblico (può finire su Google), mai per un minore (`@/lib/minors`), e l'autore la può spegnere (spunta "Mostra il mio nome" nel modulo, accesa di default).
- **Figli senza account:** nel primo rilascio non propongono; il genitore propone a nome suo.
- **Limite:** al massimo **3 proposte in attesa** per persona (bozze più inviate non adottate né archiviate), 409 oltre.
- **Bozze abbandonate:** una bozza mai inviata si cancella dopo 60 giorni, nel cron domenicale `cleanup-notifications` (niente cron nuovo: siamo al limite).

## Cosa fare

### 1. Dati (una migration)

- `DrillStatus`: aggiungere `PROPOSED`.
- `Drill`: `suggestionId String? @unique` (relazione a `Suggestion`, `onDelete: SetNull`), `proposedAt DateTime?`, `adoptedAt DateTime?`, `showAuthor Boolean @default(true)`.
- `SuggestionCategory`: aggiungere `ESERCIZIO`.
- Le query che oggi leggono gli esercizi (`VISIBLE_DRILL_WHERE`, `PUBLIC_DRILL_WHERE`, conteggi del pannello, `loadPublicExerciseCount`) restano su `PUBLISHED`: una `PROPOSED` non ci entra da sola. Va controllato che **nessun** `where` del Playbook usi `status: { not: "DRAFT" }`.

### 2. Regole pure (`@/lib/board/proposals.ts`, con test)

- `canPropose(role)`, `canEditProposal(drill, userId)` (autore, non ancora adottata), `pendingProposals(rows)` per il limite, `proposalAuthorLabel(author, viewer)` per la riga "Idea di …" (nome di battesimo, mai per un minore, mai a chi non è tesserato, mai con `showAuthor` spento).

### 3. API

- `POST /api/drills/proposals` (tesserati): crea la bozza dell'autore. Rifiuta i tipi degli schemi, applica il limite, rate limit.
- `PUT /api/drills/proposals/[id]` (autore, finché non è adottata): disegno, titolo, descrizione.
- `POST /api/drills/proposals/[id]/submit` (autore): `PROPOSED` + `Suggestion` collegato, avviso allo staff.
- `DELETE /api/drills/proposals/[id]` (autore, finché non è adottata): ritira, cancella esercizio e suggerimento.
- `POST /api/drills/[id]/adopt` (staff): `DRAFT` + `adoptedAt`, risposta automatica all'autore sul filo del suggerimento, audit `ADOPT_DRILL`.
- Pubblicazione di un esercizio adottato (la PUT che c'è): se `adoptedAt` e prima pubblicazione, avviso all'autore.
- Tutte le GET nuove in `routeAccess.test.ts` (`member` o `self`).

### 4. Editor ridotto fuori dal pannello

- `DrillEditor` oggi sta in `components/admin/board/`. Le parti di disegno (campo, pezzi, passi, barra) vanno in `components/board/` e le usano due involucri: quello dello staff (com'è) e `ProposalEditor` (senza squadra, visibilità, pubblicazione, tipi degli schemi).
- **Telefono prima di tutto:** gli atleti lo useranno da lì. Provare a 360 px: trascinamento delle pedine col dito, barra dei passi, aggiunta di pezzi. Se il trascinamento non regge, toccare la pedina e poi il punto d'arrivo.
- Bozza in `localStorage` come nell'editor dello staff (chiave per proposta).

### 5. Pannello

- Scheda "Proposte" in `/admin/playbook` (`AdminDrillListClient`): righe con titolo, autore, data; azione principale "Guarda", nel "⋯" "Adotta" e "Archivia".
- Pagina della proposta: visore + `SuggestionThread` (riusato) + bottone "Adotta". Un dirigente la vede in sola lettura.

### 6. Profilo e libreria

- `/profilo/suggerimenti`: le proposte con miniatura, stato ("Bozza", "Inviata", "Presa dallo staff", "Nel Playbook", "Non adesso") come testo, mai chip-bottone, risposte dello staff.
- `/playbook/esercizi`: bottone "Proponi un esercizio" (tesserati) e, sotto la libreria, "Le tue proposte" se ce ne sono.
- Pagina dell'esercizio adottato: riga "Idea di …" secondo la decisione del committente.

### 7. Guida e testi

- Capitolo "Il Playbook" della guida: un paragrafo "Proporre un esercizio", in tutte e due le lingue (`guide.test.ts` controlla le etichette citate).
- Tutti i testi pubblici in `it.json` ed `en.json`; il pannello solo in italiano.

## Ordine delle PR

1. Dati, regole pure, API (con test).
2. Editor diviso in componenti condivisi + `ProposalEditor` + pagina `/playbook/proponi`, provato su telefono.
3. Pannello (scheda Proposte, pagina della proposta, Adotta), profilo e libreria, guida.

## Criteri di accettazione

- Un atleta disegna un esercizio dal telefono, lo salva, lo riapre e lo invia; lo staff lo vede in "Proposte" e riceve l'avviso.
- Una proposta non compare mai in libreria, sitemap, ricerca, scaletta, né a un altro tesserato; un ospite o un anonimo ricevono 403/404 su ogni rotta delle proposte.
- Un tipo da schema in una proposta è rifiutato dall'API.
- Oltre il limite di proposte in attesa: 409 con un messaggio che spiega cosa fare.
- "Adotta" porta l'esercizio fra le bozze dello staff, l'autore lo legge in `/profilo/suggerimenti`, e alla pubblicazione riceve l'avviso.
- La riga "Idea di …" segue la decisione del committente (mai su una pagina pubblica, mai per un minore).
- Lo staff vede il nome di chi ha proposto; i suggerimenti delle altre categorie restano anonimi come oggi (`adminSuggestion.ts` invariato per loro).
- `npm run a11y` senza violazioni nuove su `/playbook/proponi` e sulla scheda Proposte.

## Fuori da questo ticket

- Proposte di schemi.
- Voti o "mi piace" dei tesserati sulle proposte (classifiche di persone: no, come per i giochi).
- Proposte a nome dei figli senza account (scelta del committente per il primo rilascio).
- Commenti dei tesserati sugli esercizi pubblicati.

## Com'è stato fatto

### PR 1 · Dati, regole e API (19/11/2026, `a0bad5b`)

- **Migration** `20261119150000_drill_proposals` (scritta con `prisma migrate diff`, perché `migrate dev` non riesce a ricostruire il DB ombra dalle migration di aprile): `PROPOSED` in `DrillStatus`, `ESERCIZIO` in `SuggestionCategory`, su `Drill` `suggestionId` (unico, `SetNull`), `proposedAt`, `adoptedAt`, `showAuthor` (acceso di default) e l'indice `createdById, status`. Applicata al DB di sviluppo.
- **Regole pure** in `@/lib/board/proposals` (14 test): `canPropose`, `proposalState` (bozza, inviata, "Non adesso", presa dallo staff, nel Playbook), `canEditProposal` / `canSubmitProposal` / `canWithdrawProposal` / `canAdoptProposal`, `pendingProposals` + `pendingProposalsWhere` (limite di 3), `abandonedDraftsWhere` (60 giorni), `proposalAuthorLabel` ("Idea di …": nome di battesimo, solo tesserati, mai su un esercizio pubblico, mai un minore, mai con `showAuthor` spento). Testi degli avvisi in `proposalNotify.ts`, letture in `loadProposals.ts`.
- **API** (con `route.test.ts`): `GET/POST /api/drills/proposals` (`memberActor()` nuovo in `@/lib/apiAuth`: 401 anonimo, 403 ospite; tipi da schema rifiutati da `ProposalCreateSchema`; 409 `code: "limit"` oltre 3 in attesa), `PUT/DELETE /api/drills/proposals/[id]` (solo l'autore, a un altro tesserato 404; la descrizione aggiorna il suggerimento collegato), `POST …/submit` (nasce il `Suggestion` `ESERCIZIO` in transazione con un `updateMany` che non lascia due invii; avviso "Nuovo suggerimento" allo staff, con il nome, che apre la proposta), `POST /api/drills/[id]/adopt` (bozza dello staff, risposta automatica sul filo, avviso all'autore, registro `ADOPT_DRILL`). Alla prima pubblicazione di un esercizio adottato la PUT dello staff avvisa l'autore ("Il tuo esercizio è nel Playbook"). Avvisi sempre con `inBackground`.
- **Cosa non cambia per gli altri:** lo staff non modifica una proposta prima di adottarla (409), la DELETE dello staff su una proposta la mette da parte (`DECLINE_DRILL_PROPOSAL`, suggerimento archiviato) invece di cancellarla, "Duplica" non copia una proposta, la bozza mai inviata non la vede nessuno dello staff (GET del pannello, `loadBoardDrill`). Libreria, sitemap, conteggi e scaletta leggono già solo `PUBLISHED`; nessun `where` usa `status: { not: "DRAFT" }`; elenco e GET `?status=all` del pannello escludono `PROPOSED`.
- **Suggerimenti:** le proposte stanno nella scheda Proposte, quindi `GENERAL_SUGGESTIONS_WHERE` le toglie da `/admin/suggerimenti` e da `GET /api/suggestions`; `adminSuggestion.ts` resta anonimo per tutte le categorie (il nome dello staff arriva da `Drill.createdBy`, nella sola pagina della proposta). Le note e risposte sul filo di una proposta avvisano lo staff con il link alla proposta.
- **Cron:** `cleanup-notifications` cancella le bozze mai inviate e ferme da 60 giorni (`deletedProposalDrafts`), nessun cron nuovo.
- `routeAccess.test.ts`: `drills/proposals` è `self`.

### PR 2 · Editor condiviso e `/playbook/proponi` (19/11/2026, `200353e`)

- Il disegno dell'editor è in `@/components/board`: `DrillCanvasEditor` (barra, lavagna con dita e mouse, tastiera, passi, pannello della selezione; storia passata da fuori), `DrillPieceMenu`, `DrillStepsBar`, `DrillSelectionPanel`, `drillHistory`, `useDeviceDraft` + `DeviceDraftAlert` (bozza sul dispositivo, chiave per proposta `karibu-proposta:<id>`), `DrillPreviewDialog`. Testi in `board.editor` (it + en), con le stesse parole di prima: lo staff vede l'editor di sempre. `DrillEditor` dello staff è diventato un involucro (salva, dettagli, pubblica).
- `ProposalEditor`: titolo, tipo (solo Esercizio e Riscaldamento), descrizione, "Mostra il mio nome" con "Idea di <nome>" scritto, "Lo staff vedrà il tuo nome", disegno, "Salva", "Invia allo staff" e "Ritira la proposta" con conferme piccole anche sul telefono. Errori delle rotte tradotti dal loro `code` (`proposalErrors.ts`).
- `/playbook/proponi` (`PageHeader`, colonna `main`, `noindex`): senza `?id` il primo passo (`ProposalStartForm`: titolo, tipo, campo) o, al limite, l'avviso con il link alle proprie proposte; con `?id` l'editor finché si può cambiare, poi la lettura con lo stato. Anonimo → accesso; ospite → `MembersOnlyNotice` (`what="proposals"`); la proposta di un altro → 404 prima di ogni Suspense. "proponi" è uno slug riservato.
- **Provato a 360 px** da atleta (`atleta@ux.test`): titolo, pedina aggiunta e trascinata col puntatore, palla, secondo passo con il palleggio ricavato da solo, salvato, ricaricato (2 passi ritrovati), inviato. Il trascinamento regge (`touch-action: none` sulla lavagna), quindi niente "tocca e poi tocca il punto d'arrivo".

### PR 3 · Pannello, profilo, libreria, guida (19/11/2026, `225c933`)

- **Pannello:** terza scheda "Proposte" in `/admin/playbook` (`ProposalList`, con "· N nuove" finché lo staff non ha scritto; `?scheda=proposte` la apre): miniatura, titolo, nome, data, "Guarda", nel "⋯" "Adotta" e "Non adesso"; le messe da parte in fondo. Pagina `/admin/playbook/proposte/[id]` (`AdminProposalClient`, `requireAdminPage`): visore, descrizione, "Proposta di <nome>", filo con `SuggestionThread` (nuove prop `signed`, con il testo giusto sulla risposta, e `readOnly` per il dirigente), "Adotta" nello slot `action`, "Non adesso". Una proposta già adottata apre l'editor.
- **Profilo:** `/profilo/suggerimenti` apre con "Le tue proposte di esercizi" (`MyProposalCard`: primo passo del disegno che apre la proposta, stato come testo, risposte firmate "Lo staff") e la riga "sono firmate"; gli altri suggerimenti restano com'erano, con la riga sull'anonimato.
- **Libreria:** in `/playbook/esercizi` il bottone fantasma "Proponi un esercizio" nella fascia (tesserati) e, sotto la libreria, "Le tue proposte" con lo stato di quelle non ancora nel Playbook.
- **"Idea di …"** nella riga meta dell'esercizio (`loadBoardDrill` → `ideaOf`, calcolato sul server: nome e data di nascita non escono).
- **Guida:** tre passi nel capitolo "Il Playbook" e il link "Proponi un esercizio", it + en.
- **a11y:** `e2e/a11y.mjs` misura `/playbook/proponi` (atleta), la scheda Proposte e la pagina della prima proposta inviata (admin). `npm run a11y -- --only=athlete,admin`: nessuna violazione su `/playbook/proponi` e sulla scheda Proposte, in chiaro e scuro, desktop e telefono. La pagina della proposta è stata saltata (nel DB di sviluppo non c'era più una proposta inviata non adottata). Le sole violazioni gravi nuove rispetto alla baseline sono quelle già note di `/admin/giochi/quiz/baskin` (`color-contrast`, vedi UX-72): baseline non riscritta.
- **Verifica nel browser:** da allenatore scheda e pagina della proposta con il nome, risposta all'autore, "Adotta" → editor in bozza, "Pubblica" → `/playbook/tiro-dal-cono` mostra "Idea di Luca" a un tesserato e non più dopo "Rendi pubblico" (rimesso ai tesserati); da atleta a 360 px la proposta in profilo con la risposta, quella automatica e lo stato "Nel Playbook"; da anonimo 401 su tutte le rotte delle proposte e dell'adozione, `/playbook/proponi` rimanda all'accesso, niente "Idea di" e niente proposta in sitemap. Le notifiche erano spente (`DISABLE_NOTIFICATIONS`) per non avvisare nessuno: gli avvisi sono verificati dai test delle rotte.
- **Non verificato nel browser:** un ospite (nessun account GUEST di prova nel DB di sviluppo; coperto dai test delle rotte), il dirigente, un telefono vero.
- **Aperto:** il contatore "suggerimenti nuovi" della dashboard (`/admin`) conta anche le proposte nuove: la pagina era di un'altra sessione e non l'ho toccata (basta aggiungere `GENERAL_SUGGESTIONS_WHERE` al `count`). Dalla lettura di una proposta messa da parte manca il bottone "Ritira" (l'API lo permette).
- **Dati di prova lasciati nel DB di sviluppo:** l'esercizio "Tiro dal cono" proposto da `atleta@ux.test`, adottato e pubblicato per i tesserati, con il suo suggerimento.
