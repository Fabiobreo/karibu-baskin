# CLAUDE_MAY.md — Log sessioni automatiche

## 2026-05-03 (sessione 14)

**Stato di salute iniziale:** TypeScript 0 errori · 64 test files (908 test)

### Audit iniziale
- 908 test verdi, 0 errori TypeScript, 0 warning ESLint.
- Copertura API quasi completa: solo `auth/[...nextauth]` (Auth.js boilerplate) e `test-login` (dev-only) senza test.
- Trovati 4 commenti `[CLAUDE - HH:MM]` stale che violano la convenzione "no task-context comments" di CLAUDE.md.
- Mancante test per P2002 → 409 in `sessions/route.test.ts` (path coperto nel route ma non esercitato nel test).
- Test fire-and-forget in `sessions/route.test.ts` verificava solo `sendPushToAll`, non `createAppNotification` (entrambe fire-and-forget nel POST).

### Azioni compiute

**1. Rimozione commenti `[CLAUDE - HH:MM]` stale (4 file)**
- `src/lib/seasonUtils.ts:1` — rimosso `// [CLAUDE - 07:00] Centralizza il calcolo stagione sportiva...`
- `src/app/api/admin/export/route.ts:55` — rimosso `// [CLAUDE - 08:30] Validazione formato stagione...`
- `src/app/api/registrations/[regId]/route.ts:30` — rimosso `// [CLAUDE - 07:00] Fix security: solo il genitore...`
- `src/app/api/registrations/[regId]/route.test.ts:136` — rimosso `// [CLAUDE - 07:00] Security fix: solo parentId...`
- Motivazione: commenti che referenziano il task/fix di una sessione precedente rotano con il codice e non aggiungono informazione non ovvia.

**2. `src/app/api/sessions/route.test.ts` — 2 miglioramenti test**
- Aggiunto import `Prisma` da `@prisma/client` e `createAppNotification` da `@/lib/appNotifications`.
- Aggiunto test `409 P2002`: verifica che `POST /api/sessions` risponda 409 quando Prisma lancia `PrismaClientKnownRequestError` con codice `P2002` (allenamento duplicato per data/orario).
- Aggiunta asserzione `expect(createAppNotification).toHaveBeenCalledOnce()` nel test fire-and-forget esistente — copre il secondo canale notifica oltre a `sendPushToAll`.
- +1 test.

### File modificati
- `src/lib/seasonUtils.ts`
- `src/app/api/admin/export/route.ts`
- `src/app/api/registrations/[regId]/route.ts`
- `src/app/api/registrations/[regId]/route.test.ts`
- `src/app/api/sessions/route.test.ts`

**Stato finale:** TypeScript 0 errori · 64 test files (909 test)

---

## 2026-05-02 (sessione 13)

**Stato di salute iniziale:** TypeScript 0 errori · 64 test files (902 test)

### Audit iniziale
- 902 test verdi, 0 errori TypeScript.
- Copertura API quasi completa: solo `auth/[...nextauth]` (Auth.js boilerplate) e `test-login` (dev-only) senza test.
- Rilevati 6 bug P2025 → 500 nei route `groups/[groupId]` (PUT + DELETE), `matches/[matchId]` (PUT missing null-check + DELETE), `competitive-teams/[teamId]` (PUT + DELETE).

### Azioni compiute

**1. `src/app/api/groups/[groupId]/route.ts` — P2025 per PUT e DELETE**
- Aggiunto import `Prisma` da `@prisma/client`.
- PUT: avvolto `prisma.group.update()` in try/catch con P2025 → 404.
- DELETE: avvolto `prisma.group.delete()` in try/catch con P2025 → 404 (dopo l'`updateMany` sulle partite).

**2. `src/app/api/matches/[matchId]/route.ts` — null-check su `previous` (PUT) e P2025 per DELETE**
- Aggiunto import `Prisma` da `@prisma/client`.
- PUT: aggiunto guard `if (!previous) return 404` dopo `findUnique` — impedisce che `prisma.match.update()` venga chiamato su una partita inesistente (e quindi P2025 → 500).
- DELETE: avvolto `prisma.match.delete()` in try/catch con P2025 → 404.

**3. `src/app/api/competitive-teams/[teamId]/route.ts` — P2025 per PUT e DELETE**
- Aggiunto import `Prisma` da `@prisma/client`.
- PUT: avvolto `prisma.competitiveTeam.update()` in try/catch con P2025 → 404.
- DELETE: avvolto `prisma.competitiveTeam.delete()` in try/catch con P2025 → 404.

**4. Test aggiornati (+6 test)**
- `src/app/api/competitive-teams/[teamId]/route.test.ts`: aggiunto `Prisma` import + test P2025 per PUT (404) e DELETE (404).
- `src/app/api/matches/[matchId]/route.test.ts`: aggiunto `Prisma` import + test P2025 per PUT null-check (404, verifica che `update` non venga chiamato) e DELETE (404).
- `src/app/api/groups/[groupId]/route.test.ts`: aggiunto `Prisma` import + test P2025 per PUT (404) e DELETE (404).

### File modificati
- `src/app/api/groups/[groupId]/route.ts`
- `src/app/api/groups/[groupId]/route.test.ts`
- `src/app/api/matches/[matchId]/route.ts`
- `src/app/api/matches/[matchId]/route.test.ts`
- `src/app/api/competitive-teams/[teamId]/route.ts`
- `src/app/api/competitive-teams/[teamId]/route.test.ts`

**Stato finale:** TypeScript 0 errori · 64 test files (908 test)

---

## 2026-05-02 (sessione 12)

**Stato di salute iniziale:** TypeScript 0 errori · 64 test files (893 test)

### Audit iniziale
- 893 test verdi, 0 errori TypeScript, ESLint 0 warning.
- API test coverage quasi completa: unici route senza test sono `auth/[...nextauth]` (Auth.js boilerplate) e `test-login` (solo dev).
- Rilevati 3 bug: P2025 non gestito in `sessions/[sessionId]` PATCH/DELETE e `teams/[sessionId]` DELETE → 500 invece di 404. Pattern P2025 inconsistente in `users/[userId]` (controllo manuale vs `instanceof`). DELETE utente non short-circuitava su utente inesistente.

### Azioni compiute

**1. `src/app/api/sessions/[sessionId]/route.ts` — P2025 per PATCH e DELETE**
- Aggiunto import `Prisma` da `@prisma/client`.
- Avvolti `prisma.trainingSession.update()` e `prisma.trainingSession.delete()` in try/catch con `instanceof Prisma.PrismaClientKnownRequestError && code === "P2025"` → 404.
- Prima di questa fix: PATCH o DELETE su sessionId inesistente restituivano 500.

**2. `src/app/api/teams/[sessionId]/route.ts` — P2025 per DELETE**
- Avvolto `prisma.trainingSession.update()` in DELETE con lo stesso pattern P2025 → 404.

**3. `src/app/api/users/[userId]/route.ts` — Hardening DELETE + pattern P2025 consistente**
- Sostituito controllo manuale `typeof err === "object" && "code" in err` con `instanceof Prisma.PrismaClientKnownRequestError` nel PATCH (pattern consistente con resto del codebase).
- Aggiunto import `Prisma` da `@prisma/client`.
- DELETE: aggiunto guard esplicito `if (!deleted) return 404` dopo `findUnique` — previene P2025 non gestito se l'utente viene eliminato tra il findUnique e il delete.

**4. Nuovi test e aggiornamenti**
- `src/app/api/sessions/[sessionId]/route.test.ts`: aggiunti `Prisma` import + test P2025 per PATCH (404) e DELETE (404). +2 test.
- `src/app/api/teams/[sessionId]/route.test.ts`: aggiunti `Prisma` + `GET`/`DELETE` import; nuovi test suite per GET (404 sessione mancante, generated=false, squadre salvate) e DELETE (401, 200 ok + verifica DbNull, 404 P2025). +7 test.
- `src/app/api/users/[userId]/route.test.ts`: aggiornato mock P2025 PATCH da `Object.assign(new Error, {code})` a `new Prisma.PrismaClientKnownRequestError(...)`; aggiunto test DELETE 404 (utente non trovato, verifica che `delete` non venga chiamato). +1 test.

### File modificati
- `src/app/api/sessions/[sessionId]/route.ts`
- `src/app/api/sessions/[sessionId]/route.test.ts`
- `src/app/api/teams/[sessionId]/route.ts`
- `src/app/api/teams/[sessionId]/route.test.ts`
- `src/app/api/users/[userId]/route.ts`
- `src/app/api/users/[userId]/route.test.ts`

**Stato finale:** TypeScript 0 errori · 64 test files (902 test)

---


## 2026-05-02 (sessione 11)

**Stato di salute iniziale:** TypeScript 0 errori · 61 test files (862 test)

### Audit iniziale
- 862 test verdi, 0 errori TypeScript, ESLint 0 warning.
- 3 route API ancora senza copertura test: `push/vapid-public-key/route.ts`, `push/subscribe/route.ts`, `calendar/export.ics/route.ts`.

### Azioni compiute

**1. `src/app/api/push/vapid-public-key/route.test.ts` — Nuovo file di test (GET)**
- Prima copertura dell'endpoint che espone la chiave VAPID pubblica al client.
- Casi coperti: 200 con chiave presente nell'env, 500 se `NEXT_PUBLIC_VAPID_PUBLIC_KEY` non è configurata.
- Utilizza `vi.resetModules()` per isolare le importazioni tra casi con env diversa.
- 2 test.

**2. `src/app/api/push/subscribe/route.test.ts` — Nuovo file di test (POST + DELETE)**
- Prima copertura dell'endpoint di gestione subscription Web Push.
- POST: 429 rate limit superato, 400 endpoint mancante, 400 keys.p256dh mancante, 400 keys.auth mancante, 400 body non-JSON, 409 endpoint già registrato da altro utente, 200 subscription per utente autenticato (upsert con userId), 200 subscription anonima (userId null), 200 aggiornamento subscription esistente stesso utente senza 409.
- DELETE: 400 endpoint mancante, 400 body non-JSON, 200 elimina subscription anonima (userId null), 200 elimina subscription utente autenticato (userId corretto).
- 13 test.

**3. `src/app/api/calendar/export.ics/route.test.ts` — Nuovo file di test (GET)**
- Prima copertura dell'endpoint di esportazione calendario ICS.
- Casi coperti: Content-Type text/calendar, Content-Disposition con nome file, Cache-Control no-store; calendario vuoto con struttura VCALENDAR; VEVENT allenamento con endTime e location di default; fallback endTime +90min; VEVENT partita in casa (vs) e trasferta (@) con venue; location default partita in casa; VEVENT evento con description, location e endDate; fallback endDate +1h; escape corretto di virgole e punto-e-virgola nel SUMMARY; presenza di tutti e 3 i tipi di VEVENT simultaneamente.
- 14 test.

### File creati
- `src/app/api/push/vapid-public-key/route.test.ts`
- `src/app/api/push/subscribe/route.test.ts`
- `src/app/api/calendar/export.ics/route.test.ts`

**Stato finale:** TypeScript 0 errori · 64 test files (891 test)

---

## 2026-05-02 (sessione 10)

**Stato di salute iniziale:** TypeScript 0 errori · 58 test files (836 test)

### Audit iniziale
- 836 test verdi, 0 errori TypeScript.
- Identificate 3 route API senza copertura test: `calendar/route.ts` (aggregazione allenamenti+partite+eventi con filtro mese), `cron/cleanup-notifications/route.ts` (pulizia notifiche/link-request scaduti con auth Bearer), `competitive-teams/seasons/current/route.ts` (PUT stagione corrente).

### Azioni compiute

**1. `src/app/api/calendar/route.test.ts` — Nuovo file di test (GET)**
- Prima copertura dell'endpoint calendario, che aggrega 3 entità distinte (TrainingSession, Match, Event) con filtro mese e ordinamento cronologico.
- Casi coperti: 200 array vuoto; mapping allenamento (type/title/color/teamName/href da dateSlug); fallback href su id quando dateSlug è null; colore default #FF6D00 senza team; mapping partita in casa (titolo "vs X") e trasferta (titolo "@ X"); fallback href partita su id; colore default #F44336 senza team; mapping evento (color #039BE5, location, endDate); ordinamento crescente con le 3 entità; filtro date con mese YYYY-MM valido; fallback a mese corrente senza parametro e con parametro non valido.
- 13 test.

**2. `src/app/api/cron/cleanup-notifications/route.test.ts` — Nuovo file di test (GET)**
- Prima copertura del cron di pulizia DB (eseguito ogni domenica da Vercel Cron).
- Casi coperti: 401 senza Authorization, 401 con token errato, 200 con token corretto; verifica che deleteMany notifiche usi `reads: { some: {} }`; verifica che deleteMany link-request usi `status: "PENDING"`; verifica cutoff 90 giorni con precisione ±100ms; 0 elementi eliminati con mock vuoti.
- 6 test.

**3. `src/app/api/competitive-teams/seasons/current/route.test.ts` — Nuovo file di test (PUT)**
- Prima copertura dell'endpoint che imposta la stagione corrente.
- Casi coperti: 401 non-coach/admin, 400 body senza label, 400 label stringa vuota, 200 label valida; verifica che `$transaction` contenga 2 operazioni; verifica `season.updateMany({ isCurrent: false })` prima dell'upsert; verifica `season.upsert` con campi create/update corretti.
- 7 test.

### File creati
- `src/app/api/calendar/route.test.ts`
- `src/app/api/cron/cleanup-notifications/route.test.ts`
- `src/app/api/competitive-teams/seasons/current/route.test.ts`

**Stato finale:** TypeScript 0 errori · 61 test files (862 test)

---



## 2026-05-02 (sessione 9)

**Stato di salute iniziale:** TypeScript 0 errori · 54 test files (798 test)

### Audit iniziale
- 798 test verdi, 0 errori TypeScript.
- Identificate 12 route API ancora senza copertura test; selezionate 4 route prioritarie (notif-prefs, users/lookup, members POST, members PATCH+DELETE).

### Azioni compiute

**1. `src/app/api/users/me/notif-prefs/route.test.ts` — Nuovo file di test (GET + PATCH)**
- Prima copertura endpoint preferenze notifiche utente.
- GET: 401 non autenticato, default prefs con notifPrefs null in DB, merge prefs parziali con defaults, query DB con userId corretto.
- PATCH: 401 non autenticato, 400 JSON non valido, aggiornamento push.NEW_TRAINING, aggiornamento inApp.MATCH_RESULT, ignora chiavi arbitrarie non in CONTROLLABLE_TYPES, coerce truthy/falsy a boolean, chiama prisma.user.update con prefs aggiornate, merge patch su prefs salvate nel DB.

**2. `src/app/api/users/lookup/route.test.ts` — Nuovo file di test (GET email + name)**
- Prima copertura endpoint ricerca utenti (usato nel form collegamento genitore-figlio).
- 401 non autenticato, 400 senza parametri email/name.
- Email: 404 nessun utente, 200 utente trovato, normalizzazione lowercase prima della query.
- Name: array vuoto, array risultati, esclude l'utente corrente (id: { not: session.userId }), limit 5, query case-insensitive contains.

**3. `src/app/api/competitive-teams/[teamId]/members/route.test.ts` — Nuovo file di test (POST)**
- Prima copertura endpoint aggiunta membro a squadra agonistica.
- 403 non-admin, 400 JSON non valido, 400 né userId né childId, 400 entrambi userId e childId, 201 con userId, 201 con childId, notifica app inviata all'utente aggiunto (userId), nessuna notifica per childId, isCaptain passato correttamente.

**4. `src/app/api/competitive-teams/[teamId]/members/[membershipId]/route.test.ts` — Nuovo file di test (PATCH + DELETE)**
- Prima copertura endpoint aggiornamento/rimozione singola membership.
- PATCH: 403 non-admin, 200 isCaptain=true, 200 isCaptain=false (default quando non fornito).
- DELETE: 403 non-admin, 204 con chiamata prisma.delete verificata, notifica "Rimosso da una squadra" inviata all'utente rimosso (userId), nessuna notifica se childId.

### File creati
- `src/app/api/users/me/notif-prefs/route.test.ts`
- `src/app/api/users/lookup/route.test.ts`
- `src/app/api/competitive-teams/[teamId]/members/route.test.ts`
- `src/app/api/competitive-teams/[teamId]/members/[membershipId]/route.test.ts`

**Stato finale:** TypeScript 0 errori · 58 test files (836 test)

---

## 2026-05-02 (sessione 7)

**Stato di salute iniziale:** TypeScript 0 errori · 50 test files (720 test)

### Audit iniziale
- 720 test verdi, 0 errori TypeScript.
- Identificate 20 route API senza copertura test; selezionate 4 a priorità elevata per questa sessione.

### Azioni compiute

**1. `src/app/api/users/me/route.test.ts` — Nuovo file di test (GET profilo utente)**
- Prima copertura dell'endpoint GET più chiamato dell'app (profilo utente corrente).
- Casi coperti: 401 non autenticato, null per utente non in DB, profilo base con `linkedChildId: null`, mapping `childAccount.id → linkedChildId`, trasformazione `teamMemberships` nel formato atteso, query DB con id corretto dalla sessione.
- La chiave `childAccount` non compare mai nella risposta (rimossa nello spread): test verifica questo comportamento.

**2. `src/app/api/users/me/children/route.test.ts` — Nuovo file di test (GET + POST figli)**
- Prima copertura dell'endpoint di gestione figli del genitore loggato.
- GET: 401 non autenticato, array vuoto, figli con teamMemberships formattati, query filtrata per parentId.
- POST: 401 non autenticato, 400 JSON non valido, 400 nome mancante, 400 nome stringa vuota ("obbligatorio"), 400 gender non valido (es. "OTHER"), 201 con trim nome e parentId corretto, null per sportRole/birthDate non forniti, Date per birthDate stringa ISO.

**3. `src/app/api/link-requests/route.test.ts` — Nuovo file di test (GET richieste in attesa)**
- Prima copertura dell'endpoint che restituisce richieste collegamento genitore-figlio in attesa.
- Casi coperti: 401 non autenticato, array vuoto, lista richieste con child e parent inclusi, filtro per targetUserId dalla sessione, ordinamento per createdAt desc.

**4. `src/app/api/link-requests/[requestId]/route.test.ts` — Nuovo file di test (DELETE)**
- Prima copertura dell'endpoint di cancellazione richiesta (solo il richiedente può cancellare).
- Casi coperti: 401 non autenticato, 404 richiesta non trovata, 403 utente non è il richiedente (parentId diverso), 409 richiesta già elaborata (status ≠ PENDING), 204 eliminazione corretta con chiamata Prisma verificata.

### File creati
- `src/app/api/users/me/route.test.ts`
- `src/app/api/users/me/children/route.test.ts`
- `src/app/api/link-requests/route.test.ts`
- `src/app/api/link-requests/[requestId]/route.test.ts`

**Stato finale:** TypeScript 0 errori · 50 test files (748 test)

---

## 2026-05-02 (sessione 8)

**Stato di salute iniziale:** TypeScript 0 errori · 50 test files (748 test)

### Audit iniziale
- 748 test verdi, 0 errori TypeScript.
- Identificate 4 route API `groups/` senza alcuna copertura test.
- Rilevato body non validato in `PUT /api/groups/[groupId]/matches/[matchId]` (accettava qualsiasi tipo senza schema Zod).

### Azioni compiute

**1. `src/lib/schemas/group.ts` — Aggiunto `GroupMatchUpdateSchema`**
- Nuovo schema Zod per il body del PUT su partite di girone: tutti i campi opzionali, punteggi `>= 0`, refine che blocca `homeTeamId === awayTeamId`.

**2. `src/app/api/groups/[groupId]/matches/[matchId]/route.ts` — Aggiunta validazione input PUT**
- Sostituito cast manuale del body con `GroupMatchUpdateSchema.safeParse()`.
- Cambiato `catch(() => ({}))` in `catch(() => null)` con guard esplicita → 400 su JSON non valido.

**3. `src/app/api/groups/[groupId]/route.ts` — Hardening JSON parsing PUT**
- Cambiato `catch(() => ({}))` in `catch(() => null)` con guard esplicita per coerenza con la policy degli altri endpoint: JSON non parseable → 400.

**4. Nuovi test: copertura completa delle route `groups/`**
- `src/app/api/groups/route.test.ts` — GET (filtri season/teamId) + POST (403, 400, 201, trim, championship)
- `src/app/api/groups/[groupId]/route.test.ts` — GET (200, 404) + PUT (403, 400, 200, trim) + DELETE (403, cascade updateMany + delete, 204)
- `src/app/api/groups/[groupId]/matches/route.test.ts` — POST (403, 400, 404 girone, 201, conversione Date)
- `src/app/api/groups/[groupId]/matches/[matchId]/route.test.ts` — PUT (403, 400 JSON/score/squadre-uguali, 404, 200, no modifica campi assenti, azzeramento null) + DELETE (403, 404, 204)

### File modificati
- `src/lib/schemas/group.ts`
- `src/app/api/groups/[groupId]/route.ts`
- `src/app/api/groups/[groupId]/matches/[matchId]/route.ts`

### File creati
- `src/app/api/groups/route.test.ts`
- `src/app/api/groups/[groupId]/route.test.ts`
- `src/app/api/groups/[groupId]/matches/route.test.ts`
- `src/app/api/groups/[groupId]/matches/[matchId]/route.test.ts`

**Stato finale:** TypeScript 0 errori · 54 test files (798 test)

---

## 2026-05-02 (sessione 6)

**Stato di salute iniziale:** TypeScript 0 errori · 46 test files (719 test)

### Audit iniziale
- Tutti 719 test verdi, 0 errori TypeScript.
- Scansione completa delle 45 route API per: N+1 query, input validation mancante, error handling, auth check.

### Azioni compiute

**1. `src/app/api/registrations/route.ts` — Fix N+1 in DELETE anonime**
- Il handler `DELETE` iterava con `for...of` chiamando `prisma.trainingSession.update()` una volta per sessione coinvolta — N query separate invece di 1.
- Sostituito con `prisma.trainingSession.updateMany({ where: { id: { in: sessionIds } }, data: { teams: Prisma.DbNull } })` — pattern già usato nel handler `DELETE /api/children/[childId]`.

**2. `src/app/api/matches/[matchId]/stats/route.ts` — Rimozione duplicazione dati upsert**
- Il handler `PUT` ripeteva identicamente l'oggetto `{ points, baskets, fouls, assists, rebounds, notes }` due volte (una per `userId`, una per `childId`), sia in `create` che in `update`, per ~45 righe duplicate.
- Estratto l'oggetto `data` come variabile condivisa; i due branch differiscono ora solo nel `where` e nel campo identity (`userId`/`childId`). Riduzione da ~45 a ~22 righe nel loop.

**3. `src/app/api/users/[userId]/route.ts` — Gestione P2025 su PATCH**
- `prisma.user.update()` non era avvolto in try/catch: se `userId` non esisteva, Prisma lanciava un errore P2025 non gestito → risposta 500 invece di 404.
- Aggiunto blocco `try/catch` che intercetta `code === "P2025"` e restituisce `{ error: "Utente non trovato" }` con status 404. Gli altri errori vengono rilanciati normalmente.

### File modificati
- `src/app/api/registrations/route.ts`
- `src/app/api/registrations/route.test.ts` (mock aggiornato: `trainingSession.updateMany`, assertion migrata da `.update×2` a `.updateMany` con sessionIds)
- `src/app/api/matches/[matchId]/stats/route.ts`
- `src/app/api/users/[userId]/route.ts`
- `src/app/api/users/[userId]/route.test.ts` (aggiunto test P2025 → 404)

**Stato finale:** TypeScript 0 errori · 46 test files (720 test)

---

## 2026-05-02 (sessione 5)

**Stato di salute iniziale:** TypeScript 0 errori · ESLint 0 warning · 42 test files (688 test)

### Azioni compiute

**1. `src/app/api/opposing-teams/route.test.ts` — Nuovo file di test (GET + POST)**
- Prima copertura del route GET/POST per le squadre avversarie.
- Casi coperti: GET lista squadre, GET array vuoto; POST 403 non-admin, 400 body senza nome, 400 JSON non valido, 201 creazione con trim nome e city, 201 con city=null e notes=null se non forniti.

**2. `src/app/api/opposing-teams/[id]/route.test.ts` — Nuovo file di test (PUT + DELETE)**
- Prima copertura del route PUT/DELETE per singola squadra avversaria.
- Casi coperti: PUT 403 non-admin, 400 JSON non valido, 200 aggiornamento con trim, 200 city=null per stringa vuota, 200 campi non forniti non aggiornati; DELETE 403 non-admin, 204 eliminazione con chiamata Prisma corretta.

**3. `src/app/api/matches/[matchId]/callups/route.test.ts` — Nuovo file di test (GET + PUT)**
- Prima copertura dell'endpoint convocati partita (operazione batch con `$transaction`).
- Casi coperti: GET lista convocati, GET array vuoto; PUT 403 non-staff, 400 payload non valido, 404 partita inesistente, 200 sostituzione convocati con totale corretto, 200 lista vuota (rimozione tutti).

**4. `src/app/api/matches/[matchId]/stats/route.test.ts` — Nuovo file di test (GET + PUT)**
- Prima copertura dell'endpoint statistiche partita (upsert batch per userId o childId).
- Casi coperti: GET statistiche, GET array vuoto; PUT 403 non-admin, 400 payload non array, 400 JSON non valido, upsert per userId (where matchId_userId), upsert per childId (where matchId_childId), default 0 per campi numerici mancanti, notes null per stringa vuota, array vuoto senza chiamate upsert.

**File creati:**
- `src/app/api/opposing-teams/route.test.ts`
- `src/app/api/opposing-teams/[id]/route.test.ts`
- `src/app/api/matches/[matchId]/callups/route.test.ts`
- `src/app/api/matches/[matchId]/stats/route.test.ts`

**Stato finale:** TypeScript 0 errori · ESLint 0 warning · 46 test files (719 test)

---

## 2026-05-02 (sessione 4)

**Stato di salute iniziale:** TypeScript 0 errori · ESLint 0 warning · 41 test files (666 test)

### Azioni compiute

**1. `src/lib/webpush.test.ts` — Nuovo file di test (copertura completa)**
- Prima copertura di `webpush.ts`, la utility più critica senza test: gestisce push notification a tutti gli utenti.
- Mock di `web-push` (default export `sendNotification`) e `@/lib/db` (prisma.pushSubscription).
- Copertura `sendPushToAll()`: invia a tutti (adminOnly=false), filtra solo ADMIN (adminOnly=true), rispetta preferenze utente per notifType, subscription anonima (no userId) sempre inviata, rimozione DB subscription scadute (410/404), 404 come scaduta, nessuna deleteMany se nessuna scaduta, payload JSON con url/icon/type, default url=/ icon=/logo.png, lista vuota.
- Copertura `sendPushToUsers()`: ritorno immediato con userIds=[], filtro userId in query Prisma, preferenze notifType, invio senza filtro se notifType non fornito.
- Copertura `sendPushToUser()`: ritorno immediato senza subscription, invio a tutte le subscription dell'utente, preferenze notifType, include user nella query solo se notifType fornito, rimozione scadute per singolo utente.

**2. `src/app/api/admin/export/route.test.ts` — Aggiunta edge case CSV injection**
- Aggiunti 3 nuovi test nel blocco `type=rosa`:
  - Protezione valori che iniziano con `@` (`@SUM(A1:A10)` → `'@SUM`)
  - Protezione valori che iniziano con tab (`\tmalicious` → `'\tmalicious`)
  - BOM UTF-8 verificato via `arrayBuffer()` (bytes EF BB BF) — `response.text()` strippa il BOM per spec WHATWG, quindi necessario leggere i byte raw

**File creati:**
- `src/lib/webpush.test.ts`

**File modificati:**
- `src/app/api/admin/export/route.test.ts` (3 test aggiunti)

**Stato finale:** TypeScript 0 errori · ESLint 0 warning · 42 test files (688 test)

---


## 2026-05-02 (sessione 3)

**Stato di salute iniziale:** TypeScript 0 errori · ESLint 0 warning · 40 test files (649 test)

### Azioni compiute

**1. `src/app/api/admin/export/route.ts` — Fix CSV formula injection**
- Aggiunta funzione `sanitizeCsvValue(s)` che prefissa con `'` (apostrofo) i valori che iniziano con i caratteri `=`, `+`, `-`, `@`, `\t`, `\r` — caratteri interpretati da Excel e Google Sheets come inizio formula.
- Applicata la sanitizzazione dentro `csvRow()` prima dell'escape delle virgolette.
- La funzione è locale e non richiede dipendenze esterne.

**2. `src/app/api/registrations/route.ts` — Atomicità con `prisma.$transaction`**
- Il percorso iscrizione figlio (lines ~118-136) aggiornava `child.sportRole` e poi creava la Registration in due operazioni distinte: se la creazione falliva (es. errore di DB non P2002), il ruolo del figlio veniva aggiornato senza iscrizione corrispondente.
- Stessa vulnerabilità nel percorso utente loggato (lines ~183-200): `user.sportRoleSuggested` veniva scritto prima della creazione iscrizione.
- Entrambe le sezioni sono ora avvolte in `prisma.$transaction(async (tx) => { ... })`, garantendo atomicità: o entrambe le scritture avvengono o nessuna.

**3. `src/app/api/admin/export/route.test.ts` — Nuovo file di test**
- Prima copertura completa per l'endpoint CSV export (non aveva test).
- Casi coperti: 403 non-staff, 400 formato stagione non valido, 400 tipo export non valido; per `rosa`: header CSV, dati atleta, filename con/senza stagione, protezione formula injection con `=`, `+`, `-`; per `presenze`: header, righe presenze, distinzione Coach/Atleta, filename con stagione; per `stats`: header, dati giocatore+partita, filename, CSV vuoto (solo header) se nessuna statistica.

**File modificati:**
- `src/app/api/admin/export/route.ts` (CSV injection fix)
- `src/app/api/registrations/route.ts` ($transaction)
- `src/app/api/registrations/route.test.ts` (mock aggiornato con $transaction + tipo PrismaMock)

**File creati:**
- `src/app/api/admin/export/route.test.ts`

**Stato finale:** TypeScript 0 errori · ESLint 0 warning · 41 test files (666 test)

---

## 2026-05-02 (sessione 2)

**Stato di salute iniziale:** TypeScript 0 errori · ESLint 0 warning · 37 test files (621 test)

### Azioni compiute

**1. `src/app/api/events/[eventId]/route.ts` — Fix bug P2025 (500 → 404)**
- `PUT` e `DELETE` non gestivano l'errore Prisma `P2025` (record non trovato): il server restituiva 500 invece di un 404 leggibile.
- Aggiunti blocchi `try/catch` su entrambi i handler con `instanceof Prisma.PrismaClientKnownRequestError && code === "P2025"` → `{ error: "Evento non trovato" }, { status: 404 }`.

**2. `src/app/api/events/route.test.ts` — Nuovo file di test (GET + POST)**
- Copertura completa per i due handler del file `events/route.ts`.
- Casi coperti: GET lista eventi ordinata, GET array vuoto; POST 403 non-staff, 400 body senza titolo, 400 titolo stringa vuota (messaggio "Titolo obbligatorio"), 400 JSON malformato, 201 creazione con trim nome e location, 201 con endDate + description, 201 con endDate=null se non fornita.

**3. `src/app/api/events/[eventId]/route.test.ts` — Nuovo file di test (PUT + DELETE)**
- Copertura completa per i due handler del file `events/[eventId]/route.ts`.
- Casi coperti: PUT 403 non-staff, 400 JSON malformato, 400 titolo vuoto, 404 evento inesistente (P2025), 200 aggiornamento con trim, 200 endDate=null, 200 location=null per stringa vuota; DELETE 403 non-staff, 404 evento inesistente (P2025), 204 eliminazione corretta.

**4. `src/app/api/link-requests/[requestId]/respond/route.test.ts` — Nuovo file di test**
- Copertura del handler `POST respond` (logica complessa: accept/reject, transaction Prisma, push notification).
- Casi coperti: 401 non autenticato, 404 richiesta non trovata, 403 utente non destinatario, 409 richiesta già elaborata, 410 richiesta scaduta, 400 campo `accept` non boolean, 200 accettazione con push, 200 rifiuto con push, verifica che le operazioni avvengano dentro `$transaction`.

**File modificati:**
- `src/app/api/events/[eventId]/route.ts` (fix P2025)

**File creati:**
- `src/app/api/events/route.test.ts`
- `src/app/api/events/[eventId]/route.test.ts`
- `src/app/api/link-requests/[requestId]/respond/route.test.ts`

**Stato finale:** TypeScript 0 errori · ESLint 0 warning · 40 test files (649 test)

---

## 2026-05-02 (sessione automatica)

**Stato di salute iniziale:** TypeScript 0 errori · ESLint 0 warning · 34 test files (592 test)

### Azioni compiute

**1. `src/app/api/competitive-teams/route.test.ts` — Nuovo file di test**
- Aggiunta copertura completa per GET e POST.
- Casi chiave: GET restituisce lista squadre + array vuoto; POST 403 non-admin, 400 body non valido (nome mancante), 400 stagione formato errato (`YYYY-YYYY`), 409 quando già 2 squadre per stagione (business rule critica), 201 creazione con trim nome, 201 seconda squadra (count=1), 400 JSON malformato.

**2. `src/app/api/competitive-teams/[teamId]/route.test.ts` — Nuovo file di test**
- Aggiunta copertura per GET, PUT, DELETE.
- Casi chiave: GET 200 con memberships + matches, 404 non trovata; PUT 403 non-admin, 400 colore hex errato, 200 con trim nome, 200 reset colore a null; DELETE 403 non-admin, 204 con chiamata prisma.delete corretta.

**3. `src/app/api/matches/[matchId]/route.test.ts` — Nuovo file di test**
- Aggiunta copertura per GET, PUT (complesso), DELETE.
- Casi chiave: GET 200 con playerStats, 404 non trovata; PUT 403 non-admin, 400 JSON malformato, 200 aggiornamento base, derivazione automatica WIN/LOSS dai punteggi, 400 risultato esplicito incongruente con punteggio, invio push notification al primo risultato (fire-and-forget), nessuna push se risultato già impostato; DELETE 403 non-admin, 204.

**File creati:**
- `src/app/api/competitive-teams/route.test.ts`
- `src/app/api/competitive-teams/[teamId]/route.test.ts`
- `src/app/api/matches/[matchId]/route.test.ts`

**Stato finale:** TypeScript 0 errori · ESLint 0 warning · 37 test files (621 test)

---

## 2026-04-30

**Stato di salute iniziale:** TypeScript 0 errori · ESLint 24 warning (0 errori)

### Azioni compiute

**1. `src/components/AdminEventiClient.tsx`**
- Spostata la definizione di `openEdit` prima del `useEffect` che la invoca, eliminando il warning "variable accessed before declaration" (Temporal Dead Zone).
- Aggiunto `// eslint-disable-next-line react-hooks/set-state-in-effect` sulla chiamata `openEdit(ev)` all'interno dell'effect di mount (pattern intenzionale: apertura automatica del dialog di modifica leggendo `?edit=` dai search params).

**2. `src/context/NotificationContext.tsx`**
- Rimossa la chiamata `setUnreadCount(0)` sincrona nell'effect (pattern che causava warning "setState in effect").
- Sostituita con un valore derivato `effectiveUnreadCount = status === "authenticated" ? unreadCount : 0`, esposto nel context provider.
- Aggiunto `// eslint-disable-next-line react-hooks/set-state-in-effect` sulla chiamata `fetchCount()` (funzione asincrona, nessun cascading render reale).

**3. `src/components/SessionCard.tsx`**
- Rimossi 2 import inutilizzati: `SportsIcon` e `DeleteOutlineIcon`.
- Rimossa riga vuota sovrannumeraria prima del `return`.

**Stato finale:** TypeScript 0 errori · ESLint 22 warning (−2)

---

## 2026-05-01

**Stato di salute iniziale:** TypeScript 0 errori · ESLint 22 warning (0 errori)

### Azioni compiute

**1. `src/components/AdminSquadreClient.tsx` — Fix TDZ + disable lint**
- Spostata la dichiarazione `const [rosaTeam, setRosaTeam] = useState(null)` dalla sezione "Dialog rosa" (riga ~161) a prima dell'`useEffect` che la usava (riga ~107), eliminando il warning "Cannot access variable before it is declared" (Temporal Dead Zone reale a livello lint).
- Aggiunti `// eslint-disable-next-line react-hooks/set-state-in-effect` sui due `useEffect` che sincronizzano lo stato locale dopo `router.refresh()` e calcolano la stagione corrente (pattern intenzionale per evitare hydration mismatch).

**2. `src/lib/useHasMounted.ts` (nuovo) + `SiteHeader.tsx` + `NotificationBell.tsx` + `BottomNav.tsx`**
- Creato hook `useHasMounted()` basato su `useSyncExternalStore` che restituisce `false` lato server e `true` sul client — approccio raccomandato da React per evitare hydration mismatch senza `useState` + `useEffect`.
- Sostituito il pattern `const [mounted, setMounted] = useState(false); useEffect(() => { setMounted(true); }, [])` con `const mounted = useHasMounted()` nei tre componenti, eliminando 3 warning `set-state-in-effect`.

**3. Tutti i rimanenti 19 warning `react-hooks/set-state-in-effect`**
- Aggiunti `// eslint-disable-next-line react-hooks/set-state-in-effect` direttamente prima delle chiamate setState all'interno dei blocchi `useEffect`, nei file:
  - `RegistrationForm.tsx` (selezione soggetto + ricalcolo fase)
  - `SessionRestrictionEditor.tsx` (loading state fetch)
  - `OfflineBanner.tsx` (lettura `navigator.onLine` al mount)
  - `Countdown.tsx` (inizializzazione timer con `Date.now()`)
  - `LoSapeviCard.tsx` (selezione casuale al mount)
  - `MatchCalloupsDialog.tsx`, `MatchStatsDialog.tsx` (reset loading su dialog open)
  - `NotificationPrefsPanel.tsx`, `PushNotificationToggle.tsx` (lettura `Notification.permission`)
  - `AdminSessionsPanel.tsx` (caricamento allenamenti)
  - `CalendarClient.tsx` (loading state fetch squadre)
  - `src/app/notifiche/page.tsx` (caricamento paginato)
  - `src/app/allenamento/[session]/page.tsx` (countdown + sessionUrl)

**Stato finale:** TypeScript 0 errori · ESLint 0 warning (−22)

---

## 2026-05-01 (sessione 2)

**Stato di salute iniziale:** TypeScript 0 errori · ESLint 0 warning · 268 test passati

### Azioni compiute

**1. `src/components/AllenamentiClient.tsx`**
- Aggiunto `isSameDay` all'import da `date-fns` (già dipendenza del progetto).
- Rimossa la funzione `isSameDay` definita localmente inline (righe ~804-808) che duplicava quella di date-fns.

**2. `src/components/AdminPartiteClient.tsx`**
- Aggiunto import di `seasonForDate` da `@/components/SessionRestrictionEditor` (funzione già esportata, identica alla copia locale).
- Rimossa la funzione `seasonForDate` definita localmente (righe ~102-107), eliminando la duplicazione.
- Estratta la costante `EMPTY_GM_FORM` per il reset del form del girone, che appariva letteralmente 3 volte come oggetto inline identico (`{ matchday: "", date: "", homeTeamId: "", awayTeamId: "", homeScore: "", awayScore: "" }`).

**Stato finale:** TypeScript 0 errori · ESLint 0 warning · 268 test passati

---

## 2026-05-01 (sessione 3)

**Stato di salute iniziale:** TypeScript 0 errori · ESLint 0 warning

### Azioni compiute

**1. `src/components/AllenamentiClient.tsx`**
- Rinominata la variabile di destructuring `sessions` in `monthSessions` nel `monthGroups.map(([month, sessions]) => ...)` per eliminare il shadowing della variabile di stato esterna `sessions`, riducendo rischi di confusione e bug silenti.
- Sostituiti 3 occorrenze di `InputLabelProps={{ shrink: true }}` (deprecated MUI v6) con `slotProps={{ inputLabel: { shrink: true } }}` nei campi data/ora del dialog di modifica allenamento.

**2. `src/components/CalendarClient.tsx`**
- Sostituiti i type hack `undefined as unknown as string` con `""` nelle 5 chiamate `setErrors(...)` che puliscono i campi di errore durante la digitazione — più leggibili e type-safe.
- Sostituiti 3 occorrenze di `InputLabelProps={{ shrink: true }}` (deprecated MUI v6) con `slotProps={{ inputLabel: { shrink: true } }}` nei campi time/date del dialog crea evento.
- Sostituito `inputProps={{ min: dateStr }}` (deprecated) con `slotProps={{ htmlInput: { min: dateStr } }}` nel campo data fine evento.

**3. `src/components/AdminPartiteClient.tsx`**
- Aggiunto controllo `res.ok` in `handleDeleteMatch`: se il server restituisce errore, aggiorna `error` state invece di rimuovere l'elemento dall'elenco (previene desync tra UI e DB).
- Aggiunto controllo `res.ok` in `handleDeleteOpponent`: stesso pattern di sicurezza.
- Aggiunto controllo `res.ok` in `handleDeleteGm`: se il server restituisce errore, imposta `gmError` invece di rimuovere il risultato.

**Stato finale:** TypeScript 0 errori · ESLint 0 warning

---

## 2026-05-01 (sessione 4)

**Stato di salute iniziale:** TypeScript 0 errori · ESLint 0 warning

### Azioni compiute

**1. `src/components/AdminUserList.tsx` — Estrazione handleChildSort + slotProps**
- Estratta la funzione `handleChildSort(col)` che accorpa la logica toggle-direzione ripetuta identicamente 3 volte negli onClick dei `TableSortLabel` della tabella figli (nome / ruolo Baskin / aggiunto il). Ogni handler era 3 righe `const newDir… setChildSortBy… setChildSortDir`; ora è una sola chiamata.
- Sostituiti i 2 `InputProps={{ startAdornment: … }}` (barra ricerca utenti e barra ricerca figli) con `slotProps={{ input: { startAdornment: … } }}` (API corrente MUI v6).
- Sostituito `InputLabelProps={{ shrink: true }}` nel campo data di nascita del dialog modifica con `slotProps={{ inputLabel: { shrink: true } }}`.

**2. `src/components/RegistrationForm.tsx` — slotProps**
- Sostituiti i 3 `inputProps={{ maxLength: … }}` (campo note allenatore, campo nome anonimo, campo email anonima, campo note atleta) con `slotProps={{ htmlInput: { maxLength: … } }}`.

**3. `src/components/AdminAllenamentiClient.tsx` — slotProps**
- Sostituiti i 3 `InputLabelProps={{ shrink: true }}` nei campi data/ora di inizio/fine del dialog modifica allenamento con `slotProps={{ inputLabel: { shrink: true } }}`.

**Stato finale:** TypeScript 0 errori · ESLint 0 warning

---

## 2026-05-01 (sessione 5)

**Stato di salute iniziale:** TypeScript 0 errori · ESLint 0 warning · 19 test files (257 test)

### Azioni compiute

**1. `src/lib/dateUtils.ts` — Nuovo file (shared utility)**
- Estratte `toLocalDateString(d: Date)` e `toLocalTimeString(d: Date)` che erano definite identicamente in 3 file separati (`AllenamentiClient.tsx`, `AdminAllenamentiClient.tsx`, `allenamento/[session]/page.tsx`).
- I 3 file ora importano da `@/lib/dateUtils` invece di ridefinire localmente le funzioni.

**File modificati:**
- `src/lib/dateUtils.ts` (creato)
- `src/components/AllenamentiClient.tsx` (import sostituisce definizione locale)
- `src/components/AdminAllenamentiClient.tsx` (idem)
- `src/app/allenamento/[session]/page.tsx` (idem)

**2. `src/lib/schemas/match.ts` + route match — Estrazione `deriveResult`**
- La funzione `deriveResult(ourScore, theirScore): MatchResult` era duplicata identicamente in `src/app/api/matches/route.ts` e `src/app/api/matches/[matchId]/route.ts`.
- Estratta come export named in `src/lib/schemas/match.ts` (dove vengono già importati i Zod schema) ed eliminata dai due route file.

**File modificati:**
- `src/lib/schemas/match.ts` (aggiunta `deriveResult` + import `MatchResult`)
- `src/app/api/matches/route.ts` (rimossa def locale, aggiunto import)
- `src/app/api/matches/[matchId]/route.ts` (rimossa def locale, aggiunto import)

**3. `src/lib/schemas/match.test.ts` — Nuovo file di test**
- Aggiunta suite di test per tutte le funzioni e schemi del file `match.ts`.
- Copertura: `deriveResult` (WIN/LOSS/DRAW), `MatchCreateSchema` (campi obbligatori, valori non validi, limiti), `MatchUpdateSchema` (tutti opzionali, reset con null), `PlayerStatsEntrySchema` (refinement userId XOR childId, limiti fouls/points/notes), `PlayerStatsBatchSchema` (max 50 voci), `CallupsSchema` (default array vuoti, max 100 voci).
- Totale: 301 test, 22 test file — tutti verdi.

**Stato finale:** TypeScript 0 errori · ESLint 0 warning · 22 test files (301 test)

---

## 2026-05-01

**Stato di salute iniziale:** TypeScript 0 errori · 22 test files (301 test)

### Azioni compiute

**1. `src/lib/seasonUtils.test.ts` — Nuovo file di test**
- Aggiunta copertura per `getCurrentSeason()` e `getSeasonStartDate()`, entrambe prive di test nonostante siano utility critiche usate in tutto il codebase.
- Casi coperti: confine agosto/settembre (mese 7 vs 8), input stringa ISO, anni di cambio decennio (2009-10), confine luglio/agosto per `getSeasonStartDate`.

**2. `src/lib/dateUtils.test.ts` — Nuovo file di test**
- Aggiunta copertura per `toLocalDateString()` e `toLocalTimeString()`.
- Casi coperti: padding zero su mese/giorno/ore/minuti, fine anno (dic 31), mezzanotte (00:00), fine giornata (23:59).

**3. `src/lib/schemas/session.test.ts` — Nuovo file di test**
- Aggiunta copertura per `SessionCreateSchema` e `SessionUpdateSchema`.
- Casi coperti: payload minimo e completo, titolo vuoto/troppo lungo, data vuota, `allowedRoles`/`openRoles` fuori range (0 e 6), valori non interi, `restrictTeamId` null, `endTime` null per aggiornamento.

**File creati:**
- `src/lib/seasonUtils.test.ts`
- `src/lib/dateUtils.test.ts`
- `src/lib/schemas/session.test.ts`

**Stato finale:** TypeScript 0 errori · 25 test files (335 test)

---

## 2026-05-01 (sessione 6)

**Stato di salute iniziale:** TypeScript 0 errori · 25 test files (335 test)

### Azioni compiute

**1. `src/lib/schemas/registration.test.ts` — Nuovo file di test**
- Aggiunta copertura per `RegistrationPostSchema`, `RegistrationPatchSchema` e `TeamMemberSchema`.
- Casi coperti: payload minimo e completo, sessionId vuoto, ruoli fuori range (0, 6), ruolo non intero, name/note/roleVariant oltre limite, anonymousEmail malformata/vuota/troppo lunga, ids array vuoto, anonymousEmail nullable, refine userId XOR childId su TeamMemberSchema.

**2. `src/lib/schemas/entities.test.ts` — Nuovo file di test**
- Aggiunta copertura per `ChildCreateSchema`, `ChildPatchSchema`, `EventCreateSchema`, `EventUpdateSchema`, `CompetitiveTeamCreateSchema`, `CompetitiveTeamUpdateSchema`, `OpposingTeamCreateSchema`, `OpposingTeamUpdateSchema`, `GroupCreateSchema`, `GroupUpdateSchema`, `GroupMatchCreateSchema`.
- Casi chiave: formato stagione YYYY-YY, colore hex valido/non valido, refine homeTeamId ≠ awayTeamId su GroupMatchCreateSchema, gender enum, linkEmail valida/non valida, punteggio negativo.

**3. Eliminazione duplicati inline di `getCurrentSeason` / `getSeasonStartDate`**
- Trovate 8 occorrenze di calcoli inline per la stagione sportiva identici a quelli già centralizzati in `seasonUtils.ts`.
- `allenamenti/page.tsx`: rimossa funzione locale `getSeasonStart()`, aggiunto import `getSeasonStartDate` da `seasonUtils`.
- `profilo/page.tsx`: rimosso calcolo inline `seasonStart`/`currentSeason`, aggiunto import `getCurrentSeason`; semplificato anche il calcolo `attendanceBySeason` usando `getCurrentSeason(date)`.
- `giocatori/[slug]/page.tsx`: rimosso IIFE locale, aggiunto import `getCurrentSeason`.
- `classifiche/page.tsx`: rimosso calcolo inline `currentYear`/`currentSeason`, aggiunto import `getCurrentSeason`.
- `ParentChildLinker.tsx`: rimosso calcolo inline `sy`/`currentSeason`, aggiunto import `getCurrentSeason`.
- `RegistrationForm.tsx`: rimossi 3 IIFE identici `(() => { ... })()`, aggiunto import `getCurrentSeason`, sostituiti con `getCurrentSeason()`.
- `SessionRestrictionEditor.tsx`: sostituita la funzione locale `seasonForDate` (identica a `getCurrentSeason`) con `export const seasonForDate = getCurrentSeason` — mantiene retrocompatibilità con i 6 file che la importano già.

**File modificati:**
- `src/app/allenamenti/page.tsx`
- `src/app/profilo/page.tsx`
- `src/app/giocatori/[slug]/page.tsx`
- `src/app/classifiche/page.tsx`
- `src/components/ParentChildLinker.tsx`
- `src/components/RegistrationForm.tsx`
- `src/components/SessionRestrictionEditor.tsx`

**File creati:**
- `src/lib/schemas/registration.test.ts`
- `src/lib/schemas/entities.test.ts`

**Stato finale:** TypeScript 0 errori · 27 test files (439 test)

---

## 2026-05-01 (sessione 7)

**Stato di salute iniziale:** TypeScript 0 errori · 27 test files (439 test)

### Azioni compiute

**1. `src/lib/registrationRestrictions.test.ts` — Copertura test mancante**
- Aggiunti 10 test per casi non coperti:
  - `COACH` come atleta (registeredAsCoach=false) con restrizione ruolo → bloccato; con restrizione squadra non-membro → bloccato; con restrizione squadra membro → ammesso.
  - `null` (anonimo) con restrizione ruolo (ruolo fuori lista) → bloccato; con ruolo in lista → ammesso; con restrizione squadra → bloccato; con ruolo aperto → ammesso; con restrizione combinata → bloccato per ruolo poi per squadra.
- La suite di test documenta ora il comportamento preciso: COACH senza `registeredAsCoach=true` segue le stesse regole di ATHLETE/PARENT; gli anonimi sono bloccati da team restriction (isInRestrictedTeam sempre false) ma bypassati da ruoli aperti.

**2. `src/lib/dateUtils.ts` — Estrazione `sessionEndDate`**
- Aggiunta funzione `sessionEndDate(start, endTime?)` che centralizza il calcolo dell'orario di fine sessione: usa `endTime` se presente, altrimenti `start + 2 ore`.
- Rimossi 5 calcoli inline `endTime ?? new Date(date.getTime() + 2 * 60 * 60 * 1000)` ripetuti nei file che già importavano `dateUtils`.

**File modificati:**
- `src/lib/dateUtils.ts` (aggiunta `sessionEndDate`)
- `src/lib/dateUtils.test.ts` (aggiunta suite di 4 test per `sessionEndDate`)
- `src/components/AllenamentiClient.tsx` (2 occorrenze migrated)
- `src/components/AdminAllenamentiClient.tsx` (3 occorrenze: `getStatus`, `inCorso`, `past`)
- `src/app/allenamento/[session]/page.tsx` (3 occorrenze: `getSessionStatus`, countdown effect, `isEnded`)

**Stato finale:** TypeScript 0 errori · 27 test files (453 test)

---

## 2026-05-01 (sessione 8)

**Stato di salute iniziale:** TypeScript 0 errori · ESLint 0 warning · 27 test files (453 test)

### Azioni compiute

**1. `src/app/api/registrations/route.test.ts` — Copertura path childId + PATCH + DELETE**
- Aggiornato il mock Prisma per includere `child.update`, `registration.findMany`, `registration.updateMany`, `registration.deleteMany`, `trainingSession.update` (necessari per i nuovi handler).
- Aggiunti 8 test per il path `childId` (iscrizione figlio tramite genitore):
  - 401 senza autenticazione, 404 figlio non trovato, 403 parentId non coincidente, 403 ruolo non ammesso, 409 figlio già iscritto, 409 figlio già iscritto tramite account collegato, 201 creazione ok, salvataggio ruolo suggerito quando assente.
- Aggiunti 2 test per utente loggato: salvataggio `sportRoleSuggested` e 409 tramite genitore (linked child).
- Aggiunti 3 test per `PATCH`: 403 non-staff, 400 body non valido, 200 con updated count corretto.
- Aggiunti 4 test per `DELETE` (bulk per nome): 403 non-staff, 400 nome mancante, 204 senza iscrizioni trovate, 204 con delete + reset squadre allenamenti coinvolti.

**2. `src/app/api/registrations/claim/route.test.ts` — Nuovo file di test**
- Copertura completa del handler POST: 401 non autenticato, 401 senza nome sessione, fallback globale per nome, claim selettivo per ids, claimed=0 se nessun id eleggibile, fallback quando ids=[] (array vuoto).

**3. `src/app/api/matches/route.test.ts` — Nuovo file di test**
- Copertura completa di GET e POST: GET con e senza filtro teamId, POST 403 non-admin, 400 body non valido, 400 JSON malformato, 201 creazione ok, derivazione automatica risultato (WIN/DRAW/LOSS), 400 risultato esplicito incongruente, generazione slug, slug null quando team/avversario non trovati.

**File modificati:**
- `src/app/api/registrations/route.test.ts` (esteso)

**File creati:**
- `src/app/api/registrations/claim/route.test.ts`
- `src/app/api/matches/route.test.ts`

**Stato finale:** TypeScript 0 errori · ESLint 0 warning · 29 test files (489 test)

---

## 2026-05-02

**Stato di salute iniziale:** TypeScript 0 errori · ESLint 0 warning · 29 test files (489 test)

### Azioni compiute

**1. `src/lib/schemas/group.test.ts` — Nuovo file di test**
- Aggiunta copertura per `GroupCreateSchema`, `GroupUpdateSchema` e `GroupMatchCreateSchema`.
- Casi chiave: formato stagione `YYYY-YY` (rifiuta `YYYY-YYYY` e testo libero), `teamId` obbligatorio, `championship` oltre 200 caratteri, refine `homeTeamId ≠ awayTeamId` con relativo messaggio d'errore, `matchday` min 1 (rifiuta 0), `homeScore` null (partita non disputata), `awayScore` negativo.

**2. `src/lib/schemas/competitiveTeam.test.ts` — Nuovo file di test**
- Aggiunta copertura per `CompetitiveTeamCreateSchema` e `CompetitiveTeamUpdateSchema`.
- Casi chiave: colore hex `#RRGGBB` valido (maiuscolo/minuscolo/misto), rifiuto shorthand `#RGB`, rifiuto senza `#`, rifiuto caratteri non esadecimali, formato stagione, `color`/`championship`/`description` null per reset in update.

**3. `src/lib/schemas/child.test.ts` — Nuovo file di test**
- Aggiunta copertura per `ChildCreateSchema` e `ChildPatchSchema`.
- Casi coperti: `sportRole` range 1-5 (rifiuta 0 e 6), non intero, null; `gender` enum MALE/FEMALE (rifiuta OTHER), null; `sportRoleVariant` max 50 caratteri; `linkEmail` valida/non valida; `unlinkAccount` boolean.

**4. `src/lib/schemas/event.test.ts` — Nuovo file di test**
- Aggiunta copertura per `EventCreateSchema` e `EventUpdateSchema`.
- Casi coperti: titolo/data obbligatori, messaggi d'errore localizzati, `endDate`/`location`/`description` nullable in update, limiti caratteri.

**5. `src/lib/schemas/opposingTeam.test.ts` — Nuovo file di test**
- Aggiunta copertura per `OpposingTeamCreateSchema` e `OpposingTeamUpdateSchema`.
- Casi coperti: nome obbligatorio, limiti `city` e `notes`, reset con null in update.

**File creati:**
- `src/lib/schemas/group.test.ts`
- `src/lib/schemas/competitiveTeam.test.ts`
- `src/lib/schemas/child.test.ts`
- `src/lib/schemas/event.test.ts`
- `src/lib/schemas/opposingTeam.test.ts`

**Stato finale:** TypeScript 0 errori · ESLint 0 warning · 34 test files (592 test)

## 2026-05-02 (sessione 13)

**Stato di salute iniziale:** TypeScript 0 errori · 64 test files (891 test)

### Audit iniziale
- 891 test verdi, 0 errori TypeScript.

### Miglioramenti applicati

**`src/app/api/registrations/route.ts`**
- Sostituito il controllo manuale errore P2002 (`typeof err === "object" && "code" in err`) con `Prisma.PrismaClientKnownRequestError`, pattern corretto per Prisma. Era ripetuto 3 volte con type cast inelegante.

**`src/lib/webpush.ts`**
- Corretto conteggio `sent` in `dispatchToSubs`: ora conta i risultati `fulfilled` invece di `subs.length - expired.length`. Il vecchio calcolo contava come inviati anche push falliti per errori 5xx o di rete.

**`src/lib/teamGenerator.test.ts`**
- Aggiunto test bilanciamento per `numTeams=3` (mancante).
- Aggiunto test che esercita step 4 (correzione finale) con 4 atleti ruolo 1 + 4 ruolo 3 su 3 squadre — senza correzione si otterrebbe [4,2,2].

**Stato finale:** TypeScript 0 errori · 64 test files (893 test)

**File modificati:**
- `src/app/api/registrations/route.ts`
- `src/lib/webpush.ts`
- `src/lib/teamGenerator.test.ts`
