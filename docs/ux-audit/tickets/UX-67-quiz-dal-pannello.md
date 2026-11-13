# UX-67 · Quiz dal pannello: più quiz, domande nel database, revisione del club

**Ondata:** 8 (giochi dal pannello) · **Stima:** L · **Dipende da:** UX-66 · **Stato:** fatto (13/11/2026)

Richiesta del committente del 13/11/2026, nata dalla conversazione sui minigiochi.

## Problema

Il quiz del Baskin (UX-61) è pronto ma spento: le 40 domande vanno rilette dal club, e stanno nel codice (`@/lib/content/baskinQuiz.ts`). Per correggerne una, approvarla o aggiungerne un'altra serve uno sviluppatore. Il club non può né finire la revisione né fare un quiz suo (Natale, un torneo, la storia della Karibu).

## Decisioni del committente (13/11/2026)

- Il quiz è una **categoria**: dal pannello si creano più quiz, ognuno con le sue domande. Il quiz del Baskin è il primo.
- Il pannello lo gestisce **solo l'admin**.
- Le **statistiche per domanda** stanno nel pannello.
- Il testo **inglese è facoltativo**.
- Niente avviso fisso nel pannello sui nomi degli atleti.
- I tipi di gioco nuovi arrivano sempre dal codice: il pannello crea quiz, non giochi di altro tipo.

## Cosa fare

### 1. Dati (migration)

- `Quiz`: `id`, `slug` (unico), `title`, `description` (una riga), `titleEn?`, `descriptionEn?`, `visibility` (spento · solo tesserati · per tutti, stessi valori di `GameSetting` di UX-66), `position` (ordine delle card), `createdAt`, `updatedAt`.
- `QuizQuestion`: `id`, `quizId` (cascade), `status` (`DRAFT` "in prova" / `APPROVED` "approvata"), `level` (`EASY` / `MEDIUM`), `topic` (elenco chiuso di oggi: ruoli, campo, canestri, storia, club, più `altro` per i quiz nuovi), `text`, tre risposte, `correct` (0-2), `explanation`, `source` (elenco chiuso `QUIZ_SOURCES`, facoltativo), gli stessi campi in inglese **facoltativi** (`textEn?`, risposte, spiegazione), `createdAt`, `updatedAt`, `approvedAt?`.
- `QuizBest`: `userId` (cascade), `quizId` (cascade), `best` (0-5), unico su `(userId, quizId)`. Prende il posto di `User.quizBest`: la migration ci copia i valori esistenti sul quiz del Baskin, poi toglie la colonna.
- `QuizQuestionStat`: `questionId` (cascade), `shown`, `correct`. **Nessuna colonna di persona o dispositivo**, come `PushDailyStat`.
- `GameDailyStat` resta: la chiave `game` diventa `quiz:<slug>` per ogni quiz (le righe vecchie `quiz` valgono per il quiz del Baskin).
- **Le 40 domande di oggi** entrano nel database con la migration (o con uno script una tantum idempotente, documentato nel ticket a lavoro fatto), tutte **in prova**, nel quiz "Quiz del Baskin" con la visibilità che il quiz ha in quel momento in `GameSetting`. Dopo, `baskinQuiz.ts` non è più la fonte delle domande: resta solo `QUIZ_SOURCES`.

### 2. Regole (`@/lib/games/quiz`, con test)

- Una partita resta di **5 domande**, senza tempo, come oggi.
- Nel gioco entrano **solo le domande approvate**. Chi legge in inglese vede solo quelle con il testo inglese completo (domanda, tre risposte, spiegazione); un quiz senza traduzioni sufficienti non compare in inglese.
- **Minimo per accendere un quiz: 8 domande approvate** (contate a parte per l'inglese). Sotto il minimo il pannello non permette di accenderlo e lo dice ("Servono ancora 3 domande approvate"). Se un quiz acceso scende sotto il minimo (una domanda tolta), non si spegne da solo: il pannello lo segnala e il gioco estrae dalle domande che ci sono.
- **Il livello serve all'ordine, non a una quota:** prima le facili, poi le medie. Il quiz del Baskin, con domande in abbondanza, continua a fare 3 facili e 2 medie; un quiz piccolo prende quelle che ha.
- `pickFreshCode` e il `sessionStorage` delle domande già viste restano, per quiz.
- **Sfida un amico:** il link porta il quiz (`/giochi/quiz/<slug>?sfida=<codice>&p=<punteggio>`). Da decidere nel lavoro (vedi "Da decidere").
- `/giochi/quiz` senza slug porta al quiz del Baskin, così i link già condivisi funzionano.

### 3. Pubblico

- In `/giochi` una card per ogni quiz visibile a chi guarda, nell'ordine di `position`, con titolo e descrizione del quiz. Se i quiz accesi diventano tanti si raggruppano: non ora.
- `/giochi/quiz/[slug]`: la partita di oggi (`BaskinQuiz`, `QuizQuestionStep`, `QuizResult`), con titolo del quiz nel `PageHero`. "Scopri di più" solo se la domanda ha un `source`.
- "La tua migliore partita" per quiz, da `QuizBest` (`PUT /api/users/me/quiz-best` riceve anche il quiz).
- Solo tesserati / per tutti / spento si comportano come il quiz di UX-66: anteprima per lo staff, titolo e "Accedi" per chi non è tesserato su un quiz riservato, niente domande nel payload.
- Le domande arrivano al client come oggi (la partita si gioca nel browser); la risposta giusta è nel payload, come oggi: è un gioco, non un esame.
- Sitemap e indicizzazione: i quiz "per tutti", ognuno con il suo indirizzo.

### 4. Pannello `/admin/giochi/quiz` (solo admin)

- **Elenco dei quiz:** titolo, stato in parole, domande approvate su totali ("31 approvate su 40"), partite negli ultimi 30 giorni. "Nuovo quiz" nello slot `action` di `PageHeader`. Riga con `RowActions` (UX-47): azione principale "Domande", nel "⋯" Modifica, Sposta su/giù, Elimina (con conferma; elimina anche domande e statistiche, e lo dice).
- **Un quiz nuovo nasce spento.** Diventa "per tutti" solo con una scelta esplicita e una conferma, come gli album (UX-52).
- **Domande di un quiz** (`/admin/giochi/quiz/[id]`): elenco con filtri per stato (in prova / approvate), livello, argomento e "Da rileggere" (sotto). Ogni riga: testo della domanda, livello, stato, percentuale di risposte giuste. Azione principale "Approva" per le domande in prova, "Modifica" per le approvate; nel "⋯" Rimetti in prova, Elimina.
- **Modulo della domanda** (dialog o pagina): testo, tre risposte con la scelta di quella giusta (gruppo di radio), spiegazione, livello, argomento, "Scopri di più" da `QUIZ_SOURCES` (select con valore vuoto, `displayEmpty`), e una sezione "In inglese (facoltativo)" chiusa di default. Bottoni "Salva" e "Salva e approva". Modificare una domanda approvata non la rimette in prova (la modifica la fa l'admin, che approva).
- **Statistiche per domanda:** quante volte è uscita e quante risposte giuste, in percentuale solo da 20 uscite in su ("n.d." prima). Una domanda sotto il 25% di risposte giuste (con almeno 20 uscite) ha il segno "Da rileggere": troppo difficile o scritta male. Azione "Azzera statistiche" su una domanda dopo averla riscritta.
- Testi solo in italiano (admin). Tutto in `RowActions`, `PageHeader`, target da 44 px su telefono.
- Registro attività: `CREATE_QUIZ`, `UPDATE_QUIZ`, `DELETE_QUIZ`, `CREATE_QUIZ_QUESTION`, `UPDATE_QUIZ_QUESTION` (approvazione compresa), `DELETE_QUIZ_QUESTION`.

### 5. API

- `GET/POST /api/admin/quizzes`, `PUT/DELETE /api/admin/quizzes/[id]`, `GET/POST /api/admin/quizzes/[id]/questions`, `PUT/DELETE /api/admin/quiz-questions/[id]`: solo `isAdminUser()`, schemi Zod in `src/lib/schemas/quiz.ts` (con test: tre risposte non vuote, `correct` 0-2, inglese tutto o niente, `source` dall'elenco chiuso, minimo per accendere), try/catch con `P2002` sullo slug.
- `POST /api/games/quiz/played` riceve il quiz e, per ogni domanda della partita, se la risposta era giusta: aggiorna `GameDailyStat` e `QuizQuestionStat` in una sola transazione con `increment`. È la chiamata che il quiz fa già a fine partita: **nessuna chiamata in più e nessun cron**. Rate limit come oggi; id di domande che non appartengono al quiz ignorati.
- `routeAccess.test.ts`: le rotte nuove a livello admin; `GET` pubblica delle domande (se serve) filtrata per visibilità.

### 6. Il resto

- `/admin/metriche`, sezione "Giochi": partite per quiz.
- Guida (`/guida#giochi`, it + en): "I quiz", non più "Il quiz"; `guide.test.ts` verde.
- `baskinQuiz.test.ts` diventa un test delle regole su dati di prova (le domande non sono più nel codice); resta il controllo che ogni voce di `QUIZ_SOURCES` porti a una pagina e un'ancora esistenti.
- CLAUDE.md, sezione "Giochi del club": domande nel database, pannello, `QUIZ_READY` tolto (da UX-66).

## Da decidere durante il lavoro

- **Sfida un amico con domande che cambiano.** Il codice della sfida è il seme dell'estrazione sulle domande approvate in quel momento: se nel frattempo l'admin ne approva o ne toglie, un link vecchio dà domande diverse. Due strade: (a) accettarlo (è un gioco, il link vale per qualche giorno); (b) il link porta direttamente gli id delle 5 domande. Proposta: **(a)**, salvo che il codice non diventi molto più complicato; con (b) le domande tolte si saltano.

## Com'è stato fatto (13/11/2026)

- **Dati** (migration `20261113180000_quiz_panel`, applicata al DB di sviluppo): `Quiz`, `QuizQuestion` (enum `QuizQuestionStatus`, `QuizLevel`), `QuizBest`. Il quiz del Baskin ha id e slug `baskin` e prende lo stato che aveva in `GameSetting` (la riga `quiz` si cancella); le 40 domande entrano in prova con i testi it/en e gli id di prima (`nato`, `nome`…); le migliori partite passano da `User.quizBest` a `QuizBest`, poi la colonna si toglie; le righe `quiz` di `GameDailyStat` diventano `quiz:baskin`.
- **Differenze dal ticket, decise nel lavoro:** (1) le statistiche per domanda sono due colonne della domanda (`shown`, `correctCount`), non una tabella a parte: stessa regola, nessuna colonna di persona. (2) Il minimo di 8 approvate vale per **accendere**; per **mostrare** un quiz basta una partita intera (5 domande) nella lingua di chi guarda, così un quiz acceso che scende sotto 8 resta giocabile e il pannello lo segnala, e l'inglese si mostra appena ha 5 domande tradotte. (3) L'anteprima dello staff di un quiz spento usa anche le domande in prova, così il club rilegge giocando; l'anteprima non conta partite né salva la migliore. (4) "Sfida un amico": scelta (a), il codice estrae dalle domande approvate in quel momento (ordinate per id).
- **Regole** in `@/lib/games/quizRules` (`playableBank`, `countQuestions`, `canEnableQuiz`, `missingToEnableText`, `isPlayableIn`, `quizAccess`, `quizGameVisibility`, `correctRate`, `needsReview`, `scoreAnswers`; test in `quizRules.test.ts`). `pickRound` di `@/lib/games/quiz` completa con l'altro livello quando un livello non basta (`roundShape`); la chiave delle domande viste è per quiz.
- **Lettura** in `@/lib/games/loadGameSettings`: un solo caricamento in cache (`unstable_cache`, tag `game-settings`) con lo stato dei giochi e l'elenco dei quiz con i conteggi; le domande approvate di un quiz in una seconda voce di cache con lo stesso tag. Lo stato del gioco "quiz" per menu, sitemap e `/giochi` è quello del quiz più aperto con una partita intera.
- **Pubblico:** una card per quiz in `/giochi`; `/giochi/quiz/[slug]` (titolo e descrizione del quiz, inglese con ripiego sull'italiano; per un quiz senza traduzione sufficiente la riga "Questo quiz non c'è ancora nella tua lingua" invece di un 404); `/giochi/quiz` rimanda al quiz del Baskin tenendo `sfida` e `p`; sitemap con un indirizzo per quiz pubblico. I toni del risultato e il messaggio di WhatsApp non parlano più solo di baskin (usano il titolo del quiz).
- **Pannello** (solo admin, sotto la sezione "Giochi"): in `/admin/giochi` la riga dei quiz rimanda a `/admin/giochi/quiz` (`AdminQuizListClient`, `QuizFormDialog`: crea, modifica, chi lo vede con la conferma per "Per tutti", sposta, elimina) e `/admin/giochi/quiz/[id]` (`AdminQuizQuestionsClient`, `QuizQuestionDialog`: filtri per stato, livello e argomento, "Da rileggere", Approva / Modifica in riga, nel "⋯" Rimetti in prova, Azzera statistiche, Elimina). Rotte: `POST /api/admin/quizzes`, `PUT/DELETE /api/admin/quizzes/[id]` (409 sotto il minimo), `POST /api/admin/quizzes/[id]/questions`, `PUT/DELETE /api/admin/quiz-questions/[id]` (con `action` per approva, in prova, azzera); guardia `adminActor()` di `@/lib/apiAuth`; dopo ogni scrittura `afterQuizWrite` svuota la cache e scrive il registro (`CREATE_QUIZ` … `DELETE_QUIZ_QUESTION`). `PUT /api/admin/games/quiz` ora risponde 400.
- **Partita finita:** `POST /api/games/quiz/played` riceve il quiz e le risposte, le ricontrolla sulle sole domande approvate di quel quiz e aggiorna contatori e `GameDailyStat` (`quiz:<id>`). `PUT /api/users/me/quiz-best` riceve il quiz.
- **Verifiche:** `tsc`, lint e `npm test` (2.874) verdi, con i test nuovi di schemi, regole e rotte. Sul server di sviluppo, con una sessione admin di prova: pannello, domande e `/admin/giochi` si aprono; accendere con 0 approvate dà 409, con 8 approvate il quiz si accende; da anonimo `/giochi` ha la card e il quiz contiene le domande approvate e non quelle in prova; in inglese escono i testi inglesi; il vecchio link di sfida rimanda con i parametri; il quiz è in sitemap; una partita finita aggiorna i contatori giusti; un quiz nuovo nasce spento con la domanda in prova, non si accende senza approvate e si elimina con le domande. Dopo le prove i dati sono tornati com'erano (quiz spento, 40 domande in prova, contatori a zero).
- **Non verificato:** il pannello a schermo (provato via HTML e API: la sessione di prova non entra nel browser) e `npm run a11y` (in elenco `/giochi/quiz/baskin`, `/admin/giochi/quiz`, `/admin/giochi/quiz/baskin` per l'admin).

## Criteri di accettazione

- Dopo la migration il quiz del Baskin ha 40 domande in prova e nessuna partita si può giocare finché l'admin non ne approva almeno 8 (lo staff in anteprima vede che cosa manca).
- Un quiz nuovo nasce spento; non si accende sotto le 8 domande approvate, nemmeno chiamando l'API a mano.
- Una domanda in prova non esce mai in una partita; una domanda senza inglese non esce mai in inglese.
- Le statistiche per domanda non hanno nessuna colonna di persona; la percentuale compare solo da 20 uscite.
- I link `/giochi/quiz?sfida=…` già condivisi aprono il quiz del Baskin.
- Le migliori partite salvate prima della migration restano, sul quiz del Baskin.
- Un allenatore e un dirigente non entrano nel pannello dei quiz e le API li rifiutano.
- `npx tsc --noEmit`, `npm test`, `npm run a11y` verdi (pannello dei quiz fra le pagine dell'admin, un quiz pubblico fra quelle anonime).

## Fuori da questo ticket

- Domande con immagini, più di tre risposte, domande a tempo (escluse da UX-61).
- Date di inizio e fine per i quiz di stagione: basta l'interruttore.
- Una stessa domanda in più quiz.
- Classifiche di persone, in qualunque forma.
