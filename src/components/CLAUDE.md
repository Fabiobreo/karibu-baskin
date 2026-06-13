# src/components — Regole

Tutti i componenti riutilizzabili vanno qui, organizzati per **dominio/feature**.

## Struttura cartelle

| Cartella         | Contenuto                                                        |
| ---------------- | ---------------------------------------------------------------- |
| `admin/`         | Pannello admin: `Admin*Client`, form, tabelle, `AuditLogClient`  |
| `training/`      | Allenamenti + iscrizioni + generazione squadre                   |
| `matches/`       | Partite ufficiali, stats, convocazioni, disponibilità            |
| `teams/`         | Squadre agonistiche, gironi, classifiche, avversarie             |
| `news/`          | Post + sondaggi (`Post*`, `Poll*`, `LatestNewsHero`)             |
| `gallery/`       | Feed Instagram + video YouTube                                   |
| `rating/`        | TrueSkill, badge, tracker sviluppo                               |
| `calendar/`      | Calendario + sottoscrizione .ics                                 |
| `profile/`       | Profilo utente, avatar, collegamento figli, prefs notifiche      |
| `layout/`        | Header, footer, nav, providers, switcher tema/lingua, SW         |
| `notifications/` | Bell, dropdown, item, centro notifiche                           |
| `common/`        | Componenti genuinamente trasversali (hero, dialog, empty state…) |

Regola di assegnazione: un componente va nella cartella del suo **dominio di utilizzo principale**, non del suo tipo strutturale. `MatchFormDialog` → `matches/`, non in un ipotetico `dialogs/`.

## Convenzioni

- **Nome file:** PascalCase, estensione `.tsx` (es. `SessionCard.tsx`).
- **Export:** `export default function ComponentName(...)`. Named export solo per tipi/utility ausiliarie esportate insieme.
- **`"use client"`:** prima riga del file, sempre esplicito quando il componente usa hook React, eventi, browser API. Se è puramente di presentazione e non usa hook, ometterlo per permettere il rendering server-side.
- **Props:** `interface ComponentNameProps { ... }` definita nel file stesso, sopra il componente. Mai estrarre in `types/` se usata solo qui.
- **Styling:** **solo** `sx` prop con token del tema (`primary.main`, `text.secondary`, ecc.). Niente `className`, niente CSS module, niente colori hardcoded. Per stili complessi/riusati: `styled()` da `@mui/material/styles`.
- **Stato:** `useState`/`useReducer` locali. Per stato condiviso a livello di pagina, sollevarlo nel componente client di livello superiore (es. `AdminPartiteClient`).
- **Fetch:** usare **TanStack React Query** (`useQuery` per le letture, `useMutation` per le scritture) con `fetch("/api/...")` come fetcher. Mai SWR né altre librerie di fetching. Mai chiamare Prisma direttamente da qui.
- **Toast/errori:** `useToast()` da `@/context/ToastContext` — sempre `showToast({ message, severity: "success" | "error" | "info" | "warning" })`.
- **Form admin:** pattern controlled inputs + `useState` per ogni campo, validazione client minima + affidamento allo schema Zod server-side per i messaggi d'errore reali.

## Pattern admin client (es. `AdminPartiteClient`)

- Riceve `initialItems: Item[]` dal Server Component padre.
- Stato locale `items` inizializzato dalle props.
- Dopo POST/PUT/DELETE → aggiorna `items` localmente (non affidarsi solo a `router.refresh()`, vedi nota nel root CLAUDE.md).
- Dopo PUT → ricordarsi di **preservare** campi computati come `_count` che la risposta API potrebbe non includere.
- Su mount, leggere `?edit=[id]` con `useSearchParams` → aprire dialog di modifica → pulire l'URL con `router.replace`.

## Cosa NON fare

- Niente librerie UI esterne (Headless UI, Radix, …) — solo MUI.
- Niente `useEffect` per fetch al mount se puoi fare la fetch nel Server Component padre e passare le props.
- Niente prop drilling profondo: se due livelli di prop passing diventano tre, valuta un Context (ma chiedi prima).
- Niente file `index.ts` per ri-esportare — import diretto dal file (`@/components/training/SessionCard`).
- Niente componenti > ~400 righe: spezzare in sotto-componenti nello stesso file o file affiancati.
- Niente cartelle senza una categoria chiara: se un componente non si piazza in nessun dominio, va in `common/`.
