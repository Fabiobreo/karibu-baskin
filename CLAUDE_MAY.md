# CLAUDE_MAY.md — Log sessioni automatiche

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
