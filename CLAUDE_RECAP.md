# CLAUDE_RECAP — run automatica 09:00

**File modificato:** `src/lib/authjs.ts`

**Cosa è stato fatto:** I callback `signIn` e `createUser` di Auth.js usavano `.catch(() => {})` che inghiottiva silenziosamente qualsiasi errore DB (aggiornamento profilo, generazione slug). Sostituiti con `.catch((err) => console.error(...))` — ora gli errori appaiono nei log Vercel. Aggiunto anche un commento esplicativo su `allowDangerousEmailAccountLinking` per evitare che venga rimosso per sbaglio.

**Commit:** `3edbaf3` su `feature/claude-2026-04-28-08`

---

# CLAUDE_RECAP — run automatica (seconda sessione)

**File aggiunti:** `vitest.config.ts`, `src/lib/registrationRestrictions.test.ts`, `src/lib/authRoles.test.ts`, `src/lib/teamGenerator.test.ts`; aggiornato `package.json` (script `test` + `test:watch`).

**Cosa è stato fatto:** Prima infrastruttura test del progetto — installato Vitest, creati 51 unit test per le 3 librerie core senza dipendenze esterne: logica restrizioni iscrizione (27 test), gerarchia ruoli (17 test), generatore squadre deterministico (13 test). Tutti e 51 i test passano al primo tentativo.

**Commit:** da fare su `feature/claude-2026-04-28-08`
