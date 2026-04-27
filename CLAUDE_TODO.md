# CLAUDE_TODO.md — Miglioramenti Karibu Baskin

Analisi automatica del codebase. Ordinata per priorità (Alta → Bassa).

---

## 🔴 Alta priorità

### 1. Test — copertura zero
**File:** tutta la directory `src/`

Non esiste nessun file di test. Aggiungere almeno:
- Unit test per `src/lib/registrationRestrictions.ts` — logica critica per ammissione agli allenamenti
- Unit test per `src/lib/teamGenerator.ts` — algoritmo deterministico, testabile facilmente
- Unit test per `src/lib/authRoles.ts` — helper `hasRole()` e gerarchia ruoli
- Integration test per le API route critiche (`POST /api/registrations`, `POST /api/teams/[sessionId]`)

Stack suggerito: **Vitest** (compatibile con Next.js App Router, veloce) + **@testing-library/react** per componenti.

---

### 2. Validazione input nelle API route ✅ COMPLETATO
**Tutte le route ora validate con Zod:** events, opposing-teams, sessions, registrations, competitive-teams, groups (POST/PUT), groups/matches (POST), children/[childId] (PATCH), users/me/children (POST)

---

### 3. Rate limiting sugli endpoint pubblici
**File:** `src/app/api/registrations/route.ts`, `src/app/api/push/route.ts`

Nessun rate limiting. Un utente può inviare centinaia di iscrizioni o subscribe push in loop. Soluzione semplice con Vercel: aggiungere `@vercel/kv` + sliding window, oppure usare middleware Vercel Edge con `next-rate-limit`.

---

## 🟡 Media priorità

### 4. Componenti troppo grandi — refactor
**File:**
- `src/components/AdminPartiteClient.tsx` — ~1116 righe
- `src/components/CalendarClient.tsx` — ~1097 righe
- `src/components/AdminUserList.tsx` — ~1055 righe

Ognuno mescola state management, fetch, logica business e rendering. Estrarre:
- Sub-componenti per sezioni logiche (form, lista, dialog)
- Custom hook per il fetch e lo stato (es. `usePartiteState`, `useCalendarEvents`)

Non va fatto tutto insieme — procedere componente per componente quando si toccano per altre ragioni.

---

### 5. Strategia di caching nelle pagine admin
**File:** `src/app/admin/(dashboard)/*/page.tsx`

Tutte le pagine admin hanno `export const revalidate = 0`, che disabilita completamente la ISR e forza un DB hit per ogni richiesta. Valutare:
- `revalidate = 30` per pagine a bassa volatilità (lista utenti, squadre agonistiche)
- `revalidateTag()` + `revalidatePath()` sulle mutation API per invalidazione selettiva

---

### 6. Accessibilità (a11y)
**File:** `src/components/AdminPartiteClient.tsx`, `src/components/CalendarClient.tsx`

Solo 18 attributi `aria-*` nell'intero codebase. Problemi concreti:
- Dialog di conferma eliminazione senza `aria-labelledby` / `aria-describedby`
- Tabelle admin senza `caption` o `aria-label`
- Bottoni icona senza `aria-label` (es. bottone matita di modifica nel calendario)
- I chip dei filtri in `AdminUserList` non comunicano lo stato selezionato (`aria-pressed`)

---

### 7. Gestione errori nei callback auth (fire-and-forget)
**File:** `src/lib/authjs.ts` — callback `signIn` (riga ~49)

Il salvataggio di `name` e `image` al login è fire-and-forget: se fallisce, nessuno lo sa. Aggiungere almeno un `console.error` per rendere il fallimento visibile nei log Vercel.

---

### 8. Error boundary mancanti nelle pagine pubbliche
**File:** `src/app/allenamento/[session]/`, `src/app/calendario/`, `src/app/squadre/`

Esiste `src/app/error.tsx` globale ma mancano `error.tsx` locali per i route segment critici. Un errore in fetch dati del calendario crasha l'intera app invece di mostrare un messaggio contestuale.

---

### 9. Loading skeleton nelle liste admin
**File:** `src/components/AdminUserList.tsx`, `src/components/AdminPartiteClient.tsx`

Il caricamento mostra un `CircularProgress` centrato. Sostituire con skeleton MUI (`<Skeleton variant="rectangular">`) per ridurre il layout shift e migliorare la perceived performance. Già disponibile in MUI senza dipendenze extra.

---

### 10. `allowDangerousEmailAccountLinking` — documentare il rischio
**File:** `src/lib/authjs.ts` — riga ~18

L'opzione è intenzionale (per collegare utenti pre-creati dall'admin), ma non è documentata inline. Aggiungere un commento che spiega il motivo, così chi legge il codice non la toglie per "sicurezza".

---

## 🟢 Bassa priorità / Miglioramenti futuri

### 11. ESLint + Prettier ✅ COMPLETATO (parziale)
**File:** `eslint.config.mjs`, `package.json`

Installato `eslint` + `eslint-config-next@16.2.3` (include `jsx-a11y`). Creato `eslint.config.mjs`. Script `lint` in package.json. 0 errori, 23 warning. Prettier non ancora configurato.

---

### 12. Ottimistic updates nelle iscrizioni
**File:** `src/components/RegistrationForm.tsx`

Dopo iscrizione/cancellazione, si aspetta la risposta API prima di aggiornare la UI. Con un optimistic update (aggiornare UI subito, rollback su errore) la risposta percepita sarebbe immediata. Rilevante su connessioni mobili lente.

---

### 13. Paginazione server-side per la lista utenti
**File:** `src/app/api/users/route.ts`, `src/components/AdminUserList.tsx`

Tutti gli utenti vengono caricati in una volta. Con squadre grandi, questo diventa un problema. La paginazione client-side (già presente nel componente) non aiuta perché il payload JSON è già enorme. Aggiungere `skip`/`take` con `cursor` o offset nell'API.

---

### 14. Indici DB mancanti
**File:** `prisma/schema.prisma`

Campi usati frequentemente come filtro senza `@@index`:
- `Registration.userId` + `Registration.sessionId` (query "iscrizioni per allenamento")
- `TeamMembership.userId` + `TeamMembership.season`
- `AppNotificationRead.userId`

Aggiungere con `@@index([userId, sessionId])` nel model Prisma. Impatto nullo in dev, rilevante in produzione con centinaia di record.

---

### 15. Sentry / error monitoring
**File:** `src/app/error.tsx`, `src/app/global-error.tsx`

Le pagine di errore mostrano feedback visivo ma non tracciano l'errore da nessuna parte. Integrare Sentry (o Vercel Log Drains) per ricevere notifiche sugli errori in produzione senza dover controllare i log manualmente.

---

### 16. Sistema ELO giocatori *(già pianificato)*
**Riferimento:** memory `project_elo_system.md`

ELO nascosto su `User`/`Child` per generare squadre bilanciate negli allenamenti. Visibile solo a COACH/ADMIN. Già identificato come feature futura — annotato qui per completezza.

---

## Note

- I punti **1–3** (test, validazione, rate limiting) sono i più importanti per robustezza e sicurezza.
- I punti **4–6** migliorano la manutenibilità e l'esperienza utente senza cambiare funzionalità.
- I punti **11–16** sono quality-of-life, da considerare quando il progetto cresce.
- Priorità di intervento consigliata: affrontare i problemi quando si tocca già il file per un'altra ragione (boy scout rule), non come refactor standalone.
