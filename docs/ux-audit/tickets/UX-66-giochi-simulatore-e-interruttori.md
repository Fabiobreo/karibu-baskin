# UX-66 · Giochi: il simulatore fra i giochi e un interruttore per ogni gioco

**Ondata:** 8 (giochi dal pannello) · **Stima:** M · **Dipende da:** UX-61 · **Stato:** fatto (13/11/2026)

Richiesta del committente del 13/11/2026, nata dalla conversazione sui minigiochi.

## Problema

- Il simulatore di sfide (`/squadre/sfida`) è un gioco, ma sta nascosto in fondo a `/squadre` come link secondario. Chi va in `/giochi` non lo trova.
- Quali giochi si vedono lo decide il codice: il quiz si accende solo cambiando `QUIZ_READY` in `@/lib/content/baskinQuiz` e facendo un deploy. Il pronostico e il simulatore sono sempre accesi. Il club non può spegnere o accendere niente da solo.

## Decisioni del committente (13/11/2026)

- Il simulatore va fra i giochi. Lo vedono già solo i tesserati, che vedono comunque tutte le rose: spostarlo non espone niente di nuovo.
- In admin c'è un pannello dei giochi. **Lo gestisce solo l'admin** (non l'allenatore; il dirigente non lo vede).
- I giochi nuovi arrivano sempre prima dal codice; il pannello governa visibilità e contenuti dei giochi che esistono.

## Cosa fare

### 1. Il simulatore in `/giochi`

- La pagina passa da `/squadre/sfida` a **`/giochi/sfida`**, con le stesse regole di oggi: solo tesserati (`isMemberRole`, altrimenti redirect), calcolo sul server (`POST /api/simulator`), nessun `ratingMu`/`ratingSigma` al client.
- `/squadre/sfida` reindirizza in modo permanente a `/giochi/sfida`, **conservando i parametri** (`a`, `b`, `s`): i link di sfide già condivisi devono continuare a funzionare.
- In `/squadre` il link secondario "Simula una sfida" si toglie (oppure punta al nuovo indirizzo: si sceglie in base a come appare la pagina senza; preferenza per toglierlo, il posto dei giochi è `/giochi`).
- In `/giochi` una terza card, solo per i tesserati, con lo stesso modello delle altre (`GameCard`): titolo, una riga che lo presenta come gioco ("Inventa una sfida fra le nostre squadre e guarda come potrebbe andare"), bottone. Mai parole su chi è più forte. Testi in `pages.games` (it + en).
- La pagina tiene `noindex` (rose dei tesserati) e non entra in sitemap. Breadcrumb e `PageHero` come le altre pagine dei giochi.
- La guida (`/guida#giochi`, `@/lib/content/guide.ts`, it + en) cita il simulatore e il suo nuovo posto; `guide.test.ts` verde.

### 2. Un interruttore per ogni gioco

**Dati.** Una tabella `GameSetting` (chiave = gioco, `visibility`, `updatedAt`, `updatedById`), con migration. La riga che manca vale il default del gioco (sotto), così la migration non deve inserire niente e un gioco nuovo nasce col suo default.

**Stati ammessi, per gioco.** Ogni gioco ha un limite che il pannello non può superare. La regola sta in un modulo puro (`@/lib/games/gameSettings`, con test), non nel componente:

| Gioco      | Stati ammessi                       | Default oggi                    | Perché il limite                     |
| ---------- | ----------------------------------- | ------------------------------- | ------------------------------------ |
| Quiz       | spento · solo tesserati · per tutti | spento (come `QUIZ_READY` oggi) | nessuno: il quiz non mostra persone  |
| Pronostico | spento · solo tesserati             | solo tesserati                  | serve un account per salvarlo        |
| Simulatore | spento · solo tesserati             | solo tesserati                  | mostra le rose vere, minori compresi |

- L'API rifiuta ogni combinazione non ammessa (400), per esempio un simulatore "per tutti". Il pannello non la propone nemmeno.
- **Il quiz spento resta visibile ad allenatori e admin in anteprima**, come oggi (riga "Anteprima per lo staff"). Vale anche per gli altri giochi spenti: lo staff deve poterli provare prima di accenderli.
- **Quiz "solo tesserati":** anonimi e ospiti in `/giochi/quiz` leggono il titolo e "Accedi" (come gli album riservati), niente domande nel payload; "Sfida un amico" in questo stato manda un link che funziona solo per i tesserati, e il testo del bottone lo dice.

**Chi legge l'impostazione.** `QUIZ_READY` sparisce: al suo posto una funzione server in cache per richiesta (`loadGameSettings()`), letta da:

- `/giochi` (quali card), `/giochi/quiz`, `/giochi/sfida`, la pagina della partita e la home (pronostico: card e riga "Fai il tuo pronostico"), il profilo ("Pronostici giusti"), le API `GET/PUT /api/matches/[matchId]/prediction` e `POST /api/simulator` (gioco spento = 404 per chi non è staff);
- la voce "Giochi" del menu (`SiteHeader`, sotto "Il Baskin"): c'è se almeno un gioco è visibile a chi guarda;
- sitemap e `noindex` di `/giochi` e `/giochi/quiz`: indicizzate **solo con il quiz "per tutti"**.

Il pronostico spento non cancella i pronostici salvati: smette solo di chiederli e di mostrarli. Riacceso, ricompaiono.

### 3. Pannello `/admin/giochi`

- Voce "Giochi" in `ADMIN_NAV` (`@/lib/adminNav`), solo admin (nessun `director: true`; `requireAdminPage` con il livello admin, `adminNav.test.ts` verde). Titolo `h1` "Giochi".
- Una riga per gioco: nome, una riga di spiegazione, lo stato attuale in parole ("Spento", "Solo tesserati", "Per tutti") e il controllo per cambiarlo (gruppo di radio con i soli stati ammessi). Salvataggio con conferma solo quando un gioco diventa "per tutti".
- Accanto al quiz l'azione "Domande" che porta al pannello del quiz (UX-67). Finché UX-67 non c'è, la riga del quiz ha solo lo stato.
- Una riga di numeri per gioco, presi da `loadGameMetrics` (partite del quiz completate negli ultimi 30 giorni, pronostici delle ultime partite): stessi numeri di `/admin/metriche`, solo per curiosità.
- `PUT /api/admin/games/[game]` (solo `isAdminUser()`), schema Zod, try/catch, registro attività (`UPDATE_GAME_SETTING`, con stato prima e dopo).

## Criteri di accettazione

- `/squadre/sfida?a=…&b=…&s=…` porta a `/giochi/sfida` con gli stessi parametri e la stessa sfida.
- Un ospite e un anonimo non vedono la card del simulatore e `/giochi/sfida` non mostra loro nessuna rosa.
- Dal pannello non si può mettere "per tutti" né il pronostico né il simulatore, nemmeno chiamando l'API a mano.
- Con il quiz spento: niente voce in sitemap, `noindex`, `/giochi/quiz` 404 per chi non è staff, lo staff lo vede in anteprima. Con "per tutti": in sitemap e indicizzato.
- Con il pronostico spento: niente card nella pagina della partita, niente riga in home, la API risponde 404 ai non staff.
- Un allenatore e un dirigente non vedono "Giochi" nel menu del pannello e `/admin/giochi` li rifiuta.
- `routeAccess.test.ts` aggiornato (nuova rotta admin, rotte dei giochi condizionate); `npx tsc --noEmit`, `npm test`, `npm run a11y` verdi (`/giochi/sfida` fra le pagine dell'atleta, `/admin/giochi` fra quelle dell'admin).

## Com'è stato fatto (13/11/2026)

- **Dati:** `GameSetting` + enum `GameVisibility`, migration `20261113120000_game_settings` (applicata al DB di sviluppo). Regole pure in `@/lib/games/gameSettings` (`GAME_RULES`, `resolveGameSettings`, `gameAccess`, `showsGamesInMenu`, `gamesAreIndexable`, test in `gameSettings.test.ts`); uno stato non ammesso salvato nel DB torna al default, mai "per tutti".
- **Lettura:** `loadGameSettings()` (`@/lib/games/loadGameSettings`) è in cache con `unstable_cache` e il tag `game-settings` (5 minuti come rete di sicurezza), svuotata dalla PUT con `revalidateTag(tag, { expire: 0 })`: il layout la legge a ogni pagina per il menu, e senza cache sarebbe una query in più per richiesta. Se il DB non risponde valgono i default.
- **`QUIZ_READY` tolto.** Lo leggono `/giochi` (card per gioco, `notFound` se chi guarda non ne vede nessuno), `/giochi/quiz` (per l'anonimo e l'ospite su un quiz dei tesserati: titolo e "Accedi" o la riga dell'ospite, nessuna domanda nel payload; "Sfida un amico" lo avvisa), `/giochi/sfida`, la pagina partita (`predWindow` a `none` se spento), la home (`ProssimePartiteHome`), il profilo (`PredictionRecordLine`), le API del pronostico e del simulatore (404 se spento, salvo lo staff), il menu (`SiteHeader` riceve `showGames` dal layout), la sitemap e il `noindex` (ora `generateMetadata`).
- **Simulatore:** pagina spostata in `src/app/giochi/sfida/`; `src/app/squadre/sfida/page.tsx` fa `permanentRedirect` tenendo `a`, `b`, `s`; il link di condivisione di `MatchSimulator` punta al nuovo indirizzo. Tolto il link secondario da `/squadre` (e le chiavi `simChallengeTitle`/`simChallengeDesc`). Card "Sfida fra le nostre squadre" in `/giochi`.
- **Pannello:** voce "Giochi" con `adminOnly: true` in `ADMIN_NAV` (campo nuovo: `adminNavFor` la toglie all'allenatore, `requireAdminPage` lo rimanda alla dashboard). `AdminGamesClient`: per gioco un gruppo di radio con i soli stati ammessi, conferma solo per "Per tutti", riga di numeri da `loadGameMetrics`, link "Prova in anteprima" / "Apri il gioco". `PUT /api/admin/games/[game]` (solo admin, `GameSettingUpdateSchema`, 400 sugli stati non ammessi), registro `UPDATE_GAME_SETTING`.
- **Verifiche:** `tsc`, `npm test` (2.840) e lint verdi; nel browser e con richieste al server di sviluppo: rimando di `/squadre/sfida` con i parametri, `/giochi` da atleta, pannello da admin, PUT del simulatore "per tutti" rifiutata, quiz per tutti (in sitemap, indicizzato, card per l'anonimo senza la sfida), quiz dei tesserati (nessuna domanda all'anonimo, `noindex`), quiz spento (404 all'anonimo, anteprima all'admin), simulatore spento (404 all'anonimo, anteprima all'admin), righe nel registro attività. Lasciati i default (quiz spento, gli altri dei tesserati).
- **Non verificato:** `npm run a11y` (le pagine nuove sono nell'elenco: `/giochi/sfida` per l'atleta, `/admin/giochi` per l'admin) e il pannello a schermo da admin (provato via HTML e API).

## Fuori da questo ticket

- Domande e più quiz dal pannello: UX-67.
- Giochi nuovi (per esempio "Componi la squadra"): sempre prima nel codice, con un ticket loro.
