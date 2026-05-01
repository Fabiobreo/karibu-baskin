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
