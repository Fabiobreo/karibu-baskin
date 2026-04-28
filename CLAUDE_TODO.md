# CLAUDE_TODO.md — Miglioramenti Karibu Baskin

Analisi automatica del codebase. Ordinata per priorità (Alta → Bassa).

---

## 🔴 Alta priorità

### 1. Test — copertura parziale (171 test verdi)
**File:** `src/lib/*.test.ts` e `src/app/api/**/*.test.ts`

Coperti: lib core (`authRoles`, `teamGenerator`, `registrationRestrictions`, `standings`, `slugUtils`, `notifPrefs`, `rateLimit`, `audit`, `appNotifications`) + handler (`registrations`, `teams/[sessionId]`).

Manca ancora:
- ~~Integration test per API route critiche (`POST /api/registrations`, `POST /api/teams/[sessionId]`)~~ ✅ FATTO (diciassettesima sessione)
- ~~Unit test per `audit.ts` e `appNotifications.ts`~~ ✅ FATTO (sedicesima sessione)
- ~~Test per `DELETE /api/registrations/[regId]` (logica auth multi-percorso)~~ ✅ FATTO (diciottesima sessione)
- ~~Test per `GET /api/sessions` e `POST /api/sessions`~~ ✅ FATTO (diciannovesima sessione) — bonus: fix bug `usePagination` sempre true
- ~~Test per `PATCH/DELETE /api/users/[userId]`~~ ✅ FATTO (ventesima sessione) — 19 test: auth, validazione input, SportRoleHistory, push notification, audit log
- ~~Test per `GET/PATCH/DELETE /api/sessions/[sessionId]`~~ ✅ FATTO (ventunesima sessione) — 18 test: lookup ID/dateSlug, 404, trim, date, endTime null, allowedRoles, restrictTeamId, auth, 204
- ~~Test per `GET /api/users` e `POST /api/users`~~ ✅ FATTO (ventiduesima sessione) — 30 test: filtri search/appRole/sportRole/gender, ordinamento, paginazione, validazione email/campi, 409 duplicato; identificato codice morto nel path non-paginato
- Test per componenti UI critici (richiederebbe `@testing-library/react`)

---

### ~~2. Rate limiting sugli endpoint pubblici~~ ✅ FATTO (quindicesima sessione)
Implementato in-memory sliding window rate limiter su `POST /api/registrations` (20 req/min) e `POST /api/push/subscribe` (10 req/min). File: `src/lib/rateLimit.ts`, 8 unit test verdi.

---

## 🟡 Media priorità

### 3. Componenti troppo grandi — refactor
**File:**
- `src/components/AdminPartiteClient.tsx` — ~1130 righe
- `src/components/CalendarClient.tsx` — ~1097 righe
- `src/components/AdminUserList.tsx` — ~1055 righe

Ognuno mescola state management, fetch, logica business e rendering. Estrarre:
- Sub-componenti per sezioni logiche (form, lista, dialog)
- Custom hook per il fetch e lo stato (es. `usePartiteState`, `useCalendarEvents`)

Non va fatto tutto insieme — procedere componente per componente quando si toccano per altre ragioni.

---

### 4. Strategia di caching nelle pagine admin
**File:** `src/app/admin/(dashboard)/*/page.tsx`

Tutte le pagine admin hanno `export const revalidate = 0`, che disabilita completamente la ISR e forza un DB hit per ogni richiesta. Valutare:
- `revalidate = 30` per pagine a bassa volatilità (lista utenti, squadre agonistiche)
- `revalidateTag()` + `revalidatePath()` sulle mutation API per invalidazione selettiva

---

## 🟢 Bassa priorità / Miglioramenti futuri

### 6. Ottimistic updates nelle iscrizioni
**File:** `src/components/RegistrationForm.tsx`

Dopo iscrizione/cancellazione, si aspetta la risposta API prima di aggiornare la UI. Con un optimistic update (aggiornare UI subito, rollback su errore) la risposta percepita sarebbe immediata. Rilevante su connessioni mobili lente.

---

### 7. Paginazione server-side per la lista utenti
**File:** `src/app/api/users/route.ts`, `src/components/AdminUserList.tsx`

Tutti gli utenti vengono caricati in una volta. Con squadre grandi, questo diventa un problema. La paginazione client-side (già presente nel componente) non aiuta perché il payload JSON è già enorme. Aggiungere `skip`/`take` con `cursor` o offset nell'API.

---

### 8. Sentry / error monitoring
**File:** `src/app/error.tsx`, `src/app/global-error.tsx`

Le pagine di errore mostrano feedback visivo ma non tracciano l'errore da nessuna parte. Integrare Sentry (o Vercel Log Drains) per ricevere notifiche sugli errori in produzione senza dover controllare i log manualmente.

---

### 9. Sistema ELO giocatori *(già pianificato)*
**Riferimento:** memory `project_elo_system.md`

ELO nascosto su `User`/`Child` per generare squadre bilanciate negli allenamenti. Visibile solo a COACH/ADMIN. Già identificato come feature futura — annotato qui per completezza.

---

## Note

- I punti **1–2** (test, rate limiting) sono i più importanti per robustezza e sicurezza.
- I punti **3–5** migliorano la manutenibilità e l'esperienza utente senza cambiare funzionalità.
- I punti **6–9** sono quality-of-life, da considerare quando il progetto cresce.
- Priorità di intervento consigliata: affrontare i problemi quando si tocca già il file per un'altra ragione (boy scout rule), non come refactor standalone.
