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
│   │   ├── auth/[...nextauth]/   # Auth.js handler
│   │   ├── sessions/             # CRUD allenamenti (TrainingSession)
│   │   ├── registrations/        # CRUD iscrizioni
│   │   ├── teams/                # Generazione squadre
│   │   ├── users/                # Gestione utenti + me/children
│   │   ├── push/                 # Web Push (subscribe, vapid-public-key)
│   │   └── admin/preview/        # Preview ruolo per admin
│   ├── admin/
│   │   ├── login/                # Login admin (solo Google)
│   │   └── (dashboard)/          # Route group protette (utenti, sessioni)
│   ├── allenamento/[sessionId]/  # Pagina allenamento pubblico
│   ├── il-baskin/                # Regole del Baskin
│   ├── la-squadra/               # Info squadra
│   ├── contatti/                 # Contatti + mappa
│   ├── sponsor/                  # Sponsor
│   ├── login/                    # Login utente Google
│   ├── profilo/                  # Profilo utente + dati atleta + notifiche
│   ├── error.tsx                 # Pagina errore runtime (500)
│   ├── global-error.tsx          # Errore critico root layout
│   └── not-found.tsx             # Pagina 404
├── components/                   # Componenti riutilizzabili (tutti PascalCase)
├── context/
│   ├── ToastContext.tsx           # Toast globali
│   └── PreviewRoleContext.tsx     # Contesto preview ruolo admin
├── lib/
│   ├── apiAuth.ts                # Helper auth per API route (isCoachOrAdmin, isAdminUser)
│   ├── authjs.ts                 # Config Auth.js v5
│   ├── authRoles.ts              # Gerarchia ruoli + helper hasRole()
│   ├── constants.ts              # ROLE_LABELS, ROLE_COLORS, ROLES
│   ├── db.ts                     # Prisma singleton
│   ├── effectiveSession.ts       # Session con override preview ruolo
│   ├── teamGenerator.ts          # Mulberry32 PRNG seeded shuffle
│   ├── theme.ts                  # MUI theme
│   └── webpush.ts                # Invio notifiche push (sendPushToAll)
├── proxy.ts                      # Middleware (matcher vuoto — auth gestita nei layout/API)
└── types/
    └── next-auth.d.ts            # Augmentazione tipi sessione
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
| `Registration` | `Registration` | Iscrizioni (userId opzionale) |
| `User` | `User` | Utenti Auth.js + dati atleta |
| `Session` | `Session` | Sessioni OAuth (Auth.js) |
| `Account` | `Account` | Provider OAuth (Google) |
| `ParentChild` | `ParentChild` | Link genitore-figlio |
| `SportRoleHistory` | `SportRoleHistory` | Storico cambi ruolo sportivo |
| `PushSubscription` | `PushSubscription` | Subscription Web Push |

> **Attenzione naming:** `prisma.trainingSession` = allenamenti; `prisma.session` = sessioni Auth.js. Non confonderli.

**Campi atleta su User:** `sportRole Int?` (1-5), `gender Gender?` (MALE/FEMALE), `birthDate DateTime?`

## Sistema di autenticazione

**Solo Google OAuth** (Auth.js v5) — il vecchio sistema cookie HMAC è stato rimosso.

- **Ruoli:** `GUEST | ATHLETE | PARENT | COACH | ADMIN`
- **Gerarchia:** `GUEST(0) < ATHLETE(1) < PARENT(2) < COACH(3) < ADMIN(4)`
- **Accesso admin panel:** richiede ruolo `COACH` o superiore
- **Protezione API route:** usare `isCoachOrAdmin()` o `isAdminUser()` da `@/lib/apiAuth`
- **Protezione layout:** usare `auth()` da `@/lib/authjs` nei Server Component
- **`proxy.ts`:** matcher vuoto — non fa auth (Edge Runtime non supporta Prisma)
- **Account linking:** `allowDangerousEmailAccountLinking: true` sul provider Google — permette di collegare account Google a utenti pre-creati dall'admin
- **Sessione:** database strategy, durata 1 anno

**Preview ruolo (solo ADMIN):** banner fisso in basso permette di simulare qualsiasi ruolo. Usa cookie `preview_role` + `getEffectiveSession()` nei Server Component.

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
```

> `ADMIN_PASSWORD` e `COOKIE_SECRET` sono stati rimossi — non più necessari.

## Offline / PWA

Service worker (`public/sw.js`) con 3 strategie:
- **Cache-first:** asset statici (`/logo.png`, `/_next/static/*`, ecc.)
- **Network-first + cache fallback:** pagine HTML (fallback su `/offline.html` se mai visitata)
- **Stale-while-revalidate (5 min):** `GET /api/sessions*` e `GET /api/teams/*`

Pagine pre-cachate all'installazione: `/`, `/il-baskin`, `/la-squadra`, `/contatti`, `/sponsor`.

## Note importanti

- **Generazione squadre:** deterministica con Mulberry32 PRNG seedato su `sessionId` — stesso seed = stesse squadre
- **3 squadre:** supportate (Arancioni / Neri / Bianchi), opzione nel form admin
- **Neon branch:** usare branch separati per dev e prod; le variabili Vercel devono puntare al branch corretto per environment
- **Build script:** `prisma db push` nel build sincronizza automaticamente il DB di produzione — sicuro per aggiungere colonne, fallisce se ci sono data-loss changes (comportamento voluto)
- **TypeScript strict:** abilitato — nessuna eccezione; risolvere tutti gli errori prima del push
- **Turbopack cache corrotta:** se si vedono errori `.sst` nei log, usare `npm run dev:clean`
- **Mock users:** `prisma/seed.ts` crea utenti di test (es. `npx tsx prisma/seed.ts 15`) — ricordarsi di pulirli prima di andare in produzione
