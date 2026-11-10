# UX-61 · Giochi del club: quiz del Baskin e pronostico della partita

**Ondata:** 7 (engagement) · **Stima:** L (quiz M, pronostico M: si possono fare in due PR) · **Dipende da:** UX-55, UX-56 · **Stato:** da fare · **In attesa di:** decisione sui nomi nel pronostico (punto 3.5)

Richiesta del committente del 06/11/2026 (piano di engagement). Sostituisce la vecchia UX-61 (email settimanale), tolta dal committente lo stesso giorno per non uscire dal piano gratuito di Resend.

## Perché

Per divertirsi. Precisazione del committente (06/11/2026): **non tutto deve servire a portare gente sul sito**. I giochi sono prima di tutto una cosa bella da fare per atleti, famiglie e amici del club; se poi riportano qualcuno sulla pagina di una partita o insegnano il baskin a un nonno, meglio, ma non è il criterio con cui si giudicano.

Quello che conta è che:

- siano divertenti e a tema club (il baskin, le nostre squadre, le nostre partite);
- si giochino anche da chi legge poco, ha tempi lunghi o usa il lettore di schermo;
- nessuno si senta escluso o messo in fila dietro agli altri.

## Regole valide per tutti i giochi

- **Niente tempo e niente riflessi.** Nessun conto alla rovescia, nessun punteggio legato alla velocità: escluderebbero proprio una parte degli atleti (WCAG 2.2.1).
- **Niente classifiche di persone.** Si mostrano solo i risultati personali e dati aggregati ("12 persone su 40 ci hanno preso"). Mai una classifica dei bambini. L'unica eccezione possibile è il punto 3.5, da decidere.
- **Linguaggio facile** (UX-17): frasi brevi, una domanda per schermata, spiegazione dopo ogni risposta.
- **Tutto da tastiera e lettore di schermo:** scelte come gruppi di radio veri (`RadioGroup`), esito annunciato con `aria-live="polite"`, target da 44 px, tema chiaro e scuro.
- **Niente nuovi tracciamenti.** Le partecipazioni si misurano dal database (punto 4).
- Testi pubblici in `it.json` ed `en.json` (namespace `pages.games`), contenuti in `@/lib/content/` con `getXxx(locale)` come `faqs.ts`.

## Cosa fare

### 1. Sezione `/giochi`

- Pagina pubblica di contenuto: `PageHero` colonna `main`, titolo "Giochi", sottotitolo di una riga. Due card contornate (`RADIUS.lg`), una per gioco, con icona, nome, una riga di spiegazione e un bottone. La card del pronostico appare solo se c'è una partita aperta al pronostico (punto 3), altrimenti dice "Il prossimo pronostico apre con la prossima partita" senza bottone.
- In menu: voce "Giochi" sotto "Il club", **non** nella barra in basso (le cinque voci restano per le cose da fare). In home nessuna sezione fissa: una riga nella sezione partite quando un pronostico è aperto (punto 3.4).
- In `/guida` un capitolo breve "Giochi" con l'ancora `#giochi` nelle due lingue (`guide.test.ts`).

### 2. Quiz del Baskin (aperto a tutti, anche senza account)

**Contenuti** (`@/lib/content/baskinQuiz.ts`, `getBaskinQuiz(locale)`):

- una banca di 30-40 domande, ognuna con: testo, 3 risposte (non di più: meno carico di lettura), indice di quella giusta, **spiegazione** di due righe, livello (`facile` / `medio`), argomento (`ruoli`, `campo`, `canestri`, `club`) e un `source` facoltativo che indica la voce di `/il-baskin` o di `loSapevi.ts` da cui viene, con il link "Scopri di più";
- le domande sul club (storia, valori) usano i testi di `home.storia` / `home.values` senza copiarli (regola di UX-36b): la spiegazione rimanda a `/il-club`;
- test in `baskinQuiz.test.ts`: stesso numero di domande e stessi id nelle due lingue, ogni domanda ha 3 risposte e un indice valido, ogni `source` esiste.
- **Revisione del club:** le domande le controlla il committente prima di andare online (bandiera `QUIZ_READY` come in UX-63).

**Partita** (`/giochi/quiz`, Client Component):

- 5 domande estratte a caso (prima 3 facili, poi 2 medie), una per schermata. Si sceglie, si preme "Conferma", compare subito l'esito ("Giusto!" / "Non proprio") con la spiegazione e "Avanti". Nessun limite di tempo, si può tornare indietro a rileggere una spiegazione.
- Esito con un secondo segnale oltre al colore (icona e parola, WCAG 1.4.1); il verde/rosso qui è valenza, quindi ammesso da UX-29 (`success`/`error`).
- Alla fine: "Hai risposto bene a 4 domande su 5", le spiegazioni delle risposte sbagliate da rileggere, "Gioca ancora" (5 domande nuove, senza ripetere quelle appena fatte finché la banca non è finita, lista in `sessionStorage` dentro try/catch) e "Sfida un amico" (punto 2.1).
- Chi è tesserato e ha fatto l'accesso vede anche "La tua migliore partita: 5 su 5" (punto 4). Chi non ha un account gioca uguale, senza salvare niente.
- Il punteggio non è mai "basso": lo 0 su 5 si dice "Adesso sai 5 cose nuove sul baskin", con le spiegazioni.

**2.1 Sfida un amico.** Il bottone condivide con `ShareSection` (UX-56) un link `/giochi/quiz?sfida=<codice>`, dove il codice (corto, generato nel browser) è il seme delle 5 domande: chi apre il link fa **le stesse domande** e alla fine legge "Chi ti ha sfidato ha risposto bene a 4 su 5" solo se il punteggio è nel link (`&p=4`, scelto da chi condivide; nessun nome). Estrazione deterministica con il PRNG Mulberry32 già in `@/lib/season/teamGenerator` (estrarlo in un modulo comune se serve). Testo di WhatsApp: "Quanto ne sai di baskin? Io ho fatto 4 su 5, prova tu". UTM `campaign: "quiz"`.

### 3. Pronostico della partita (solo tesserati)

**3.1 Quali partite.** Le partite ufficiali di una nostra squadra contro un'avversaria (campionato, amichevoli, tornei), **non** le amichevoli interne fra due squadre nostre. Il pronostico apre 3 giorni prima della partita e chiude all'orario d'inizio (`hasStarted` di `@/lib/matches/matchPhase`). Regola pura `predictionWindow(match, now)` in `@/lib/games/prediction.ts`, con test.

**3.2 Cosa si pronostica.** Una sola domanda, facile: **chi vince** (noi / pareggio / loro). Facoltativo, sotto: "E il punteggio?" con due campi numerici, per chi vuole. Niente pronostici sui singoli giocatori (marcatori, MVP): metterebbero dei ragazzi al centro di una scommessa.

**3.3 Dati.**

- Modello `MatchPrediction`: `id`, `matchId` (cascade), `userId` (cascade), `outcome` (`WIN` / `DRAW` / `LOSS`, riusare l'enum del risultato se esiste), `ourScore?`, `theirScore?`, `createdAt`, `updatedAt`. Unico su `(matchId, userId)`. Migration.
- Un pronostico per **account**, non per famiglia: un genitore e un figlio con account pronosticano ciascuno il suo. I figli senza account non pronosticano (non hanno un accesso).
- `PUT /api/matches/[matchId]/prediction` (solo `isMember()`, 409 fuori dalla finestra, schema Zod in `src/lib/schemas/prediction.ts` con test, try/catch su Prisma, rate limit). `GET` della stessa rotta: il proprio pronostico e, **solo dopo l'inizio**, i totali aggregati. Prima dell'inizio i totali non si mostrano, per non influenzare.
- Livello stimato e probabilità di vittoria **mai** nella pagina del pronostico (regola TrueSkill di CLAUDE.md: niente numeri di rating a chi non è staff, e un "favorito" calcolato rovinerebbe il gioco).

**3.4 Dove si gioca.**

- Nella pagina della partita futura (`/partite/[slug]`), sotto "Dove e quando": card "Il tuo pronostico" con i tre bottoni (gruppo di radio) e "Salva". Dopo il salvataggio: "Hai detto: vinciamo noi. Puoi cambiarlo fino al fischio d'inizio."
- In home, nella sezione partite, sulla card della prossima partita una riga "Fai il tuo pronostico" se il tesserato non l'ha ancora fatto (dato aggiunto a `loadHomeCallupStatus` o in una funzione vicina in cache per richiesta, dentro il `Promise.all` della home).
- **Nessuna notifica dedicata.** I promemoria di partita sono già molti; il pronostico si propone dove l'utente già guarda. Se UX-55 mostra che le aperture lo permettono, se ne riparla.

**3.5 Dopo la partita.**

- Nella pagina della partita giocata, nella sezione "Per te" di UX-58 (o sotto il tabellino se UX-58 non è ancora fatto): "Avevi detto: vinciamo noi. Ci hai preso!" e, per chi aveva messo il punteggio, quanto ci è andato vicino. Per tutti i tesserati: "28 persone hanno fatto il pronostico: 20 hanno detto vittoria, 5 pareggio, 3 sconfitta."
- Nel profilo, nella stagione: "Pronostici giusti: 7 su 10". Solo personale.
- **Decisione aperta per il committente:** mostrare anche i nomi di chi ha indovinato il punteggio esatto?
  - **A.** No, solo numeri. (Raccomandata: nessun problema con i minori, nessuna gara.)
  - **B.** Sì, solo adulti tesserati e solo fra i tesserati ("Hanno indovinato il punteggio esatto: Paolo, Giulia"), con `publicSubjects` per togliere i minori.

**3.6 Niente premi in denaro o scommesse.** Il pronostico è un gioco senza posta: nessuna vincita, nessun premio legato all'esito (un premio richiederebbe le regole dei concorsi a premio). Se il club vuole un riconoscimento, è un traguardo (UX-59: "Indovino", 5 pronostici giusti in una stagione), da aggiungere solo dopo la decisione del punto 3.5.

### 4. Quanto si gioca (solo per curiosità)

Un contatore leggero, per sapere se i giochi piacciono e quale domanda del quiz è troppo difficile: **non** è un obiettivo e non decide se un gioco resta.

- In `/admin/metriche` (UX-55), una riga "Giochi": partite del quiz completate e quante persone hanno fatto il pronostico per ogni partita. Contatore aggregato `GameDailyStat` (`day`, `game`, `plays`, senza `userId`), incrementato da `POST /api/games/quiz/played` con rate limit.
- La "migliore partita" personale del quiz si salva su `User.quizBest Int?` (migration) solo per chi ha l'accesso, con `PUT /api/users/me/quiz-best` che accetta solo un numero da 0 a 5 e salva solo se più alto.

## Criteri di accettazione

- Il quiz si completa da telefono (390 px), solo con la tastiera e con TalkBack/VoiceOver: ogni domanda è annunciata, l'esito è letto dopo "Conferma".
- Nessun elemento a tempo in nessuna pagina dei giochi.
- Due persone che aprono lo stesso link di sfida ricevono le stesse 5 domande; un codice inventato produce comunque 5 domande valide.
- Il pronostico si salva fino all'orario d'inizio e dopo risponde 409; prima dell'inizio i totali non sono nel payload della pagina né della GET.
- Un GUEST e un anonimo non vedono la card del pronostico (al suo posto la riga "Accedi per fare il tuo pronostico" per l'anonimo; niente per l'ospite, che vede "Lo potrai fare quando lo staff conferma il tuo account").
- Le amichevoli interne non hanno il pronostico.
- Nessun livello stimato, probabilità o "favorito" nella pagina del pronostico.
- Nessuna classifica di persone; con la scelta A del punto 3.5 nessun nome compare nei risultati dei pronostici.
- `baskinQuiz.test.ts`, `prediction.test.ts`, test dello schema, `routeAccess.test.ts` aggiornato; `npx tsc --noEmit`, `npm test`, `npm run a11y` (con `/giochi` e `/giochi/quiz` aggiunte alle pagine misurate) verdi.

## Fuori da questo ticket

- Altri giochi solo per divertimento (vedi le proposte nella risposta al committente del 06/11/2026): un ticket a parte quando il committente li sceglie.
- Giochi per lo staff o in palestra (sono attività, non siti).
