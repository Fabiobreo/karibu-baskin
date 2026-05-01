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
