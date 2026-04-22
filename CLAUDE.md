# CLAUDE.md — Karibu Baskin

App web per la squadra di Baskin di Montecchio Maggiore (VI). Gestione allenamenti, iscrizioni, generazione squadre bilanciate, pannello admin.

## Stack

- **Framework:** Next.js 16.2.1, App Router, Turbopack, `src/` directory
- **UI:** Material-UI v6 (MUI) con tema custom arancione/nero, Emotion CSS-in-JS
- **Font:** Inter (via Next.js font)
- **Database:** PostgreSQL via [Neon](https://neon.tech) + Prisma ORM v6
- **Auth:** Auth.js v5 (`next-auth@beta`) con Google OAuth + PrismaAdapter
- **Deployment:** Vercel (branch `develop`)
- **PWA:** manifest.json + service worker (`public/sw.js`) con offline support
- **Push notifications:** Web Push API + `web-push` npm package (VAPID)
- **Analytics:** Vercel Analytics

## Comandi principali

```bash
npm run dev          # dev server (Turbopack)
npm run dev:clean    # cancella .next e riavvia (fix cache Turbopack corrotta)
npm run build        # prisma db push + prisma generate + next build
npm run db:migrate   # prisma migrate dev (sviluppo)
npm run db:deploy    # prisma migrate deploy (produzione)
npm run db:generate  # prisma generate
npm run db:studio    # Prisma Studio
npx tsc --noEmit     # type check — SEMPRE prima di fare push
```

> **Importante:** eseguire sempre `tsc --noEmit` (dopo aver eliminato `.next/`) prima di committare. Il `build` script include `prisma db push` che sincronizza automaticamente il DB di produzione ad ogni deploy Vercel.

## Struttura cartelle

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/            # Auth.js handler
│   │   ├── sessions/                      # CRUD allenamenti (TrainingSession)
│   │   ├── registrations/                 # CRUD iscrizioni
│   │   ├── teams/[sessionId]/             # Generazione squadre
│   │   ├── users/                         # Gestione utenti + me/ + me/children + lookup
│   │   ├── children/[childId]/            # Modifica/elimina figlio (PATCH/DELETE)
│   │   ├── competitive-teams/             # CRUD squadre agonistiche + seasons/current
│   │   ├── matches/                       # CRUD partite ufficiali + [matchId]/stats
│   │   ├── opposing-teams/                # CRUD squadre avversarie
│   │   ├── events/                        # CRUD eventi generici
│   │   ├── calendar/                      # GET calendario (allenamenti + partite + eventi)
│   │   ├── link-requests/                 # Richieste collegamento genitore-figlio
│   │   ├── notifications/                 # Notifiche in-app (read, read-all, unread-count)
│   │   ├── push/                          # Web Push (subscribe, vapid-public-key)
│   │   └── test-login/                    # Login fittizio per test (solo ENABLE_TEST_LOGIN=true)
│   ├── admin/
│   │   ├── login/                         # Login admin (solo Google)
│   │   └── (dashboard)/                   # Route group protette (COACH o superiore)
│   │       ├── page.tsx                   # Dashboard admin
│   │       ├── allenamenti/               # Gestione allenamenti
│   │       ├── partite/                   # Gestione partite ufficiali
│   │       ├── eventi/                    # Gestione eventi generici
│   │       ├── squadre/                   # Gestione squadre agonistiche
│   │       └── utenti/                    # Gestione utenti + /nuovo
│   ├── allenamento/[session]/             # Pagina allenamento pubblico
│   ├── allenamenti/                       # Lista allenamenti pubblica
│   ├── calendario/                        # Calendario (allenamenti + partite + eventi)
│   ├── giocatori/[slug]/                  # Profilo pubblico giocatore
│   ├── squadre/                           # Lista squadre agonistiche
│   ├── squadre/[season]/[slug]/           # Profilo squadra
│   ├── notifiche/                         # Centro notifiche utente
│   ├── il-baskin/                         # Regole del Baskin
│   ├── la-squadra/                        # Info squadra
│   ├── contatti/                          # Contatti + mappa
│   ├── sponsor/                           # Sponsor
│   ├── login/                             # Login utente Google
│   ├── profilo/                           # Profilo utente + dati atleta + notifiche + figli
│   ├── error.tsx                          # Pagina errore runtime (500)
│   ├── global-error.tsx                   # Errore critico root layout
│   └── not-found.tsx                      # Pagina 404
├── components/                            # Componenti riutilizzabili (tutti PascalCase)
├── context/
│   └── ToastContext.tsx                   # Toast globali
├── lib/
│   ├── apiAuth.ts                         # Helper auth per API route (isCoachOrAdmin, isAdminUser)
│   ├── authjs.ts                          # Config Auth.js v5
│   ├── authRoles.ts                       # Gerarchia ruoli + helper hasRole()
│   ├── constants.ts                       # ROLE_LABELS, ROLE_COLORS, ROLES
│   ├── db.ts                              # Prisma singleton
│   ├── registrationRestrictions.ts        # Logica restrizioni iscrizioni (shared server+client)
│   ├── teamGenerator.ts                   # Mulberry32 PRNG seeded shuffle
│   ├── theme.ts                           # MUI theme
│   └── webpush.ts                         # Invio notifiche push (sendPushToAll)
├── proxy.ts                               # Middleware (matcher vuoto — auth gestita nei layout/API)
└── types/
    └── next-auth.d.ts                     # Augmentazione tipi sessione
```

## Convenzioni di codice

- **Componenti:** PascalCase (`RegistrationForm.tsx`), con `"use client"` esplicito se necessario
- **Utilities/pages/API:** lowercase (`route.ts`, `page.tsx`, `constants.ts`)
- **Costanti:** UPPER_SNAKE_CASE
- **Alias import:** `@/` → `src/` (es. `import { prisma } from "@/lib/db"`)
- **Lingua UI:** Italiano per tutto il testo visibile all'utente
- **Tipi:** interface per oggetti, type per union; mai `as any` senza commento
- **Stile MUI:** usare `sx` prop + colori dal tema (`primary.main`, `text.secondary`), mai colori hardcoded
- **Server vs Client:** le pagine in `app/` sono Server Components di default; aggiungere `"use client"` solo dove serve interattività
- **Button + Link in Server Component:** usare sempre `<Link><Button>` mai `<Button component={Link}>` (causa errore runtime Next.js)
- **Select con valore vuoto:** usare `displayEmpty` + `InputLabel shrink` + `notched` per evitare sovrapposizione etichetta

## Modelli Prisma principali

| Modello Prisma | Tabella DB | Scopo |
|---|---|---|
| `TrainingSession` | `TrainingSession` | Allenamenti |
| `Registration` | `Registration` | Iscrizioni (userId o childId o anonimo) |
| `User` | `User` | Utenti Auth.js + dati atleta |
| `Session` | `Session` | Sessioni OAuth (Auth.js) |
| `Account` | `Account` | Provider OAuth (Google) |
| `Child` | `Child` | Figli senza account, gestiti dal genitore |
| `LinkRequest` | `LinkRequest` | Richiesta collegamento genitore-figlio |
| `SportRoleHistory` | `SportRoleHistory` | Storico cambi ruolo sportivo |
| `PushSubscription` | `PushSubscription` | Subscription Web Push |
| `Season` | `Season` | Stagioni sportive (es. "2025-26") |
| `CompetitiveTeam` | `CompetitiveTeam` | Squadre agonistiche per stagione |
| `TeamMembership` | `TeamMembership` | Appartenenza giocatore (User o Child) a una squadra |
| `Match` | `OfficialMatch` | Partite ufficiali |
| `OpposingTeam` | `OpposingTeam` | Squadre avversarie |
| `PlayerMatchStats` | `PlayerMatchStats` | Statistiche giocatore per partita |
| `Event` | `Event` | Eventi generici (tornei, trasferte…) |
| `AppNotification` | `AppNotification` | Notifiche in-app |
| `AppNotificationRead` | `AppNotificationRead` | Tracking lettura notifiche per utente |

> **Attenzione naming:** `prisma.trainingSession` = allenamenti; `prisma.session` = sessioni Auth.js. Non confonderli.
> **`Match` → `OfficialMatch`:** il modello si chiama `Match` in Prisma ma la tabella DB è `OfficialMatch` (via `@@map`).

**Campi atleta su User:** `sportRole Int?` (1-5), `sportRoleVariant String?`, `gender Gender?`, `birthDate DateTime?`, `slug String?` (URL leggibile), `sportRoleSuggested Int?` (in attesa di conferma admin)

**Campi Registration:** `role Int`, `note String?`, `anonymousEmail String?` (per riconoscimento iscrizioni anonime), `userId String?`, `childId String?` (al più uno non-null)

## Sistema di autenticazione

**Solo Google OAuth** (Auth.js v5) — nessun CredentialsProvider.

- **Ruoli:** `GUEST | ATHLETE | PARENT | COACH | ADMIN`
- **Gerarchia:** `GUEST(0) < ATHLETE(1) < PARENT(2) < COACH(3) < ADMIN(4)`
- **Accesso admin panel:** richiede ruolo `COACH` o superiore
- **Protezione API route:** usare `isCoachOrAdmin()` o `isAdminUser()` da `@/lib/apiAuth`
- **Protezione layout:** usare `auth()` da `@/lib/authjs` nei Server Component
- **`proxy.ts`:** matcher vuoto — non fa auth (Edge Runtime non supporta Prisma)
- **Account linking:** `allowDangerousEmailAccountLinking: true` sul provider Google — permette di collegare account Google a utenti pre-creati dall'admin
- **Sessione:** database strategy, durata 1 anno
- **Immagine profilo:** aggiornata ad ogni login tramite callback `signIn` in `authjs.ts` (salva `name` e `image` da Google profile). Richiede `lh3.googleusercontent.com` in `next.config.ts` `images.remotePatterns`.

**Test login (solo sviluppo):** `src/app/api/test-login/route.ts` + `src/components/TestLoginForm.tsx`.
- Abilitato solo se `ENABLE_TEST_LOGIN=true` nell'env.
- Crea manualmente una riga `Session` nel DB e imposta il cookie `authjs.session-token` via header raw `Set-Cookie` (non `NextResponse.cookies.set()` — bug Turbopack).
- Cookie name: `authjs.session-token` (dev) / `__Secure-authjs.session-token` (prod).

**Preview ruolo:** rimosso completamente. File eliminati: `PreviewBanner.tsx`, `PreviewRoleContext.tsx`, `effectiveSession.ts`, `api/admin/preview/route.ts`.

## Restrizioni iscrizione allenamenti

La logica è in `src/lib/registrationRestrictions.ts` — usata sia server-side (API `POST /api/registrations`) che client-side (`RegistrationForm`).

Campi su `TrainingSession`:
- `allowedRoles Int[]` — ruoli sportivi ammessi (vuoto = tutti)
- `restrictTeamId String?` — restringe a membri di una squadra specifica (null = nessuna restrizione)
- `openRoles Int[]` — ruoli esenti dalla restrizione di squadra (es. ruolo 1 sempre ammesso)

Comportamento `checkRegistrationAllowed()`:
- COACH e ADMIN: sempre ammessi
- GUEST / anonimo: bypass del controllo squadra, sottoposti solo a `allowedRoles`
- ATHLETE/PARENT: controllo `allowedRoles` poi controllo squadra
- Server-side: usa `user.sportRole ?? role` come ruolo effettivo (ignora il ruolo inviato nel form se l'utente ha un ruolo assegnato)

## Push notifications

- **Library:** `web-push` npm package
- **VAPID keys:** generate con `node -e "require('web-push').generateVAPIDKeys()..."`
- **Invio:** `sendPushToAll(payload, adminOnly?)` da `@/lib/webpush.ts`
- **Trigger automatici:** nuovo allenamento (tutti), squadre generate (tutti), nuovo utente GUEST (solo admin)
- **Subscribe UI:** `PushNotificationToggle` component nella pagina profilo

## Variabili d'ambiente richieste

```
DATABASE_URL=                     # Neon connection pooling URL
DIRECT_URL=                       # Neon direct URL (per migrations)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
AUTH_SECRET=                      # Auth.js v5 — generare con: openssl rand -base64 32
NEXTAUTH_URL=                     # URL pubblico (es. https://karibu-baskin.vercel.app)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=     # Chiave pubblica VAPID per Web Push
VAPID_PRIVATE_KEY=                # Chiave privata VAPID
VAPID_EMAIL=                      # Email contatto per Web Push (es. admin@karibubaskin.it)
ENABLE_TEST_LOGIN=                # "true" per abilitare login fittizio (solo dev)
```

> `ADMIN_PASSWORD` e `COOKIE_SECRET` sono stati rimossi — non più necessari.

## Offline / PWA

Service worker (`public/sw.js`) con 3 strategie (versione `karibu-v4`):
- **Cache-first:** asset statici (`/logo.png`, `/_next/static/*`, ecc.)
- **Network-first + cache fallback:** pagine HTML (fallback su `/offline.html` se mai visitata)
- **Network-first + cache fallback:** `GET /api/sessions*` e `GET /api/teams/*` — cache usata solo se offline (era stale-while-revalidate, rimossa per evitare dati obsoleti)

Pagine pre-cachate all'installazione: `/`, `/il-baskin`, `/la-squadra`, `/contatti`, `/sponsor`.

## Pagina allenamento (`/allenamento/[sessionId]`)

Layout: form iscrizione in cima, lista iscritti (`RosterByRole`) sotto — layout verticale unico.

- **Utente iscritto + squadre generate:** banner "La tua squadra" in cima, sezione squadre subito dopo, lista iscritti in fondo (form nascosto)
- **Altrimenti:** form + lista iscritti in sequenza, sezione squadre in fondo

`TeamDisplay` è un componente controllato: riceve `teams: TeamsData | null`, `teamsLoading`, `onTeamsGenerated` dalla pagina. Non fa fetch internamente.

Rilevamento cambio iscritti (per alert "rigenera squadre"): confronto Set degli ID iscrizioni vs ID nelle squadre salvate — resistente a sostituzioni (un utente esce, uno entra).

`RegistrationForm` — aspetti chiave:
- `CurrentUser.teamMemberships: TeamMembershipInfo[]` (non più solo `teamMembershipIds`)
- Badge squadra corrente mostrato nell'intestazione soggetto (stagione corrente filtrata)
- Lock message sostituisce solo il pulsante di invio, lasciando visibile il risultato questionario e "Rifai il questionario"
- Campo email mostrato per iscrizioni anonime

## Calendario (`/calendario`)

`CalendarClient` — comportamento:
- **Mobile (< 600px):** click su giorno apre `DayEventsDialog` con lista eventi del giorno; se staff e nessun evento mostra "Aggiungi"
- **Desktop:** click su giorno per staff crea allenamento/evento; per utenti normali apre il giorno se ci sono eventi
- `EventDetailDialog` mostra pulsante matita (modifica) per staff, con link a `/admin/partite?edit=[id]` o `/admin/eventi?edit=[id]` o alla pagina allenamento
- `AdminPartiteClient` e `AdminEventiClient`: su mount leggono `?edit=[id]` via `useSearchParams` e aprono automaticamente il dialog di modifica, poi puliscono l'URL

## Gestione utenti admin (`/admin/utenti`)

`AdminUserList` supporta:
- **Ricerca** per nome/email
- **Filtri:** ruolo utente (chip toggle), ruolo Baskin (select), genere (toggle group)
- **Ordinamento:** per nome, ruolo utente, ruolo Baskin, data iscrizione, n° allenamenti (`TableSortLabel`)
- **Paginazione:** `TablePagination` con opzioni 10/25/50/100, default 25
- **Eliminazione utente:** dialog di conferma, endpoint `DELETE /api/users/[userId]` (admin-only, non può eliminare sé stesso)

## Gestione partite admin (`/admin/partite`)

`AdminPartiteClient` — aspetti chiave:
- Dropdown squadra filtra a `currentSeasonTeams` (stagione corrente), fallback a tutte le squadre se nessuna
- Dopo salvataggio (PUT): aggiorna stato locale preservando `_count` dall'entry esistente (la risposta API non include `_count`)
- `getCurrentSeason()`: calcola stagione come `YYYY-YY`, inizio da settembre

## Eliminazione figlio (CASCADE manuale)

`DELETE /api/children/[childId]`: prima di eliminare il figlio, cancella esplicitamente le sue iscrizioni e azzera il campo `teams` (JSON) degli allenamenti coinvolti con `Prisma.DbNull`. Necessario perché `Registration.child` ha `onDelete: SetNull` (non Cascade).

## Note importanti

- **Generazione squadre:** deterministica con Mulberry32 PRNG seedato su `sessionId` — stesso seed = stesse squadre
- **3 squadre:** supportate (Arancioni / Neri / Bianchi), opzione nel form admin
- **Stagione corrente:** `month >= 8 ? year : year - 1` → formattata `YYYY-YY` (es. "2025-26")
- **Neon branch:** usare branch separati per dev e prod; le variabili Vercel devono puntare al branch corretto per environment
- **Build script:** `prisma db push` nel build sincronizza automaticamente il DB di produzione — sicuro per aggiungere colonne, fallisce se ci sono data-loss changes (comportamento voluto)
- **TypeScript strict:** abilitato — nessuna eccezione; risolvere tutti gli errori prima del push
- **Turbopack cache corrotta:** se si vedono errori `.sst` nei log, usare `npm run dev:clean`
- **Mock users:** `prisma/seed.ts` crea utenti di test (es. `npx tsx prisma/seed.ts 15`) — ricordarsi di pulirli prima di andare in produzione
- **`NextResponse.cookies.set()` bug Turbopack:** non usarlo per impostare cookie di sessione — usare `res.headers.set("Set-Cookie", ...)` con stringa manuale
- **`Prisma.DbNull`:** usare `Prisma.DbNull` (importato da `@prisma/client`) per settare a null campi JSON nullable — `null` TypeScript non funziona con Prisma per i Json field
- **`router.refresh()` e stato locale:** `router.refresh()` riesegue i Server Component ma non reinizializza lo stato React locale derivato dalle props; aggiornare direttamente lo stato locale dopo le mutazioni API quando serve reattività immediata
