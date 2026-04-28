# CLAUDE_RECAP — run automatica (ventiquattresima sessione)

**File aggiunti:** `src/app/api/notifications/route.test.ts`, `src/app/api/notifications/unread-count/route.test.ts`, `src/app/api/notifications/read-all/route.test.ts`, `src/app/api/notifications/[notificationId]/route.test.ts`

**Cosa è stato fatto:** Aggiunti 25 test per le 4 route del sistema notifiche. `GET /api/notifications`: 10 test — 401 senza auth, paginazione corretta (skip=page-1×limit), clamp limit a 50 e page a 1, filtro NOT sui tipi disabilitati nelle preferenze utente (`mergePrefs`+`CONTROLLABLE_TYPES`), assenza del filtro NOT se tutte le preferenze sono attive, filtro visibilità (OR broadcast/diretto), derivazione `isRead` da `reads.length`, omissione del campo `reads` interno nella risposta, `hasMore` true/false. `GET /api/notifications/unread-count`: 4 test — comportamento speciale senza auth (restituisce `{count:0}` con 200 invece di 401, senza toccare il DB), conteggio corretto per utente autenticato, where clause precisa. `PATCH /api/notifications/read-all`: 4 test — 401 senza auth, `{marked:0}` senza chiamata createMany se non ci sono non lette, createMany con `skipDuplicates:true` per tutti gli ID non letti, where clause broadcast/diretto. `PATCH /api/notifications/[notificationId]`: 6 test — 401, 404, 403 notifica di altro utente, 200 broadcast (targetUserId null), 200 notifica diretta all'utente corrente, upsert idempotente (update:{} vuoto). Suite totale: 268 test (era 243). Tutti verdi. `tsc --noEmit` pulito.

---

# CLAUDE_RECAP — run automatica (ventitreesima sessione)

**File aggiunti:** `src/app/api/children/[childId]/route.test.ts`

**Cosa è stato fatto:** Aggiunti 24 test per `PATCH /api/children/[childId]` e `DELETE /api/children/[childId]` — la route con la logica di CASCADE manuale più critica del progetto (citata esplicitamente in CLAUDE.md). `DELETE` copre: 401 non autenticato, 404 figlio non trovato, 403 non genitore/non staff, 204 successo genitore, 204 successo staff, CASCADE: deleteMany delle iscrizioni prima di eliminare, updateMany per azzerare `teams` nelle sessioni interessate con deduplicazione dei sessionId, assenza di chiamate DB inutili se il figlio non ha iscrizioni. `PATCH` copre: 401, 404, 403, 400 gender/sportRole/linkEmail non validi, 400 nome vuoto dopo trim, aggiornamento dati base con trim nome, link flow (404 utente non trovato, 409 account già collegato ad altro figlio, risposta idempotente se già collegato allo stesso figlio, pending se richiesta già esistente, creazione LinkRequest+notifica in-app+push notification), unlink account. Suite totale: 243 test (era 219). Tutti verdi.

---

# CLAUDE_RECAP — run automatica (ventiduesima sessione)

**File aggiunti:** `src/app/api/users/route.test.ts`

**Cosa è stato fatto:** Aggiunti 30 test per `GET /api/users` e `POST /api/users` — l'endpoint admin lista-utenti con la logica di filtro/ordinamento/paginazione più complessa del progetto. `GET` copre: 403 senza auth admin, risposta paginata (sempre, per via del clamp), skip corretto, clamp limit a 100, clamp page a 1, filtro `search` (OR su nome/email), filtri `appRole`/`sportRole`/`gender` (valore numerico, "none"→null, valori non validi ignorati), ordinamento per tutti i campi (name, sportRole, appRole, createdAt). `POST` copre: 401, email obbligatoria e validazione formato, validazione appRole/gender/sportRole, 409 email duplicata, 201 successo, normalizzazione email in lowercase, appRole GUEST di default, trim nome, creazione con campi opzionali. La scrittura dei test ha anche identificato che il percorso "risposta array non paginata" in `GET /api/users` è **codice morto** (il Math.max(1,…) rende limit ≥ 1, quindi `if (limit > 0)` è sempre vero). Suite totale: 219 test (era 189). Tutti verdi.

---

# CLAUDE_RECAP — run automatica (ventunesima sessione)

**File aggiunti:** `src/app/api/sessions/[sessionId]/route.test.ts`

**Cosa è stato fatto:** Aggiunti 18 test per `GET /api/sessions/[sessionId]`, `PATCH /api/sessions/[sessionId]` e `DELETE /api/sessions/[sessionId]`. Coperti: GET restituisce sessione per ID o dateSlug (OR clause), 404 se non trovata, _count e restrictTeam inclusi; PATCH 401 senza auth, 400 JSON non valido, 400 titolo vuoto (Zod), trim titolo, conversione date, endTime→null, allowedRoles/openRoles, restrictTeamId→null, assenza di campi non inviati nel payload DB, where clause corretta; DELETE 401 senza auth, 204 successo, where clause corretta, body vuoto. Suite totale: 189 test (era 171).

---

# CLAUDE_RECAP — run automatica (ventesima sessione)

**File aggiunti:** `src/app/api/users/[userId]/route.test.ts`

**Cosa è stato fatto:** Aggiunti 19 test per `PATCH /api/users/[userId]` e `DELETE /api/users/[userId]` — la route admin più critica senza copertura. I test verificano: accesso admin-only, validazione input (appRole/gender/sportRole/sportRoleVariant), creazione `SportRoleHistory` solo quando il ruolo cambia davvero, invio push notification al primo assegnamento e agli aggiornamenti, prevenzione auto-eliminazione admin, audit log condizionale. Suite totale: 171 test (era 152).

---

# CLAUDE_RECAP — run automatica (diciannovesima sessione)

**File aggiunti:** `src/app/api/sessions/route.test.ts`
**File modificati:** `src/app/api/sessions/route.ts`

**Cosa è stato fatto:** Scritti 15 test per `GET /api/sessions` e `POST /api/sessions`. La scrittura dei test ha rilevato un **bug reale**: `Math.max(1, 0)` nella logica di paginazione rendeva `usePagination` sempre `true`, lasciando il path non-paginato (risposta array diretta) completamente irraggiungibile — codice morto. Fix: separato `rawLimit` per calcolare il flag prima del clamping. Coperti: GET senza paginazione (array diretto), filtraggio `upcoming=true`, ordinamento, modalità paginata con total/pages, skip corretto, clamp `limit` a 100, clamp `page` a 1; POST: 401 senza auth, 400 JSON invalido, 400 campi mancanti, 201 successo con title trimmed, campi opzionali, notifiche fire-and-forget. Suite totale: 152 test (+15), tutti verdi. `tsc --noEmit` pulito.

**Commit:** `86bc727` su `develop`

---

# CLAUDE_RECAP — run automatica (diciottesima sessione)

**File aggiunti:** `src/app/api/registrations/[regId]/route.test.ts`

**Cosa è stato fatto:** Scritti 12 test per `DELETE /api/registrations/[regId]`, la route di cancellazione iscrizione che aveva zero copertura nonostante la logica di autorizzazione complessa (5 percorsi distinti). Coperti: 404 non trovata, 401 non autenticato, 401 utente non correlato (via userId e via childId), 401 iscrizione anonima senza staff, 204 owner, 204 staff su qualsiasi tipo (incluso anonimo), 204 genitore via childId, 204 account collegato del figlio via childId, 204 genitore via userId, 401 genitore su atleta non figlio. Suite totale: 137 test (+12), tutti verdi.

**Commit:** `64e4842` su `develop`

---

# CLAUDE_RECAP — run automatica (diciassettesima sessione)

**File aggiunti:** `src/app/api/registrations/route.test.ts`, `src/app/api/teams/[sessionId]/route.test.ts`

**Cosa è stato fatto:** Scritti handler test per le due API route critiche segnalate nel TODO come prive di copertura. I test usano `vi.mock` su prisma, auth, rateLimit, apiAuth, webpush e appNotifications per testare la logica del handler in isolamento. `POST /api/registrations`: 13 test (rate limit 429, validazione Zod 400, sessione non trovata 404, sessione terminata 400, iscrizione anonima success/missing-name/duplicate/403-restriction/email-normalize, utente loggato success/duplicate/user-not-found). `POST /api/teams/[sessionId]`: 4 test (401 non autorizzato, 400 nessun iscritto, 200 squadre generate, esclusione coach dall'algoritmo). Suite totale: 125 test (+18), tutti verdi. `tsc --noEmit` pulito.

**Commit:** `d7d4c01` su `develop`

---

# CLAUDE_RECAP — run automatica (sedicesima sessione)

**File aggiunti:** `src/lib/appNotifications.test.ts`, `src/lib/audit.test.ts`

**Cosa è stato fatto:** Scritti unit test per `appNotifications.ts` e `audit.ts` — gli ultimi due lib core senza copertura (citati nel TODO). Entrambi usano Prisma, quindi i test sfruttano `vi.mock('@/lib/db')` per isolare il DB. Testati: payload corretto passato a `prisma.appNotification.create`, conversione `null→undefined` per i campi `before`/`after` in `logAudit`, gestione campi opzionali assenti, propagazione errori DB, e tutte le `AuditAction` valide. Suite totale: 107 test (+9), tutti verdi.

**Commit:** `develop`

---

# CLAUDE_RECAP — run automatica (quindicesima sessione)

**File aggiunti:** `src/lib/rateLimit.ts`, `src/lib/rateLimit.test.ts`
**File modificati:** `src/app/api/registrations/route.ts`, `src/app/api/push/subscribe/route.ts`

**Cosa è stato fatto:** Implementato rate limiter in-memory a sliding window per IP su due endpoint pubblici senza protezione (`POST /api/registrations`, `POST /api/push/subscribe`). Limiti: 20 req/min per iscrizioni, 10 req/min per push subscribe. Risposta 429 con messaggio italiano in caso di superamento. Funzione `getClientIp()` legge `X-Forwarded-For` (header Vercel). Cleanup automatico delle entry scadute. Aggiunti 8 unit test (tutti verdi). Suite totale: 98 test. `tsc --noEmit` pulito.

**Commit:** `47d3bad` su `develop`

---

# CLAUDE_RECAP — run automatica (quattordicesima sessione)

**File modificati:** `src/app/allenamenti/page.tsx`, `src/app/allenamento/[session]/page.tsx`, `src/app/api/teams/[sessionId]/route.ts`, `src/components/AllenamentiClient.tsx`, `src/components/RosterByRole.tsx`, `src/components/SessionCard.tsx`, `src/lib/teamGenerator.ts`, `src/lib/teamGenerator.test.ts`, `src/lib/notifPrefs.test.ts`

**Cosa è stato fatto:** Completata feature parzialmente implementata. I dati `seasonAttended`/`seasonTotal`/`isLoggedIn` erano già fetchati server-side in `allenamenti/page.tsx` ma non renderizzati nel client. Aggiunto banner "Presenze stagione" con `LinearProgress` (colore adattivo: verde ≥75%, arancione ≥50%, giallo sotto). Committati anche tutti i WIP uncommittati trovati: redesign `AllenamentiClient` (hero card per il prossimo allenamento, `SessionRow` raggruppate per mese, chip "Sei iscritto"), redesign `allenamento/[session]/page.tsx` (countdown live, `SummaryCard` per sessioni terminate, layout 2 colonne desktop con form sticky), estrazione `AthletePill` da `RosterByRole`, aggiunta prop `isRegistered` a `SessionCard`, refactoring `teamGenerator` per bande (low R1-R2 / high R3-R5) invece di per-ruolo + fix coaches esclusi dalla generazione. Fix 2 pre-existing bug: TS2352 in `notifPrefs.test.ts`, test `teamGenerator` aggiornato per riflettere le nuove garanzie della distribuzione per fasce. `tsc --noEmit` pulito, 90 test verdi.

**Commit:** `71bc33b` su `develop`

---

# CLAUDE_RECAP — run automatica (tredicesima sessione)

**File aggiunti:** `src/lib/slugUtils.test.ts`, `src/lib/notifPrefs.test.ts`
**File modificati:** `src/lib/slugUtils.ts`

**Cosa è stato fatto:** Rilevato che tutti i test precedenti (67) erano già presenti e verdi. Identificati due lib puri non ancora coperti da test: `slugUtils.ts` e `notifPrefs.ts`. Scritti 23 nuovi test: 14 per `slugify()` e `sessionDateSlug()`, 9 per `mergePrefs()`. I test hanno rivelato **2 bug reali in `slugify()`**: (1) underscore (`_`) veniva rimosso dalla regex `/[^a-z0-9\s-]/g` invece di essere convertito in trattino — fix: aggiunto `_` nella classe di caratteri da mantenere e gestito poi da `[\s_]+`; (2) stringhe con soli caratteri speciali producevano `-` invece di `""` (es. `"!!! ---"` → `"-"`) — fix: aggiunto `.replace(/^-+|-+$/g, "")` in coda. 90 test verdi totali.

**Commit:** su `develop`

---

# CLAUDE_RECAP — run automatica (dodicesima sessione)

**File aggiunti:** `.prettierrc`, `.prettierignore`
**File modificati:** `package.json`, `package-lock.json`, `src/components/AdminPartiteClient.tsx`, `src/components/AdminSquadreClient.tsx`, `src/components/AdminUserList.tsx`, `src/lib/schemas/match.ts`, `src/app/api/matches/[matchId]/callups/route.ts`

**Cosa è stato fatto (commit 1/2):** Committati i cambiamenti pendenti: `window.confirm()` sostituito con Dialog MUI in `AdminPartiteClient` (3 operazioni: elimina partita, elimina avversaria, elimina girone) e `AdminSquadreClient` (elimina squadra) — pattern `openConfirm/closeConfirm` con Dialog riutilizzabile. Aggiunti `aria-label` alle tabelle in `AdminPartiteClient` (5 tabelle) e `AdminUserList` (2 tabelle). Aggiunto Prettier 3.8.3 come devDependency con `.prettierrc` e script `format`/`format:check`. Commit: `50de8fb`.

**Cosa è stato fatto (commit 2/2):** Fix bug reale: `PUT /api/matches/[matchId]/callups` accettava `userIds` e `childIds` come tipo `as { userIds?: string[]; childIds?: string[] }` senza validare che fossero effettivamente array. Se inviato come stringa, il `.map()` iterava i caratteri → righe DB corrotte senza errore visibile. Aggiunto `CallupsSchema` in `src/lib/schemas/match.ts` (array di stringhe non vuote, max 100 elementi per campo) e applicato alla route con pattern `safeParse`. `tsc --noEmit` pulito, 67 test verdi. Commit: `38891c1`.

---

# CLAUDE_RECAP — run automatica (undicesima sessione)

**File aggiunti:** `eslint.config.mjs`
**File modificati:** `package.json`, `package-lock.json`, `src/components/AdminSquadreClient.tsx`, `src/components/RegistrationForm.tsx`, `src/app/admin/(dashboard)/squadre/page.tsx`, `src/app/allenamento/[session]/page.tsx`, `src/app/global-error.tsx`

**Cosa è stato fatto:** Installato ESLint (`eslint` + `eslint-config-next@16.2.3`, che include `eslint-plugin-jsx-a11y`). Creato `eslint.config.mjs` in flat config format (ESLint 9). Aggiunto script `lint` in `package.json`. Fix di bug reali scoperti da ESLint: `react/no-children-prop` — rinominata la prop `children` in `AdminSquadreClient` (→ `childPlayers`) e in `RegistrationForm` (→ `parentChildren`), aggiornati i rispettivi caller; in `global-error.tsx` aggiunti `eslint-disable` per `no-img-element` e `no-html-link-for-pages` (il componente non può usare `next/image`/`next/link` perché sostituisce il root layout). Regole `react-hooks/set-state-in-effect` e `immutability` degradate a warning (pattern usati correttamente). Risultato: `npm run lint` → 0 errori, 23 warning; `tsc --noEmit` pulito; 67 test verdi.

**Commit:** `6ea5bb9` su `develop`

---

# CLAUDE_RECAP — run automatica (decima sessione)

**File aggiunti:** `src/lib/schemas/group.ts`, `src/lib/schemas/child.ts`
**File modificati:** `src/app/api/groups/route.ts`, `src/app/api/groups/[groupId]/route.ts`, `src/app/api/groups/[groupId]/matches/route.ts`, `src/app/api/children/[childId]/route.ts`, `src/app/api/users/me/children/route.ts`

**Cosa è stato fatto:** Completata la validazione Zod sulle ultime 5 route che usavano ancora type assertion `as { ... }`. Fix reali: `gender` accettava qualsiasi stringa (ora solo `"MALE"|"FEMALE"|null`), `linkEmail` non veniva validata come email (ora validata da Zod prima di arrivare al handler), `sportRole` non era limitato a 1-5. Il `GroupMatchCreateSchema` include un `refine()` che cattura `homeTeamId === awayTeamId` prima del DB hit. `tsc --noEmit` pulito, 67 test verdi.

**Commit:** `d333e1d` su `develop`

---

# CLAUDE_RECAP — run automatica (nona sessione)

**File aggiunti:** `src/lib/schemas/competitiveTeam.ts`
**File modificati:** `src/app/api/competitive-teams/route.ts`, `src/app/api/competitive-teams/[teamId]/route.ts`

**Cosa è stato fatto:** Trovato bug reale: `PUT /api/competitive-teams/[teamId]` usava `body.name !== undefined && { name: body.name.trim() }` senza verificare che la stringa non fosse vuota — era possibile salvare un nome squadra `""`. Aggiunto `CompetitiveTeamCreateSchema` e `CompetitiveTeamUpdateSchema` in `src/lib/schemas/competitiveTeam.ts` (Zod v4, pattern `safeParse` coerente col resto della codebase). Rimpiazza la type assertion `as {...}` in entrambe le route. `tsc --noEmit` pulito, 67 test verdi.

**Commit:** `e5e4955` su `develop`

---

# CLAUDE_RECAP — run automatica (ottava sessione)

**File modificati:** `src/components/CalendarClient.tsx`, `src/components/AdminAllenamentiClient.tsx`, `src/components/AdminAnonymousRegistrations.tsx`, `src/components/AdminEventiClient.tsx`, `src/components/AdminPartiteClient.tsx`, `src/components/AdminSessionList.tsx`, `src/components/AdminUserList.tsx`

**Cosa è stato fatto:** Miglioramenti accessibilità (a11y) su tutti i componenti admin. Aggiunti `aria-label` descrittivi a tutti i bottoni icona (`IconButton`) che ne erano privi — prev/next mese nel calendario, kebab menu allenamenti, edit/delete per eventi, partite (con convocati, statistiche, gironi), avversarie, iscrizioni anonime, utenti, figli. Aggiunti `aria-pressed` sui chip filtro in `AdminUserList` (ruolo utente, ruolo Baskin) per comunicare lo stato selezionato agli screen reader. TypeScript `tsc --noEmit` pulito.

**Commit:** `d63debd` su `feature/claude-2026-04-28-08`

---

# CLAUDE_RECAP — run automatica (settima sessione)

**File modificati:** `src/app/api/registrations/route.ts`, `src/lib/schemas/registration.ts`

**Cosa è stato fatto:** `RegistrationPostSchema` era già definito in `lib/schemas/registration.ts` ma non veniva usato — il POST usava `body as { ... }` senza controlli. Applicato il schema al POST e aggiunto `RegistrationPatchSchema` per il PATCH. Rimosso l'import inutilizzato `ROLES` (ora la validazione del range 1-5 è nel schema). 67 test passano, `tsc --noEmit` pulito.

**Commit:** `3ddc97a` su `feature/claude-2026-04-28-08`

---

# CLAUDE_RECAP — run automatica (sesta sessione)

**File modificati:** `src/components/CalendarClient.tsx`, `src/components/AdminPartiteClient.tsx`

**Cosa è stato fatto:** Sostituiti i `CircularProgress` centrati con `Skeleton` MUI nei due punti di caricamento più visibili: la griglia del calendario (42 celle skeleton 7×6 che anticipano il layout reale del mese) e la tabella risultati girone in `AdminPartiteClient` (3 righe skeleton a 6 colonne). Riduce il layout shift e migliora la perceived performance. TypeScript `tsc --noEmit` pulito.

**Commit:** `52470c3` su `feature/claude-2026-04-28-08`

---

# CLAUDE_RECAP — run automatica (quinta sessione)

**File aggiunti:** `src/lib/standings.ts`, `src/lib/standings.test.ts`
**File modificati:** `src/app/gironi/[groupId]/page.tsx`, `src/app/api/groups/[groupId]/route.ts`

**Cosa è stato fatto:** La funzione `computeStandings` (classifica girone Baskin) era duplicata identicamente in due file. Estratta in `src/lib/standings.ts` con tipi condivisi (`StandingEntry`). Aggiunti 16 unit test che coprono il punteggio Baskin V=2/P=1/S=0, tiebreaker goal-difference, flag `isOurs`, e vari edge case. Totale test: 67 (tutti verdi). `tsc --noEmit` pulito.

**Commit:** `13909dc` su `feature/claude-2026-04-28-08`

---

# CLAUDE_RECAP — run automatica (quarta sessione)

**File aggiunti:** `src/app/calendario/error.tsx`, `src/app/squadre/error.tsx`, `src/app/allenamento/[session]/error.tsx`, `src/app/allenamenti/error.tsx`

**Cosa è stato fatto:** Aggiunti error boundary locali per le 4 route pubbliche critiche che mancavano. Prima, un errore Prisma/DB su `calendario`, `squadre` o `allenamenti` crashava l'intera pagina con il fallback 500 generico. Ora ogni route mostra un messaggio contestuale (es. "Calendario non disponibile") con pulsante "Riprova". TypeScript `tsc --noEmit` passa senza errori.

**Commit:** `3f59213` su `feature/claude-2026-04-28-08`

---

# CLAUDE_RECAP — run automatica 09:00

**File modificato:** `src/lib/authjs.ts`

**Cosa è stato fatto:** I callback `signIn` e `createUser` di Auth.js usavano `.catch(() => {})` che inghiottiva silenziosamente qualsiasi errore DB (aggiornamento profilo, generazione slug). Sostituiti con `.catch((err) => console.error(...))` — ora gli errori appaiono nei log Vercel. Aggiunto anche un commento esplicativo su `allowDangerousEmailAccountLinking` per evitare che venga rimosso per sbaglio.

**Commit:** `3edbaf3` su `feature/claude-2026-04-28-08`

---

# CLAUDE_RECAP — run automatica (seconda sessione)

**File aggiunti:** `vitest.config.ts`, `src/lib/registrationRestrictions.test.ts`, `src/lib/authRoles.test.ts`, `src/lib/teamGenerator.test.ts`; aggiornato `package.json` (script `test` + `test:watch`).

**Cosa è stato fatto:** Prima infrastruttura test del progetto — installato Vitest, creati 51 unit test per le 3 librerie core senza dipendenze esterne: logica restrizioni iscrizione (27 test), gerarchia ruoli (17 test), generatore squadre deterministico (13 test). Tutti e 51 i test passano al primo tentativo.

**Commit:** `1c5aaf9` su `feature/claude-2026-04-28-08`

---

# CLAUDE_RECAP — run automatica (terza sessione)

**File aggiunti:** `src/lib/schemas/event.ts`, `src/lib/schemas/session.ts`, `src/lib/schemas/opposingTeam.ts`  
**File modificati:** `src/app/api/events/route.ts`, `src/app/api/events/[eventId]/route.ts`, `src/app/api/sessions/route.ts`, `src/app/api/sessions/[sessionId]/route.ts`, `src/app/api/opposing-teams/route.ts`, `src/app/api/opposing-teams/[id]/route.ts`

**Cosa è stato fatto:** Aggiunta validazione Zod su 6 API route che usavano `as { ... }` senza controlli. Risolto un bug reale: `PUT /api/events/[eventId]` poteva salvare un titolo vuoto se inviato come `"   "` (`.trim()` riduceva a `""`). Pattern ora coerente con `matches/route.ts`. TypeScript `tsc --noEmit` passa senza errori.

**Commit:** `c5ca4df` su `feature/claude-2026-04-28-08`
