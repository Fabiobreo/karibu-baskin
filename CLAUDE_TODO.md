# CLAUDE_TODO.md — Karibu Baskin

Analisi codebase con priorità d'intervento. Aggiornato automaticamente.

---

## 🔴 CRITICO — Sicurezza

*(nessun item critico aperto)*

---

## 🟡 ALTA PRIORITÀ — Correttezza e struttura

*(nessun item aperto)*

---

## 🟡 MEDIA PRIORITÀ — Performance e QoL tecnico

### M3. **Componenti troppo grandi — refactor incrementale**

- `AdminPartiteClient.tsx` — ~1130 righe
- `CalendarClient.tsx` — ~1097 righe
- `AdminUserList.tsx` — ~1055 righe

**Non fare refactor standalone.** Estrarre sub-componenti e custom hooks quando si toccano per altre ragioni.

---

## 📋 FEATURES PIANIFICATE

### F1. **Stats giocatore aggregate per stagione**

`PlayerMatchStats` esiste partita per partita ma non c'è aggregazione. La pagina `/giocatori/[slug]` non mostra stats.

**Scope:**
- Endpoint `GET /api/users/[userId]/season-stats?season=2025-26` (totale punti, partite giocate, media)
- Stesso per Child
- Widget sulla pagina profilo giocatore pubblico

---

### F2. **Presenza effettiva agli allenamenti**

`Registration` registra l'iscrizione ma non la presenza. Lo staff non sa distinguere "iscritto e venuto" da "iscritto e assente".

**Scope:**
- Campo `attended: Boolean?` su `Registration` (null = non marcato, true/false = presente/assente)
- Toggle COACH/ADMIN nella lista iscritti dell'allenamento
- Contatore presenze sul profilo giocatore

---

### F3. **Notifiche push per singola squadra**

Oggi `sendPushToAll` manda a tutti o solo agli admin. Non c'è modo di notificare solo i membri di una squadra (es. "allenamento annullato per i Gialli").

**Scope:**
- `sendPushToTeam(teamId, payload)` in `src/lib/webpush.ts`
- Usarlo quando un allenamento con `restrictTeamId` viene creato/modificato

---

### F4. **Storico presenze giocatore**

Non c'è pagina che mostra la frequenza agli allenamenti nel tempo. Utile per lo staff per monitorare la regolarità.

**Dipende da:** F2 (presenza effettiva)

**Scope:**
- Sezione "Presenze" nel pannello admin utente (`/admin/utenti/[id]`)
- Eventualmente su profilo pubblico giocatore (visibile solo allo staff)

---

### F5. **Sistema ELO giocatori** *(futuro — già in memory)*

ELO nascosto su User/Child per bilanciare squadre in allenamento. Visibile solo COACH/ADMIN. Da implementare dopo F2 (dati di presenza reale necessari per calibrare).

---

## Note operative

| Categoria | Quando fare |
|---|---|
| 🔴 Critico (S1–S3) | Prima del prossimo push in produzione |
| 🟡 Alta (A1–A5) | Prossimo sprint — nessun prerequisito bloccante |
| 🟡 Media (M1–M5) | Boy-scout rule: quando si tocca il file per altro |
| 📋 Feature (F1–F5) | In ordine: F1 → F2 → F3 → F4 → F5 |

---

## ✅ COMPLETATI

- **M1** Memberships rimosse dal listato SSR `squadre/page.tsx`; `AdminSquadreClient` carica la rosa on-demand via `GET /api/competitive-teams/[teamId]` quando si apre il dialog
- **M2** `GET /api/sessions` convertita a `select` esplicito (esclude `createdAt`/`updatedAt` dal payload lista)
- **M4** `ROLE_LABELS_IT` e `ROLE_CHIP_COLORS` spostati in `constants.ts`; `authRoles.ts` re-esporta per retrocompatibilità
- **M5** `src/app/api/__tests__/flows.test.ts` — 5 test orchestrati: iscrizione anonima→claim, iscrizioni→generazione squadre (×2), link-request accept/reject

- **A1** `z.nativeEnum(MatchType/MatchResult/Gender)` in `schemas/match.ts` e `schemas/child.ts` — rimossi hardcoded string enum
- **A2** `AuditAction` esteso con CREATE/UPDATE/DELETE_TEAM, CREATE/DELETE_MATCH, CREATE/DELETE_EVENT; `logAudit()` aggiunto a 6 route mancanti
- **A3** `src/lib/validators.ts` centralizza `VALID_APP_ROLES`, `VALID_GENDERS`, `VALID_SPORT_ROLES`, `VALID_SPORT_ROLE_VARIANTS`; `users/route.ts` e `users/[userId]/route.ts` aggiornati
- **A4** `.catch(() => {})` → `.catch((err) => console.error(...))` in 6 file (sessions, teams, matches, users, competitive-teams/members)
- **A5** `MatchBaseSchema`, `CompetitiveTeamBaseSchema`, `EventBaseSchema`, `OpposingTeamBaseSchema` — Create/Update derivano da base con `.extend()`

- **S1** Rate limit su GET pubblici: `sessions` (60/min), `matches` + `events` (30/min) — test 429 aggiunti
- **S2** Email enumeration: `children/[childId]` PATCH email-not-found ora risponde `200 { pending: false }` invece di `404`
- **S3** Unsafe JSON cast: `TeamsDataSchema` + `parseTeamsData()` in `schemas/session.ts` — usato in `allenamenti/page.tsx`, `page.tsx`; `AdminSessionList` + `AdminSessionsPanel` tipizzati correttamente
- **#3** Test coverage: tutte le 45 route API coperte (65 file test, 928 test); ultimo gap era `test-login/route.ts`
- **#4** `getCurrentSeason()` centralizzata in `src/lib/seasonUtils.ts` — 4 occorrenze duplicate rimosse
- **#5** Rate limiter: già documentato come best-effort per-replica in `src/lib/rateLimit.ts:2`
- **#7** `revalidate` admin pages: utenti/squadre → 60s, partite/eventi/dashboard → 30s
- **#8** Optimistic updates in `RegistrationForm`: UI si aggiorna immediatamente, rollback su errore API
- **#9** Paginazione server-side: già implementata in API + `AdminUserList` (skip/take + serverTotal)
- **#10** Error monitoring: logging strutturato `{ name, message, digest }` + digest mostrato all'utente in `error.tsx` / `global-error.tsx`
