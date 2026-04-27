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
