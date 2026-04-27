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
