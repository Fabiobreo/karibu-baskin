# UX-72 · Lavagna: schemi ed esercizi animati, con i nomi dei giocatori

**Ondata:** 9 (strumenti dello staff) · **Stima:** L · **Dipende da:** — · **Stato:** fatto (18/11/2026), con i settori del canestro laterale alto ancora da disegnare

Richiesta del committente del 18/11/2026.

## Problema

- Gli schemi e gli esercizi oggi si spiegano a voce, o col pennarello su una lavagnetta che non esce dalla palestra. Nel Baskin è ancora più difficile: ci sono le zone dei ruoli 1 e 2, i tre settori del canestro laterale alto del ruolo 3, le marcature vietate sul ruolo 3 da parte di 4 e 5. "Il 4 fa il blocco" non dice niente a un ragazzo che non ricorda il suo numero di ruolo; "Marco parte da qui e va lì" sì.
- Quello che si spiega in allenamento non resta da nessuna parte: chi era assente, o chi a casa vuole ripassare, non ha niente da riguardare.

## Decisioni del committente (18/11/2026)

- **Chi vede:** lo staff crea; **tutti i tesserati** vedono tutti gli schemi pubblicati, di tutte le squadre (genitori compresi). Anonimi e ospiti no.
- **Campo:** il campo intero (transizioni, esercizi a tutto campo) e la **metà campo** (schemi d'attacco e di difesa, più grande sul telefono).
- **Pezzi:** oltre alle pedine dei ruoli, alla palla e alle frecce servono **coni e materiali**, **pedine senza ruolo** (file, 3 contro 2, staffette, anche più di dieci), l'**allenatore o tutor in campo** e **note scritte** appoggiate sul campo.
- **Primo rilascio:** la **libreria** (creazione dal pannello e consultazione per i tesserati) e l'**allenamento** (la scaletta del giorno con i nomi delle squadre generate). Partite e profilo della squadra vengono dopo (vedi "Fuori da questo ticket").

## Idea di fondo: lo schema si disegna sui ruoli, i nomi arrivano dal contesto

Una pedina di uno schema è un **posto** ("ruolo 3, lato sinistro"), non una persona. Così lo stesso schema vale per qualunque formazione e non contiene dati personali: la libreria è un archivio di disegni, senza nomi.

I nomi compaiono quando lo schema si guarda **dentro un allenamento**: i posti si riempiono con i giocatori della squadra scelta, presi dalle squadre già generate (`TrainingSession.teams`). Le squadre degli allenamenti arrivano già solo ai tesserati, quindi i nomi sulla lavagna seguono la stessa regola senza nessun controllo nuovo sui minori.

## Cosa fare

### 1. Il campo, uno solo per tutto il sito

- La geometria del campo oggi sta dentro `BaskinCourtDiagram` (`@/components/common/`, UX-41: campo 28 × 15 m, zone dei pivot, canestri laterali a metà dei lati lunghi, area, linea da tre). Si sposta in un modulo puro, **`@/lib/board/court.ts`**, con le misure del Regolamento EISI in metri, e `BaskinCourtDiagram` la legge da lì (il disegno di `/il-baskin` non deve cambiare: confronto prima/dopo).
- La lavagna aggiunge quello che a `/il-baskin` non serve: i **tre settori del canestro laterale alto** (centrale da 2 punti, laterali da 3) e le linee vere della zona dei pivot (raggio 3 m, senza l'ingrandimento che lo schema di `/il-baskin` usa per farci stare i numeri).
- **Coordinate in metri sul campo intero**, sempre. La metà campo è una vista ritagliata dello stesso campo (la metà di destra, quella d'attacco), non un secondo sistema: uno schema a metà campo ha i pezzi solo in quella metà, e l'editor non lascia uscire una pedina oltre la linea di metà campo.
- Componente `BoardCourt` (SVG puro, niente librerie, come `PointsTrendChart`), `viewBox` in metri per non dover convertire.

### 2. I pezzi

| Pezzo                | Aspetto                                                                                                 | Note                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Pedina di ruolo      | cerchio con il numero, `roleColor` pieno per **chi attacca**; contornato col numero per **chi difende** | forma diversa fra attacco e difesa: il colore non è l'unico segnale (WCAG 1.4.1)  |
| Pedina senza ruolo   | cerchio neutro con una lettera o un numero libero (A, B, 1, 2…)                                         | per file ed esercizi; massimo 24 pezzi in tutto per schema                        |
| Allenatore / tutor   | quadrato nel nero del marchio (`secondary`) con "All." o "T"                                            | il tutor è quello che passa la palla al ruolo 1                                   |
| Palla                | cerchio piccolo con le cuciture, neutro (`text.primary` su fondo chiaro), sempre in cima                | o in mano a una pedina (le sta attaccata, in alto a destra), o libera in un punto |
| Cono, cerchio, sedia | forme piccole neutre (triangolo, anello, quadrato) dall'elenco chiuso `BOARD_ITEMS`                     | niente immagini caricate                                                          |
| Nota sul campo       | testo breve (al massimo 40 caratteri) su un fondo `background.paper`, scala `caption`                   | per "qui si ferma", "conta fino a 3"                                              |

- **Niente colori nuovi.** Palla e materiali restano neutri: una tinta propria (la palla arancione, i coni gialli) sarebbe un significato nuovo in palette e va discussa prima con il committente (regola di UX-29). Se il committente la vuole, si aggiunge `palette.board` come eccezione chiusa, come `palette.calendar`.
- **Nel contesto di un allenamento**, chi attacca e chi difende sono due squadre vere: le pedine prendono il colore della casacca (`BIB`, eccezione già chiusa, sempre col nome) e il **nome di battesimo** sotto. La forma piena/contornata resta, così si capisce chi attacca anche senza colore.
- **"Tu":** se fra i nomi c'è chi guarda (o, per un genitore, un suo figlio), la pedina ha l'anello e la scritta "Tu" (o il nome del figlio in grassetto). Stessa regola di "Tu" / "Famiglia" della distinta convocati.

### 3. Passi e frecce

Uno schema è una **sequenza di passi** (da 1 a 20). Ogni passo è una fotografia delle posizioni; l'animazione porta i pezzi da un passo al successivo.

- **Le frecce si disegnano da sole**, dalla differenza fra un passo e il successivo: l'allenatore sposta le pedine, non disegna frecce.
  - pedina senza palla che si sposta → **movimento**, freccia piena;
  - palla che passa da una pedina a un'altra → **passaggio**, freccia tratteggiata;
  - pedina con la palla che si sposta → **palleggio**, freccia ondulata;
  - palla che va al canestro (bersaglio "canestro": grande, laterale alto, laterale basso) → **tiro**, freccia tratteggiata con la punta piena.
- In più, a mano, una freccia **blocco** (linea con la barretta in fondo) da una pedina a un punto: è l'unica che non nasce da uno spostamento.
- Frecce sempre neutre (`text.primary`), distinte dalla forma della linea. Una legenda piccola sotto la lavagna le spiega (anche per l'accessibilità).
- Ogni passo ha **una riga di testo** facoltativa (al massimo 140 caratteri): "Il 3 riceve e va al settore centrale". Si legge sotto la lavagna e fa da descrizione per i lettori di schermo.
- Linee dritte, nel primo rilascio. Le curve sono fuori (vedi sotto).

### 4. Il visore (`DrillPlayer`)

Lo stesso componente nel pannello, nella libreria e nell'allenamento.

- Controlli sotto la lavagna, bersagli da 44 px: **Play/Pausa**, **passo indietro**, **passo avanti**, indicatore "Passo 2 di 5" (tacche come nel quiz, UX-70: neutre, arancio quella attiva), **velocità** (lenta / normale), **ripeti**.
- Play anima un passo in circa 1,2 s (lenta 2 s), con una pausa di 0,6 s su ogni passo per leggere la riga. Sul passo, le frecce verso il passo successivo sono visibili; durante il movimento sfumano.
- `prefers-reduced-motion`: niente movimento, i passi cambiano con una dissolvenza e Play avanza da solo con le stesse pause.
- **Tutto schermo** (Fullscreen API; su telefono tenta `screen.orientation.lock("landscape")` e, se non va, mostra la riga "Gira il telefono"): serve per mostrarla in palestra. In tutto schermo i controlli restano in basso, il testo del passo sopra.
- Tastiera: spazio Play/Pausa, frecce sinistra/destra per i passi.
- Sotto la lavagna, l'elenco dei passi come testo (in un `details` chiuso, "Tutti i passi"): lo leggono i lettori di schermo e chi stampa.

### 5. L'editor (`/admin/lavagna/[id]`)

Pensato prima per il **telefono e il tablet** (l'allenatore lo prepara anche a bordo campo), poi per il desktop.

- **Barra degli strumenti** in alto: Sposta (di partenza), Aggiungi (menu: pedina d'attacco ruolo 1-5, pedina di difesa ruolo 1-5, pedina senza ruolo, allenatore/tutor, palla, cono, cerchio, sedia, nota), Blocco, Annulla / Ripeti, Elimina il pezzo scelto.
- **Trascinare col dito** (pointer events, un solo puntatore; il pinch non serve). Un tocco sceglie un pezzo e apre sotto la lavagna le sue proprietà: ruolo, attacco/difesa, lettera, testo della nota, "dà la palla a…".
- **Striscia dei passi** in basso: miniature dei passi, "+ Passo" (copia le posizioni finali del passo corrente: si parte sempre da dove si era rimasti), duplica, elimina, riordina trascinando o con "Sposta prima/dopo" nel "⋯". Il campo di testo del passo sta sotto la striscia.
- Un pezzo aggiunto in un passo c'è da lì in poi; si toglie da un passo in avanti con "Esce dal campo da questo passo" (serve per le sostituzioni negli esercizi).
- Su desktop: le frecce della tastiera spostano il pezzo scelto di 0,25 m (con Maiuscole 1 m), Canc lo elimina, Ctrl+Z / Ctrl+Y.
- **Anteprima** in qualunque momento (apre il visore sul passo corrente).
- **Salvataggio esplicito** ("Salva"); uscendo con modifiche non salvate, conferma. Una bozza non salvata resta sul dispositivo (`localStorage`, con try/catch) e si propone alla riapertura: è una comodità, non il salvataggio.
- **Anagrafica dello schema** (dialog "Dettagli"): titolo (obbligatorio, 80 caratteri), tipo (`ATTACK` Attacco, `DEFENSE` Difesa, `TRANSITION` Transizione, `SET_PLAY` Rimessa o palla ferma, `EXERCISE` Esercizio, `WARMUP` Riscaldamento), campo (intero / metà; cambiarlo con pezzi nell'altra metà chiede conferma e li riporta dentro), descrizione (facoltativa, 600 caratteri), durata indicativa in minuti (facoltativa, solo per gli esercizi), squadra di riferimento (facoltativa: è solo un filtro della libreria, **non** restringe chi la vede).
- **Stato:** `DRAFT` (bozza, solo staff) o `PUBLISHED` (pubblicato, tesserati). "Pubblica" e "Rimetti in bozza" come azioni. Solo uno schema pubblicato entra nella scaletta di un allenamento.

### 6. Dati

**Modelli** (con migration):

- `Drill`: `id`, `slug` (unico, da `slugUtils`), `title`, `kind` (enum `DrillKind`), `court` (enum `DrillCourt`: `FULL`, `HALF`), `description?`, `durationMin?`, `competitiveTeamId?` (filtro), `status` (enum `DrillStatus`: `DRAFT`, `PUBLISHED`), `content Json` (pezzi e passi, sotto), `archivedAt?`, `createdById`, `updatedById?`, `createdAt`, `updatedAt`, `publishedAt?`.
- `TrainingDrill`: `id`, `sessionId` → `TrainingSession` (cascade), `drillId` → `Drill` (restrict), `position`, `note?` (140 caratteri: "10 minuti, poi cambio"), `assignments Json?` (sotto); unico su (`sessionId`, `drillId`).

**`content`**, validato da uno schema Zod in `@/lib/schemas/drill.ts` (con test), versione dentro il JSON per poterlo cambiare in futuro:

```ts
interface DrillContent {
  v: 1;
  pieces: Array<{
    id: string; // "p1", stabile fra i passi
    kind: "role" | "free" | "coach" | "cone" | "ring" | "chair" | "note"; // la palla sta nei passi
    side?: "attack" | "defense"; // per role e free
    role?: 1 | 2 | 3 | 4 | 5; // solo role
    label?: string; // free (2 caratteri), note (40)
    coach?: "coach" | "tutor"; // solo coach
  }>;
  steps: Array<{
    text?: string; // 140 caratteri
    at: Record<string, { x: number; y: number } | null>; // metri; null = fuori dal campo
    ball?:
      | { holder: string }
      | { x: number; y: number }
      | { shot: "rightMain" | "leftMain" | "bottomSide" | "topSide" }; // a meta' campo solo i due di destra
    screens?: Array<{ from: string; to: { x: number; y: number } }>;
  }>;
}
```

- Limiti nello schema: 24 pezzi, 20 passi, coordinate dentro il campo (e dentro la metà, per `HALF`), una sola palla, `holder` che esiste nel passo, ogni `id` di `at` fra i pezzi.
- Le frecce non si salvano: si ricavano da due passi consecutivi con una funzione pura (`deriveArrows(content, passo)` in `@/lib/board/arrows.ts`, con test). Lo stesso per l'interpolazione (`interpolateStep` in `@/lib/board/animation.ts`).

**Eliminare.** Uno schema mai usato in un allenamento si elimina davvero (conferma). Uno usato si **archivia** (`archivedAt`): sparisce dalla libreria e dall'elenco del pannello (resta nel filtro "Archiviati"), ma gli allenamenti passati continuano a mostrarlo. Per questo `TrainingDrill.drillId` è `restrict`.

### 7. Pannello staff

- Voce **"Lavagna"** in `ADMIN_NAV` (`@/lib/adminNav`), gruppo `attivita`, `director: true` (il dirigente legge, non scrive). Titolo `h1` "Lavagna". Ogni pagina comincia con `requireAdminPage("/admin/lavagna")`; l'editor con `{ staffOnly: true }` per la scrittura (il dirigente apre lo schema nel visore). `adminNav.test.ts` verde.
- **`/admin/lavagna`**: elenco a card con la miniatura del primo passo (lo stesso `BoardCourt`, statico), titolo, tipo e campo come testo neutro, stato con un chip come `QuizStateChip` (nero del marchio per pubblicato, tratteggiato per bozza: stati, quindi neutri), "usato in N allenamenti". Filtri: tipo, campo, squadra, stato, ricerca per titolo. Bottone "Nuovo schema" nello slot `action` di `PageHeader`. Azioni con `RowActions`: principale "Modifica"; nel "⋯" Duplica, Pubblica / Rimetti in bozza, Archivia o Elimina (ultima, con conferma).
- **`/admin/lavagna/nuovo`**: chiede titolo, tipo e campo, crea la bozza e apre l'editor.
- **Scaletta dell'allenamento** in `/admin/allenamenti`: nelle schede Prossimi e Da completare ogni allenamento ha la voce "Scaletta" (nel "⋯" di `RowActions`, e un bottone di testo nella card espansa). Apre `TrainingDrillsDialog`: la scaletta attuale in ordine (riordina, nota, togli) e "Aggiungi dalla lavagna" (ricerca fra gli schemi pubblicati, filtri tipo e squadra). Un solo salvataggio, `PUT /api/sessions/[sessionId]/drills` (sostituzione in blocco).
- **Chi va dove.** Per ogni schema della scaletta e ogni squadra generata, il dialog mostra l'abbinamento posto → giocatore proposto in automatico (sotto) e lo staff può scambiare due nomi con un tocco ("Cambia"). Si salva in `TrainingDrill.assignments` solo quello che lo staff ha cambiato.
- Dall'editor, "Usa in un allenamento" apre lo stesso dialog sul prossimo allenamento (con un selettore fra i prossimi).

**Abbinamento automatico** (funzione pura `assignSlots(content, { attack, defense, assignments, seed })` in `@/lib/board/assign.ts`, con test):

- Le pedine di ruolo d'**attacco** prendono i giocatori della squadra scelta con lo stesso ruolo Baskin, nell'ordine dei pezzi; quelle di **difesa** i giocatori della squadra avversaria nell'allenamento (con 3 squadre, la squadra che si sceglie nel visore).
- Se i ruoli non bastano (due ruoli 3 nello schema, uno solo in squadra) la pedina resta senza nome e mostra il numero; se ne avanzano, nessuno resta "di troppo" a schermo.
- A parità di ruolo l'ordine è deterministico, seme `sessionId + drillId` con il PRNG di `@/lib/seededRandom`: ricaricando la pagina i nomi non cambiano.
- Pedine senza ruolo, allenatore e materiali non prendono mai nomi.
- Se le squadre vengono rigenerate, gli scambi salvati che non valgono più (giocatore non più in quella squadra) si scartano in lettura.

### 8. Libreria per i tesserati (`/lavagna`)

- **`/lavagna`**: `PageHero` (titolo "Lavagna", sottotitolo di una riga, colonna piena), griglia di card come nel pannello (miniatura, titolo, tipo, campo, durata se c'è), filtri tipo / campo / squadra di riferimento, ricerca. Solo schemi pubblicati e non archiviati.
- **`/lavagna/[slug]`**: `EntityHero` (breadcrumb Lavagna › titolo, `meta` con tipo, campo, durata, `manage` con `StaffManageButton` verso l'editor per lo staff), il visore, la descrizione, "Usato negli allenamenti" (gli ultimi 5 allenamenti in cui è stato in scaletta, link alla pagina dell'allenamento). Nella libreria le pedine mostrano solo i ruoli, mai nomi.
- **Accesso:** tesserati (`isMemberRole`) e staff. Anonimi e ospiti vedono il titolo della pagina e la riga "La lavagna è per i tesserati" con "Accedi" (gli ospiti: "Quando lo staff conferma il tuo account"), **nessuno schema nel payload**. Uno schema in bozza è 404 per chi non è staff.
- `noindex`, niente sitemap, niente ricerca globale (sono contenuti del club per i suoi tesserati).
- **Menu:** voce "Lavagna" nel menu "Il Baskin" di `SiteHeader`, accanto a "Giochi", solo per tesserati e staff (dal layout, come `showGames`). Stessa parola per voce, h1 e breadcrumb.
- Testi in `pages.board` (it + en). Titolo, descrizione, testi dei passi e note li scrive lo staff e restano come sono scritti (niente traduzione).

### 9. Nell'allenamento (`/allenamento/[sessionId]`)

- Sezione **"Cosa facciamo oggi"** (`#lavagna`), solo per i tesserati e solo se la scaletta non è vuota. Posizione: subito dopo la sezione squadre (con l'utente iscritto e le squadre fatte, dopo "La tua squadra" e le squadre; altrimenti in fondo, prima della lista iscritti).
- Una card per schema, nell'ordine della scaletta: titolo, tipo, durata, la nota dello staff, il visore. Il primo è aperto, gli altri chiusi (un tocco li apre: un solo visore in movimento alla volta).
- **Selettore "Con la squadra"** sopra il visore (le squadre dell'allenamento per nome, con il segno della casacca, più "Solo ruoli"): parte dalla squadra di chi guarda (o del figlio, per un genitore), altrimenti dalla prima. Senza squadre generate: solo ruoli, e la riga "I nomi arrivano quando lo staff fa le squadre".
- Per un allenamento già finito la sezione resta ("Cosa abbiamo fatto"): è la cosa che serve a chi era assente.
- **Nessuna notifica nuova.** La scaletta non avvisa nessuno: chi apre l'allenamento la trova. (Se il committente vorrà un avviso, si aggiunge al promemoria esistente, non un tipo nuovo.)
- Dati: la pagina carica scaletta e contenuti degli schemi nella stessa `Promise.all` delle altre letture; i nomi si calcolano sul server con `assignSlots` dalle squadre già filtrate per i tesserati (per i non tesserati `teams` è `null` e la sezione non c'è).

### 10. API

Tutte con schema Zod, try/catch con `P2002` gestito, risposte JSON, registro attività.

| Rotta                              | Metodo | Chi                    | Note                                                                                                    |
| ---------------------------------- | ------ | ---------------------- | ------------------------------------------------------------------------------------------------------- |
| `/api/drills`                      | GET    | tesserati (`isMember`) | pubblicati; lo staff con `?status=all` vede anche bozze e archiviati                                    |
| `/api/drills`                      | POST   | `isCoachOrAdmin`       | crea in bozza; audit `CREATE_DRILL`                                                                     |
| `/api/drills/[id]`                 | GET    | tesserati / staff      | bozza solo staff (404 agli altri); `panelGuard` per il dirigente                                        |
| `/api/drills/[id]`                 | PUT    | `isCoachOrAdmin`       | anagrafica, contenuto, stato; audit `UPDATE_DRILL` / `PUBLISH_DRILL`                                    |
| `/api/drills/[id]`                 | DELETE | `isCoachOrAdmin`       | elimina se mai usato, altrimenti archivia; audit `DELETE_DRILL` / `ARCHIVE_DRILL`                       |
| `/api/drills/[id]/duplicate`       | POST   | `isCoachOrAdmin`       | copia in bozza "(copia)"                                                                                |
| `/api/sessions/[sessionId]/drills` | GET    | tesserati / staff      | scaletta con contenuti; nomi solo con le squadre già visibili                                           |
| `/api/sessions/[sessionId]/drills` | PUT    | `isCoachOrAdmin`       | sostituzione in blocco (ordine, note, abbinamenti); solo schemi pubblicati; audit `SET_TRAINING_DRILLS` |

- Rate limit sulle GET (come le altre letture dei tesserati).
- `routeAccess.test.ts` aggiornato con le rotte nuove e i loro livelli.
- Le GET non restituiscono mai `createdById`/`updatedById` ai non staff.

### 11. Guida, offline, accessibilità

- **Guida** (`@/lib/content/guide.ts`, it + en): un capitolo "La lavagna" (`/guida#lavagna`) per atleti e genitori: dove si trova, come si guarda uno schema, i nomi nell'allenamento, il tutto schermo. Bottone che porta a `/lavagna`. `guide.test.ts` verde.
- **Offline:** le pagine `/lavagna/*` e `/allenamento/*` sono navigazioni, già in network-first con cache nel service worker: uno schema aperto una volta si riapre in palestra senza rete. Da verificare, nessuna regola nuova (i contenuti della libreria non hanno dati personali; l'allenamento è già in cache oggi).
- **Accessibilità:** `BoardCourt` con `role="img"`, `<title>` dello schema e `<desc>` col testo del passo corrente; l'elenco dei passi come testo sotto; controlli con etichetta; contrasto delle pedine contornate e delle note verificato sui due temi. `/lavagna` e uno schema di esempio fra le pagine dell'atleta in `npm run a11y`, `/admin/lavagna` fra quelle dell'admin.

## Ordine delle PR

1. Campo condiviso (`@/lib/board/court.ts`, `BaskinCourtDiagram` che lo legge) senza cambiare `/il-baskin`.
2. Modelli, migration, schema Zod, funzioni pure (`deriveArrows`, `interpolateStep`, `assignSlots`) con i test.
3. Visore (`DrillPlayer`) e pannello: elenco, editor, pubblicazione.
4. Libreria pubblica `/lavagna`, menu, guida.
5. Scaletta dell'allenamento: dialog nel pannello, sezione "Cosa facciamo oggi", abbinamenti.

## Criteri di accettazione

- Un allenatore crea dal telefono uno schema a metà campo con 5 pedine d'attacco, 5 di difesa e la palla, in 4 passi, senza disegnare nessuna freccia: le frecce di movimento, passaggio, palleggio e tiro compaiono da sole.
- Play anima i passi; con `prefers-reduced-motion` i pezzi non si muovono ma i passi avanzano; il tutto schermo funziona su telefono in orizzontale.
- Un esercizio con coni, 12 pedine senza ruolo, il tutor e una nota si salva e si riapre identico.
- Un atleta vede `/lavagna` e gli schemi pubblicati di tutte le squadre; non vede le bozze (404 anche chiamando l'API). Un anonimo e un ospite non ricevono nessuno schema nel payload.
- In un allenamento con le squadre fatte e uno schema in scaletta, un atleta iscritto vede le pedine con i nomi della sua squadra e la sua con "Tu"; un genitore vede quella del figlio; cambiando squadra nel selettore cambiano i nomi; ricaricando restano gli stessi.
- Lo staff scambia due nomi nel dialog della scaletta e lo scambio si vede nella pagina dell'allenamento.
- Uno schema usato in un allenamento passato non si elimina ma si archivia, e l'allenamento passato continua a mostrarlo.
- Il dirigente vede la Lavagna nel pannello in sola lettura, senza comandi di scrittura; le scritture gli rispondono 403.
- Nessun hex nuovo fuori da `@/lib/palette`, nessun `fontSize` o `fontWeight` letterale, raggi da `RADIUS`.
- `/il-baskin` invariato (schermata prima/dopo).
- `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run a11y` verdi.

## Com'è stato fatto

### PR 1 · Campo condiviso (18/11/2026)

- `@/lib/board/court.ts`: misure in metri (`COURT_LENGTH`, `COURT_WIDTH`, `COURT_LINES`), `threePointStraight` (i tratti dritti della linea da tre si calcolano, non si scrivono) e `courtShapes(options)`, le linee del campo intero nell'ordine di disegno. Le opzioni `pivotZoneR`, `hoopR`, `sideHoopInset` servono allo schema piccolo di `/il-baskin`; la lavagna userà le misure vere.
- `@/components/board/CourtLines`: disegna le forme in SVG nel colore del testo, senza "use client".
- `BaskinCourtDiagram` disegna il campo con `CourtLines` in un gruppo scalato a 11 unità per metro; numeri e lettere invariati.
- **Verifica:** `court.test.ts` controlla che le misure riproducano quelle scritte a mano prima. Nel browser, `/il-baskin` prima e dopo: le 13 forme hanno posizione e dimensioni uguali entro 0,1 px e gli stessi spessori a schermo. `tsc`, `npm test` (2.922) e lint verdi.
- **Aperto:** i **tre settori del canestro laterale alto** non sono disegnati. Il testo del regolamento che abbiamo dice solo che esistono (2 punti dal centrale, 3 dai laterali), non dove passano le linee: vanno presi dalla figura del regolamento EISI o fatti vedere a un allenatore prima della PR 3.

### PR 2 · Dati e funzioni pure (18/11/2026)

- **Schema:** `Drill`, `TrainingDrill` ed enum `DrillKind`, `DrillCourt`, `DrillStatus`; migration `20261118120000_drills` (solo creazioni), applicata al DB di sviluppo. Autore e ultimo a modificare sono facoltativi (`SetNull`): eliminare un account non cancella gli schemi.
- **Contenuto:** tipi e limiti in `@/lib/board/content` (la palla non è un pezzo: sta nei passi, in mano a un giocatore, in un punto o a canestro; `shotTargetPoint` dice dove sta il ferro). Schemi Zod in `@/lib/schemas/drill`: `drillContentSchema(court)` è una funzione, perché a metà campo i pezzi stanno solo a destra; controlla anche che ogni passo dica dove sta ogni pezzo, che la palla sia in mano a un giocatore in campo, che il primo passo non sia un tiro, e arrotonda le coordinate al centimetro. Più `DrillCreateSchema`, `DrillUpdateSchema` (il contenuto si ricontrolla nella rotta contro il campo), `TrainingDrillsSchema` (al massimo 12 schemi, niente doppioni) e `DrillAssignmentsSchema`.
- **Funzioni pure:** `deriveArrows` (`@/lib/board/arrows`: movimento, palleggio, passaggio, tiro, blocchi; sotto i 10 cm non è un movimento; chi palleggia e poi tira fa palleggio e poi tiro da dove arriva), `interpolateStep` (`@/lib/board/animation`: partenza e arrivo morbidi, chi entra o esce sfuma sul posto, la palla resta al passatore fino a metà e poi vola), `assignSlots` (`@/lib/board/assign`).
- **Verifica:** 35 test nuovi (`src/lib/board/*.test.ts`, `drill.test.ts`, schema di prova in `fixtures.ts`); `tsc`, `npm test` (2.953) e lint verdi.

### PR 3 · Visore e pannello (18/11/2026)

- **API:** `GET/POST /api/drills`, `GET/PUT/DELETE /api/drills/[id]`, `POST /api/drills/[id]/duplicate`. Letture ai tesserati (pubblicati e non archiviati), bozze a chi entra nel pannello; scritture dello staff con `staffActor()` (nuovo in `@/lib/apiAuth`, come `adminActor` ma da allenatore in su). La PUT ricontrolla il disegno contro il campo (anche quando cambia), non pubblica uno schema senza pezzi, non tocca uno archiviato; la DELETE archivia se lo schema è in una scaletta. Registro: `CREATE_DRILL`, `UPDATE_DRILL`, `PUBLISH_DRILL`, `UNPUBLISH_DRILL`, `ARCHIVE_DRILL`, `DELETE_DRILL` (etichette in `AuditLogClient`). Letture e mappature in `@/lib/board/drillAdmin` (`DRILL_PUBLIC_SELECT` senza autori). `routeAccess.test.ts` e `route.test.ts` aggiornati.
- **Disegno:** `BoardSvg` (`@/components/board`): campo in metri, pedine piene (attacco) e contornate (difesa), allenatore e tutor nel nero del marchio, materiali e note neutri, palla, frecce per forma (`wavyPath` per il palleggio), anello arancio sul pezzo scelto. Pedine e scritte hanno una misura minima in pixel (testo mai sotto i 12 px), misurata con un `ResizeObserver`; la palla in mano si sposta in proporzione alla pedina (`BallFrame.hand`). Su schermi larghi la lavagna non supera l'altezza della finestra (`--board-max-h`).
- **Visore:** `DrillPlayer` con Avvia/Pausa/Ricomincia, passo avanti e indietro, tacche dei passi, Lenta/Normale, Ripeti, tutto schermo (con tentativo di girare in orizzontale), tastiera, `prefers-reduced-motion`, riga del passo in `aria-live`, legenda (`BoardLegend`) e "Tutti i passi". Testi in `board` (it + en).
- **Pannello:** voce "Lavagna" in `ADMIN_NAV` (gruppo Attività, `director: true`); `/admin/lavagna` con card, miniatura del primo passo, filtri (tipo, campo, squadra, stato), `RowActions` (Modifica, Pubblica/Rimetti in bozza, Duplica, Elimina o Archivia); `/admin/lavagna/[id]` con l'editor (`DrillEditor`) o, per dirigente e schemi archiviati, il solo visore. **Niente pagina `/nuovo`:** "Nuovo schema" apre un dialog (`DrillFormDialog`, lo stesso dei "Dettagli") e porta all'editor, come per i quiz.
- **Editor:** Aggiungi (menu con ruoli d'attacco e difesa, pedine senza ruolo, allenatore, tutor, cono, cerchio, sedia, nota), Palla, Annulla/Ripeti (anche Ctrl+Z/Ctrl+Y), trascinamento col dito o col mouse, frecce della tastiera (Maiuscole per 1 m), Canc; la palla lasciata vicino a un giocatore gli va in mano. Sulla lavagna si vedono le frecce dal passo prima a quello aperto. Pannello della selezione (ruolo, lato, scritta, "Dagli la palla", Blocco, "Esce da questo passo", elimina, pezzi fuori dal campo da rimettere), striscia dei passi con "+ Passo" che copia il passo aperto. Salvataggio esplicito, bozza locale proposta alla riapertura, avviso uscendo con modifiche. Logica pura in `@/lib/board/editing` (con test) e storia in `drillHistory.ts`.
- **Verifica:** `tsc`, `npm test` (2.978), lint e Prettier verdi. Nel browser da admin, a 1.280 px e a 375 px: creato "[Prova] Pick and roll del 3" (resta nel DB di sviluppo), aggiunte pedine, trascinate, palla al 4, secondo passo con passaggio al 3 (frecce di passaggio e movimento comparse da sole), salvato, anteprima animata, pubblicato. Corretti durante la prova: chip di stato dentro un `<p>` (errore di idratazione), avviso della bozza locale che compariva mentre si modificava, palla che copriva il numero, lavagna più alta della finestra nell'anteprima.
- **Non verificato:** tutto schermo su un telefono vero, dirigente nel browser (coperto dai test di `adminNav` e delle rotte).
- **Ancora aperto:** i settori del canestro laterale alto (vedi PR 1).

### PR 4 · Libreria per i tesserati, menu e guida (18/11/2026)

- **`/lavagna`** (`PageHero`, colonna piena): `BoardLibrary` con le card (miniatura del primo passo, tipo · campo · durata · passi, freccia che diventa arancio al passaggio), ricerca e filtri tipo, campo e squadra di riferimento (solo se qualche schema ne ha una). Anonimi e ospiti: `MembersOnlyNotice` (`what="board"`, "gli schemi della lavagna"), nessuno schema nel payload.
- **`/lavagna/[slug]`** (`EntityHero`, colonna `main`): tipo, campo, durata e passi nella riga meta, "Gestisci" per lo staff verso l'editor, descrizione, visore, "Negli allenamenti" con gli ultimi 5. Bozze e archiviati: 404 ai tesserati, allo staff in anteprima col chip "Anteprima" (`PreviewChip`). Anonimi e ospiti: solo l'avviso (anche su uno slug che non esiste, per non dire quali schemi ci sono). Letture in `@/lib/board/loadBoard` (`boardViewer`, `loadBoardLibrary`, `loadBoardDrill`, con test).
- Tutte e due con `noindex`, fuori da sitemap e ricerca.
- **Menu:** voce "Lavagna" nel menu "Il Baskin" dopo "Giochi", solo per tesserati e staff (`showBoard` dal layout, `isMemberRole`); il menu resta evidenziato anche sulle pagine della lavagna. Testi in `nav.board` e `board.*` (it + en).
- **Guida:** capitolo "La lavagna" (`/guida#lavagna`, icona `board`), it + en, con il limite dell'iPhone (niente tutto schermo); `guide.test.ts` verde.
- **Accessibilità:** `e2e/a11y.mjs` misura `/lavagna` da anonimo e da atleta, il primo schema pubblicato da atleta, `/admin/lavagna` e il suo editor da admin.
- **Verifica:** `tsc`, `npm test` (2.986), lint e Prettier verdi. Nel browser: da admin libreria, card, pagina dello schema con visore e "Gestisci", `noindex`; da anonimo (richieste senza cookie) `/lavagna` e la pagina dello schema rispondono con l'avviso e senza titolo né disegno, `GET /api/drills` 403; da atleta libreria e pagina, nessun "Gestisci", voce "Lavagna" nel menu "Il Baskin", `?status=all` non restituisce gli autori.
- **`npm run a11y`:** le pagine della lavagna non hanno violazioni gravi. Corretti il contrasto dei bottoni "Lenta"/"Normale" e "Ripeti" del visore e l'ordine dei titoli dell'editor (`subtitle2` diventava un `h6`). Resta, moderata, `region` sulla pagina dello schema: è il link "Vai al contenuto", comune a tutto il sito. La baseline non è stata riscritta, perché lo stesso giro trova due violazioni gravi che non sono della lavagna: `aria-progressbar-name` in `/profilo` (atleta, desktop) e `color-contrast` su 43 elementi di `/admin/giochi/quiz/baskin`.

### PR 5 · Scaletta dell'allenamento (18/11/2026)

- **API:** `GET/PUT /api/sessions/[sessionId]/drills` (lettura ai tesserati, `member` in `routeAccess.test.ts`; scrittura dello staff con sostituzione in blocco, in transazione). Entra solo uno schema pubblicato; uno già in scaletta resta anche se torna in bozza o viene archiviato (allo staff con l'avviso "non più pubblicato", ai tesserati gli archiviati sì e le bozze no). Registro `SET_TRAINING_DRILLS` sull'allenamento. Letture in `@/lib/board/trainingDrills`, test in `route.test.ts`.
- **Pannello:** bottone "Scaletta" in `SessionActions`, quindi in tutte e tre le schede di `/admin/allenamenti`. `TrainingDrillsDialog`: "Aggiungi dalla lavagna" (ricerca fra gli schemi pubblicati, raggruppati per tipo), ordine con le frecce, nota per i ragazzi, togli; "Chi va dove" per squadra in attacco (la difesa è la squadra dopo), un menu per pedina con i giocatori di quella squadra: scegliere chi è già su un'altra pedina li scambia. Si salva la mappa intera della squadra toccata.
- **Pagina dell'allenamento:** `TrainingDrillsSection` ("Cosa facciamo oggi", "Cosa abbiamo fatto" a allenamento finito, ancora `#lavagna`) in fondo al contenuto, in tutti e tre i layout, solo per i tesserati. Selettore "Con la squadra" (le squadre con il pallino della casacca, più "Solo ruoli"), che parte dalla squadra di chi guarda o del figlio; un riquadro per schema (il primo aperto, gli altri chiusi e smontati), nota, visore con i nomi e "Apri nella lavagna". Senza squadre: "I nomi arrivano quando lo staff fa le squadre". I nomi si calcolano nel browser con `trainingPieceNames` (`@/lib/board/trainingNames`, con test) dalle squadre che la pagina riceve già solo per i tesserati: nessun dato nominativo in più passa dall'API della scaletta.
- **Nomi sulle pedine:** nome di battesimo; chi guarda ha "Nome · Tu" (tradotto), un figlio il nome in grassetto, tutti e due con l'anello (`PieceName.highlight`).
- **Differenze dal ticket:** le pedine tengono il colore del ruolo anche nell'allenamento (il ruolo serve più della casacca, che sta nel selettore); la sezione sta in fondo alla pagina invece che subito dopo le squadre, per stare in un punto solo in tutti i layout; con tre squadre la difesa è "la squadra dopo, in giro", senza un secondo selettore.
- **Verifica:** `tsc`, `npm test` (2.995), lint e Prettier verdi. Nel browser sull'allenamento di prova "[UX] Ciclo di vita": da admin aggiunto lo schema alla scaletta, scambiati Elena e Davide fra ruolo 3 e 4, salvato; nella pagina dell'allenamento gli Arancioni mostrano lo scambio, i Neri "Valentina" e "Luca"; da Luca Ferrero (atleta dei Neri) la sezione parte dai Neri con "Luca · Tu"; da anonimo l'API risponde 403 e la pagina non contiene lo schema. Nessun errore in console.
- **Non verificato:** la sezione con un genitore che ha un figlio in squadra (coperto dal test di `trainingPieceNames`), `npm run a11y` sulla pagina di un allenamento con la scaletta (l'allenamento misurato dallo script non ne ha una).

## Fuori da questo ticket

- **Schemi della partita** (nella pagina convocazioni e nella pagina partita, con i nomi dei convocati e in difesa le iniziali dei giocatori segnalati dell'avversaria): ticket a parte, riusa `assignSlots` con i convocati al posto della squadra dell'allenamento.
- **"I nostri schemi" nel profilo della squadra**: filtro della libreria per squadra di riferimento, ticket a parte.
- **Condivisione** (immagine del passo con `shareElementAsImage` e il link): dopo, va decisa con il committente perché nel contesto dell'allenamento l'immagine porterebbe i nomi fuori dall'app.
- Frecce curve, disegno a mano libera, registrazione di un GIF o video, più palle, tracce di più movimenti nello stesso passo.
- Tinta propria per palla e materiali (vedi sezione 2: va discussa prima).
- Traduzione inglese dei contenuti degli schemi.
