# CLAUDE.md — Karibu Baskin

App web per la squadra di Baskin di Montecchio Maggiore (VI). Gestione allenamenti, iscrizioni, generazione squadre bilanciate, pannello admin.

## Stack

- **Framework:** Next.js 16.2.1, App Router, Turbopack, `src/` directory
- **UI:** Material-UI v6 (MUI) con tema custom arancione/nero, Emotion CSS-in-JS. **Tema chiaro/scuro:** `src/theme.ts` esporta `lightTheme` e `darkTheme`; lo switch è gestito da `ThemeContext` (persistito in `localStorage`, default "system")
- **Font:** Inter (via Next.js font)
- **Database:** PostgreSQL via [Neon](https://neon.tech) + Prisma ORM v6
- **Auth:** Auth.js v5 (`next-auth@beta`) con Google OAuth + PrismaAdapter
- **Deployment:** Vercel (branch `develop`)
- **PWA:** manifest.json + service worker (`public/sw.js`) con offline support
- **Push notifications:** Web Push API + `web-push` npm package (VAPID)
- **Upload immagini:** Vercel Blob (`@vercel/blob`) + `sharp` per resize/ottimizzazione — vedi `src/lib/blob.ts` (cartelle: avatars, teams, matches, events, posts) e `POST /api/upload`
- **Rating giocatori:** sistema TrueSkill custom (`src/lib/trueskill.ts`, `ratingEngine.ts`, `ratingTrend.ts`) + ottimizzatore formazioni (`lineupOptimizer.ts`) + badge (`badges.ts`)
- **Analytics:** Vercel Analytics
- **Validazione input:** Zod v4 (schemi in `src/lib/schemas/`)
- **Data fetching client:** SWR per fetch lato client; `fetch` diretto nei Server Component
- **Email transazionali:** Resend + React Email (template in `src/emails/`)
- **Storybook:** v10 (`.storybook/`, file `*.stories.tsx` accanto al componente) — `npm run storybook`
- **Linter / Formatter:** ESLint (eslint-config-next) + Prettier (`.prettierrc`: semi, double quotes, 2 spazi, printWidth 100, trailingComma es5, LF)
- **Testing:** Vitest (file `*.test.ts` accanto al sorgente — es. `src/lib/schemas/session.test.ts`, `src/app/api/sessions/route.test.ts`)
- **Date:** `date-fns` v4 con locale `it`
- **State management:** nessuna libreria globale — solo `useState`/`useReducer` locali + Context (`ToastContext`, `NotificationContext`, `ThemeContext`) + SWR cache

## Comandi principali

```bash
npm run dev          # dev server (Turbopack)
npm run dev:clean    # cancella .next e riavvia (fix cache Turbopack corrotta)
npm run build        # prisma db push + prisma generate + next build
npm run db:migrate   # prisma migrate dev (sviluppo)
npm run db:deploy    # prisma migrate deploy (produzione)
npm run db:generate  # prisma generate
npm run db:studio    # Prisma Studio
npm run lint         # ESLint su src/
npm run format       # Prettier --write su src/
npm run format:check # Prettier --check (CI)
npm test             # Vitest run (one-shot)
npm run test:watch   # Vitest watch
npm run email:dev    # Preview React Email (porta 3333)
npx tsc --noEmit     # type check — SEMPRE prima di fare push
```

> **Importante:** eseguire sempre `tsc --noEmit` (dopo aver eliminato `.next/`) prima di committare. Il `build` script include `prisma db push` che sincronizza automaticamente il DB di produzione ad ogni deploy Vercel.

## Struttura cartelle

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/            # Auth.js handler
│   │   ├── admin/export/                  # Export dati allenamenti (admin-only)
│   │   ├── admin/audit/                   # Lettura audit log (admin-only)
│   │   ├── sessions/                      # CRUD allenamenti + conclude/ + close/open-registrations/ + match-results/
│   │   ├── registrations/                 # CRUD iscrizioni + claim/ + attendance/
│   │   ├── teams/[sessionId]/             # Generazione squadre
│   │   ├── users/                         # Gestione utenti + me/ (children, availabilities, notif-prefs, export) + lookup + season-stats
│   │   ├── children/[childId]/            # Modifica/elimina figlio + season-stats/
│   │   ├── competitive-teams/             # CRUD squadre agonistiche + members/ + seasons/current
│   │   ├── matches/                       # CRUD partite ufficiali + [matchId]/stats + callups/ + availability/ + mvps/
│   │   ├── groups/[groupId]/              # Gironi + matches/ + teams/ + competitive-teams/
│   │   ├── opposing-teams/                # CRUD squadre avversarie
│   │   ├── events/                        # CRUD eventi generici
│   │   ├── posts/                         # CRUD news/post (+ admin/) — bacheca
│   │   ├── polls/[id]/vote/              # Voto sondaggi (poll abbinati ai post)
│   │   ├── gallery/                       # Moderazione Gallery: sync/ (trigger), [id]/ (hide/delete)
│   │   ├── upload/                        # Upload immagini su Vercel Blob (+ sharp)
│   │   ├── calendar/                      # GET calendario + export.ics/
│   │   ├── link-requests/                 # Richieste collegamento genitore-figlio + respond/
│   │   ├── notifications/                 # Notifiche in-app (read, read-all, unread-count)
│   │   ├── push/                          # Web Push (subscribe, notify, vapid-public-key)
│   │   ├── cron/                          # Cron Vercel (CRON_SECRET): cleanup-notifications,
│   │   │                                  #   birthday-notifications, training-open-reminder,
│   │   │                                  #   match-availability-reminder, match-callup-reminder,
│   │   │                                  #   match-coverage-alert, instagram-sync
│   │   └── test-login/                    # Login fittizio per test (solo ENABLE_TEST_LOGIN=true)
│   ├── actions/
│   │   └── contact.ts                     # Server action form contatti (Resend)
│   ├── admin/
│   │   ├── login/                         # Login admin (solo Google)
│   │   └── (dashboard)/                   # Route group protette (COACH o superiore)
│   │       ├── page.tsx                   # Dashboard admin
│   │       ├── allenamenti/               # Gestione allenamenti
│   │       ├── partite/                   # Gestione partite ufficiali (+ [matchId]/convocazioni, /statistiche)
│   │       ├── eventi/                    # Gestione eventi generici
│   │       ├── squadre/                   # Gestione squadre agonistiche (+ [teamId]/rosa)
│   │       ├── gironi/                    # Gestione gironi (+ [groupId])
│   │       ├── avversarie/                # Gestione squadre avversarie
│   │       ├── news/                      # Gestione news/post + sondaggi
│   │       ├── gallery/                   # Gestione Gallery (sync IG + moderazione)
│   │       ├── esporta/                   # Export dati
│   │       ├── audit/                     # Audit log azioni admin
│   │       ├── sviluppo/                  # Tracker sviluppo giocatori (rating)
│   │       └── utenti/                    # Gestione utenti + /nuovo + /[userId]
│   ├── allenamento/[session]/             # Pagina allenamento pubblico
│   ├── allenamenti/                       # Lista allenamenti pubblica
│   ├── calendario/                        # Calendario (allenamenti + partite + eventi)
│   ├── classifiche/                       # Classifiche ufficiali stagione (gironi, inline)
│   ├── marcatori/                         # Classifica marcatori interna (statistiche giocatore)
│   ├── giocatori/[slug]/                  # Profilo pubblico giocatore
│   ├── partite/[slug]/                    # Dettaglio partita pubblica
│   ├── partite/                           # Prossime partite
│   ├── risultati/                         # Risultati partite
│   ├── avversarie/[slug]/                 # Profilo pubblico squadra avversaria
│   ├── squadre/                           # Lista squadre agonistiche
│   ├── squadre/[season]/[slug]/           # Profilo squadra
│   ├── squadre/archivio/                  # Archivio squadre stagioni passate
│   ├── news/                              # Bacheca news (+ [slug] dettaglio)
│   ├── gallery/                           # Gallery: feed Instagram mirrorato + video YouTube
│   ├── faq/                               # FAQ
│   ├── notifiche/                         # Centro notifiche utente
│   ├── il-baskin/                         # Regole del Baskin
│   ├── la-squadra/                        # Redirect → /squadre (legacy)
│   ├── contatti/                          # Contatti + mappa
│   ├── sponsor/                           # Sponsor
│   ├── privacy/                           # Informativa privacy
│   ├── login/                             # Login utente Google
│   ├── profilo/                           # Profilo utente + dati atleta + notifiche + figli (+ /disponibilita)
│   ├── error.tsx                          # Pagina errore runtime (500)
│   ├── global-error.tsx                   # Errore critico root layout
│   └── not-found.tsx                      # Pagina 404
├── components/                            # Componenti riutilizzabili (tutti PascalCase; sottocartella notifications/)
├── context/
│   ├── ToastContext.tsx                   # Toast globali
│   ├── NotificationContext.tsx            # Notifiche in-app (unread count, mark read)
│   └── ThemeContext.tsx                   # Tema chiaro/scuro/system (persistito in localStorage)
├── emails/                                # Template React Email
│   ├── ContactConfirmationEmail.tsx       # Conferma all'utente
│   └── ContactNotificationEmail.tsx       # Notifica all'admin
├── hooks/
│   ├── useRegistrationForm.ts             # Hook logica form iscrizione
│   ├── useConfirmDialog.tsx               # Dialog di conferma riutilizzabile
│   └── useCookieConsent.ts                # Stato consenso cookie
├── lib/
│   ├── apiAuth.ts                         # Helper auth per API route (isCoachOrAdmin, isAdminUser)
│   ├── appNotifications.ts                # Creazione notifiche in-app
│   ├── audit.ts                           # Audit logging (AuditEvent)
│   ├── authjs.ts                          # Config Auth.js v5
│   ├── authRoles.ts                       # Gerarchia ruoli + helper hasRole()
│   ├── badges.ts                          # Calcolo badge giocatore
│   ├── blob.ts                            # Upload/ottimizzazione immagini (Vercel Blob + sharp)
│   ├── callupContext.ts / callupStats.ts  # Logica convocazioni partita
│   ├── constants.ts                       # ROLE_LABELS, ROLE_COLORS, ROLES
│   ├── dateUtils.ts                       # Helpers date (formattazione, confronto)
│   ├── db.ts                              # Prisma singleton
│   ├── faqs.ts                            # Contenuti FAQ
│   ├── heroStyles.ts                      # Stili condivisi hero/PageHero
│   ├── instagram.ts                       # Gallery: client Graph API + mirror su Blob + upsert
│   ├── youtube.ts                         # Gallery: lista video dal feed RSS del canale
│   ├── lineupOptimizer.ts                 # Ottimizzatore formazioni (rating TrueSkill)
│   ├── loanDetection.ts                   # Rilevamento prestiti tra squadre
│   ├── loSapevi.ts                        # Fatti "Lo sapevi?" per la home
│   ├── matchCoverage.ts                   # Copertura ruoli/convocazioni partita
│   ├── matchQuality.ts                    # Qualità/bilanciamento partita
│   ├── matchResults.ts                    # Helpers risultati partite
│   ├── notifPrefs.ts                      # Preferenze notifiche per tipo evento
│   ├── rateLimit.ts                       # Rate limiting per API route
│   ├── ratingEngine.ts / ratingTrend.ts   # Motore rating TrueSkill + andamento
│   ├── registrationRestrictions.ts        # Logica restrizioni iscrizioni (shared server+client)
│   ├── seasonUtils.ts                     # Calcolo stagione corrente (YYYY-YY)
│   ├── sessionNotify.ts                   # Notifiche legate agli allenamenti
│   ├── slugUtils.ts                       # Generazione slug URL
│   ├── standings.ts                       # Calcolo classifiche gironi
│   ├── teamGenerator.ts                   # Mulberry32 PRNG seeded shuffle
│   ├── trueskill.ts                       # Implementazione TrueSkill
│   ├── useHasMounted.ts                   # Hook anti-SSR hydration mismatch
│   ├── validators.ts                      # Validatori generici
│   ├── webpush.ts                         # Invio notifiche push (sendPushToAll/Team/Filter)
│   └── schemas/                           # Schemi Zod per validazione input API
│       ├── child.ts, competitiveTeam.ts, event.ts, group.ts, post.ts
│       ├── match.ts, opposingTeam.ts, registration.ts, session.ts
│       └── entities.ts                    # Tipi condivisi tra schemi
├── proxy.ts                               # Middleware pass-through (matcher vuoto — auth nei layout/API)
├── theme.ts                               # MUI theme arancione/nero (lightTheme + darkTheme)
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

| Modello Prisma         | Tabella DB             | Scopo                                               |
| ---------------------- | ---------------------- | --------------------------------------------------- |
| `TrainingSession`      | `TrainingSession`      | Allenamenti                                         |
| `Registration`         | `Registration`         | Iscrizioni (userId o childId o anonimo)             |
| `User`                 | `User`                 | Utenti Auth.js + dati atleta                        |
| `Session`              | `Session`              | Sessioni OAuth (Auth.js)                            |
| `Account`              | `Account`              | Provider OAuth (Google)                             |
| `Child`                | `Child`                | Figli senza account, gestiti dal genitore           |
| `LinkRequest`          | `LinkRequest`          | Richiesta collegamento genitore-figlio              |
| `SportRoleHistory`     | `SportRoleHistory`     | Storico cambi ruolo sportivo                        |
| `PushSubscription`     | `PushSubscription`     | Subscription Web Push                               |
| `Season`               | `Season`               | Stagioni sportive (es. "2025-26")                   |
| `CompetitiveTeam`      | `CompetitiveTeam`      | Squadre agonistiche per stagione                    |
| `TeamMembership`       | `TeamMembership`       | Appartenenza giocatore (User o Child) a una squadra |
| `Match`                | `OfficialMatch`        | Partite ufficiali                                   |
| `OpposingTeam`         | `OpposingTeam`         | Squadre avversarie                                  |
| `PlayerMatchStats`     | `PlayerMatchStats`     | Statistiche giocatore per partita                   |
| `Event`                | `Event`                | Eventi generici (tornei, trasferte…)                |
| `AppNotification`      | `AppNotification`      | Notifiche in-app                                    |
| `AppNotificationRead`  | `AppNotificationRead`  | Tracking lettura notifiche per utente               |
| `Group`                | `Group`                | Gironi di campionato                                |
| `GroupCompetitiveTeam` | `GroupCompetitiveTeam` | Nostre squadre iscritte a un girone                 |
| `GroupTeam`            | `GroupTeam`            | Squadre avversarie iscritte a un girone             |
| `GroupMatch`           | `GroupMatch`           | Partite di girone                                   |
| `MatchCallup`          | `MatchCallup`          | Convocazioni giocatore per partita                  |
| `MatchAvailability`    | `MatchAvailability`    | Disponibilità giocatore a una partita               |
| `MatchMvp`             | `MatchMvp`             | MVP votati per partita                              |
| `RatingUpdate`         | `RatingUpdate`         | Storico aggiornamenti rating TrueSkill              |
| `Post`                 | `Post`                 | News/post della bacheca                             |
| `Poll`                 | `Poll`                 | Sondaggi abbinati ai post                           |
| `PollOption`           | `PollOption`           | Opzioni di un sondaggio                             |
| `PollVote`             | `PollVote`             | Voti dei sondaggi                                   |
| `TrainingMatchResult`  | `TrainingMatchResult`  | Risultati partitelle a fine allenamento             |
| `AuditEvent`           | `AuditEvent`           | Log azioni admin (audit trail)                      |
| `InstagramPost`        | `InstagramPost`        | Post Instagram mirrorati per la Gallery             |
| `VerificationToken`    | `VerificationToken`    | Token verifica Auth.js                              |

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
- **Invio:** `sendPushToAll(payload, adminOnly?, type?)` / `sendPushToTeam(teamId, ...)` / `sendPushToFilter({ sportRoles, gender }, ...)` da `@/lib/webpush.ts`
- **Trigger automatici:** nuovo allenamento (tutti), squadre generate (tutti), nuovo utente GUEST (solo admin); inoltre i cron giornalieri (vedi sotto) inviano promemoria
- **Subscribe UI:** `NotificationPrefsPanel` nella pagina profilo
- **Cron Vercel** (autorizzati via `CRON_SECRET`, in `src/app/api/cron/`):
  - `cleanup-notifications` — pulizia notifiche vecchie (domenicale)
  - `birthday-notifications` — auguri di compleanno
  - `training-open-reminder` — promemoria apertura iscrizioni allenamento
  - `match-availability-reminder` — promemoria conferma disponibilità partita
  - `match-callup-reminder` — promemoria convocazioni
  - `match-coverage-alert` — alert copertura ruoli insufficiente
  - `instagram-sync` — sincronizza il feed Instagram nella Gallery (ogni 6h)

## Sottosistemi recenti

- **Rating / TrueSkill:** `src/lib/trueskill.ts` (implementazione), `ratingEngine.ts` (applicazione ai risultati), `ratingTrend.ts` (andamento), `RatingUpdate` (storico). Usato da `lineupOptimizer.ts` per suggerire formazioni bilanciate (UI: `LineupOptimizerSection`) e dal tracker sviluppo (`/admin/sviluppo`, `DevelopmentTracker`). Badge derivati in `badges.ts`.
- **News / bacheca:** modelli `Post` + `Poll`/`PollOption`/`PollVote`. API `posts/` (+ `posts/admin/`) e `polls/[id]/vote`. Admin: `/admin/news` (`AdminNewsClient`, `PostEditor`, `PollEditor`). Pubblico: `/news` e `/news/[slug]`. Widget: `PollWidget`, `LatestNewsHero`.
- **Disponibilità & convocazioni:** `MatchAvailability` (l'atleta dichiara la disponibilità per una partita) e `MatchCallup` (lo staff convoca). API `matches/[matchId]/availability` e `/callups`, più `users/me/availabilities`. UI utente: `/profilo/disponibilita` (`MieDisponibilitaClient`); UI staff: `/admin/partite/[matchId]/convocazioni` (`ConvocazioniClient`). Logica: `callupContext.ts`, `callupStats.ts`, `matchCoverage.ts`.
- **MVP partita:** `MatchMvp` + `matches/[matchId]/mvps`.
- **Tema chiaro/scuro:** `ThemeContext` + `lightTheme`/`darkTheme` in `theme.ts`. Lo switch è nel menu utente (header) e nel drawer mobile. Usare sempre token semantici del tema (`text.primary`, `background.paper`, …): i colori hardcoded rompono il dark mode.
- **Gallery:** feed Instagram automatico + video YouTube. Il cron `instagram-sync` (ogni 6h, `vercel.json`) chiama `syncInstagram()` (`src/lib/instagram.ts`): scarica gli ultimi post via **Instagram Graph API** (account Business → `IG_ACCESS_TOKEN` + `IG_BUSINESS_ACCOUNT_ID`), **ri-carica le immagini su Vercel Blob** (gli URL CDN di IG scadono) e fa upsert in `InstagramPost`. La pagina pubblica `/gallery` legge dal DB (`GalleryGrid` con lightbox) + sezione video da `youtube.ts` (feed RSS, `YOUTUBE_CHANNEL_ID`, embed `youtube-nocookie` con click-to-load). Admin: `/admin/gallery` (`AdminGalleryClient`) per sync manuale e moderazione (`hidden`/elimina). API: `gallery/sync` (POST, staff) e `gallery/[id]` (PATCH/DELETE). Mai linkare direttamente `media_url` di IG: scadono.

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
RESEND_API_KEY=                   # API key Resend per email transazionali
CONTACT_EMAIL=                    # Destinatario notifiche form contatti
BLOB_READ_WRITE_TOKEN=            # Token Vercel Blob per upload immagini (auto su Vercel)
CRON_SECRET=                      # Secret per autorizzare i cron job Vercel
IG_ACCESS_TOKEN=                  # Gallery: token long-lived Instagram Graph API
IG_BUSINESS_ACCOUNT_ID=          # Gallery: ID account Instagram Business
YOUTUBE_CHANNEL_ID=               # Gallery: ID canale YouTube (feed RSS, sezione video)
ENABLE_TEST_LOGIN=                # "true" per abilitare login fittizio (solo dev)
TEST_PASSWORD=                    # Password per il login di test (default: karibu-test)
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

Rilevamento cambio iscritti (per alert "ricrea squadre"): confronto Set degli ID iscrizioni vs ID nelle squadre salvate — resistente a sostituzioni (un utente esce, uno entra).

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
- **Hydration mismatch da estensioni browser:** estensioni come Grammarly iniettano attributi sul `<body>` prima che React idrati, causando warning. Fix permanente: `suppressHydrationWarning` sul tag `<body>` in `src/app/layout.tsx` (già applicato). Non rimuoverlo. Per altri mismatch legati a valori dinamici (date, `Math.random()`, `typeof window`), usare `useHasMounted` da `@/lib/useHasMounted`.

## Pattern per nuove feature

### Aggiungere una nuova entità (modello + CRUD + admin UI)

1. **Schema DB** — aggiungere il modello in `prisma/schema.prisma`. Niente `migrate` in dev se non necessario; il build di prod fa `prisma db push`. Per lo sviluppo locale, `npm run db:migrate` solo se serve storia.
2. **Schema Zod** — creare `src/lib/schemas/<entity>.ts` con `XxxCreateSchema` e `XxxUpdateSchema`. Esportare anche tipi inferiti se condivisi.
3. **Test schema** — `src/lib/schemas/<entity>.test.ts` (Vitest) — coprire i casi limite di validazione.
4. **API routes** — `src/app/api/<entity>/route.ts` (GET list / POST create) e `src/app/api/<entity>/[id]/route.ts` (GET / PUT / DELETE). Vedi template sotto.
5. **Componente client admin** — `src/components/Admin<Entity>Client.tsx` (`"use client"`), riceve dati iniziali dal Server Component padre.
6. **Pagina admin** — `src/app/admin/(dashboard)/<entity>/page.tsx` (Server Component, fa fetch iniziale via Prisma e passa al client).
7. **Notifica push / app** (se rilevante) — chiamare `sendPushToAll`/`sendPushToFilter` e `createAppNotification` fire-and-forget dentro la POST.
8. **Type check + test** — `npx tsc --noEmit && npm test` prima di committare.

### Template — API route list/create (`src/app/api/<entity>/route.ts`)

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { XxxCreateSchema } from "@/lib/schemas/xxx";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(getClientIp(req), "get-xxx", 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });
  const items = await prisma.xxx.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  const raw = await req.json().catch(() => null);
  const parsed = XxxCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  try {
    const created = await prisma.xxx.create({ data: parsed.data });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Duplicato" }, { status: 409 });
    }
    throw err;
  }
}
```

### Template — componente client interattivo (`src/components/Xxx.tsx`)

```tsx
"use client";
import { useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import { useToast } from "@/context/ToastContext";

interface XxxProps {
  initialItems: Array<{ id: string; name: string }>;
}

export default function Xxx({ initialItems }: XxxProps) {
  const [items, setItems] = useState(initialItems);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  async function handleCreate() {
    setLoading(true);
    try {
      const res = await fetch("/api/xxx", {
        method: "POST",
        body: JSON.stringify({
          /* ... */
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Errore");
      const created = await res.json();
      setItems((prev) => [created, ...prev]);
      showToast("Creato", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Errore", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ color: "text.primary" }}>
        Titolo
      </Typography>
      <Button onClick={handleCreate} disabled={loading} variant="contained">
        Crea
      </Button>
    </Box>
  );
}
```

### Template — pagina Server Component (`src/app/.../page.tsx`)

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/authjs";
import { hasRole } from "@/lib/authRoles";
import { prisma } from "@/lib/db";
import Xxx from "@/components/Xxx";

export default async function Page() {
  const session = await auth();
  if (!session?.user || !hasRole(session.user.appRole, "COACH")) {
    redirect("/admin/login");
  }
  const items = await prisma.xxx.findMany({ orderBy: { createdAt: "desc" } });
  return <Xxx initialItems={items} />;
}
```

### Aggiungere un campo "atleta" su User

- Aggiungere il campo a `User` in `prisma/schema.prisma` (nullable se opzionale).
- Aggiornare `src/lib/schemas/` se il campo è in input da form.
- Aggiornare `src/types/next-auth.d.ts` se va esposto nella sessione.
- Esporre il campo in `src/app/api/users/me/route.ts` e/o `route.ts` se serve client-side.

### Aggiungere una notifica push

- Per audience generica: `sendPushToAll(payload, adminOnly?, type?)`.
- Per squadra: `sendPushToTeam(teamId, payload, type)`.
- Per filtro (ruoli/genere): `sendPushToFilter({ sportRoles, gender }, payload, type)`.
- Sempre fire-and-forget con `.catch(console.error)` — mai bloccare la risposta API.
- Affiancare quasi sempre `createAppNotification(...)` per la versione in-app.

## Regole ferree (NEVER do)

- **Mai `as any`** senza commento `// eslint-disable-next-line` + spiegazione del perché.
- **Mai colori hardcoded** (`#fff`, `#000`, `rgb(...)`). Usare token del tema MUI: `primary.main`, `text.secondary`, ecc.
- **Mai CSS in file `.css` o `.module.css`** — tutto via `sx` prop o `styled()` di Emotion.
- **Mai `<Button component={Link}>`** in Server Component → causa runtime error. Usare `<Link href=".."><Button>...</Button></Link>`.
- **Mai `NextResponse.cookies.set()`** per cookie di sessione → bug Turbopack. Usare `res.headers.set("Set-Cookie", ...)`.
- **Mai `null` su campo `Json` Prisma** → usare `Prisma.DbNull`. Per "field non passato" usare `Prisma.JsonNull` solo dentro update.
- **Mai chiamare Prisma dentro `proxy.ts`** (middleware) → Edge Runtime non lo supporta. L'auth va nei layout/API routes.
- **Mai testo UI in inglese** — tutto in italiano (label, toast, messaggi d'errore visibili).
- **Mai default export per componenti riutilizzabili?** → No, in questo progetto i componenti usano **default export** (es. `export default function SessionCard()`). Mantenere coerenza. Utility e hook invece sono **named export**.
- **Mai `prisma db push --accept-data-loss`** manualmente in dev se non sei consapevole della perdita dati. Il build di prod lo fa, ma fallisce su data-loss changes (comportamento voluto — non aggirare).
- **Mai skippare `tsc --noEmit`** prima di un push: i deploy Vercel rompono silenziosamente se il type-check non è verde.
- **Mai chiamare `auth()` in un Client Component** — passare la session/dati utente come prop dal Server Component padre, oppure fetchare via `/api/users/me`.
- **Mai esporre dati sensibili in client props** (email altrui, ruoli admin di altri utenti che non dovrebbero vederli) — fare `select` esplicito in Prisma.
- **Mai dimenticare il rate-limit** sulle API pubbliche (GET senza auth): `checkRateLimit(getClientIp(req), "key", limit, windowMs)`.
- **Mai usare `prisma.session` quando intendi `prisma.trainingSession`** — `session` = sessione Auth.js.
- **Mai aggiungere libreria di state management** (Redux, Zustand, Jotai...) senza discuterne — il pattern attuale è useState + Context + SWR.
- **Mai introdurre nuovi alias di import** oltre `@/` → `src/`.
- **Mai committare file generati** (`.next/`, `node_modules/`, `prisma/migrations/` su branch develop senza review).
- **Mai bypassare `isCoachOrAdmin()` / `isAdminUser()`** in API route admin con controlli ad-hoc.
- **Mai usare `fetch` in Server Component per dati interni** — andare direttamente a Prisma. `fetch` interno è uno spreco e perde caching.
