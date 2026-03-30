# CLAUDE.md — Karibu Baskin

App web per la squadra di Baskin di Montecchio Maggiore (VI). Gestione allenamenti, iscrizioni, generazione squadre bilanciate, pannello admin.

## Stack

- **Framework:** Next.js 16.2.1, App Router, Turbopack, `src/` directory
- **UI:** Material-UI v6 (MUI) con tema custom arancione/nero, Emotion CSS-in-JS
- **Font:** Inter (via MUI theme)
- **Database:** PostgreSQL via [Neon](https://neon.tech) + Prisma ORM v6
- **Auth:** Auth.js v5 (`next-auth@beta`) con Google OAuth + PrismaAdapter + cookie HMAC legacy
- **Deployment:** Vercel (branch `develop`)
- **PWA:** manifest.json + service worker in `public/sw.js`
- **Analytics:** Vercel Analytics

## Comandi principali

```bash
npm run dev          # dev server (Turbopack)
npm run build        # prisma generate + next build
npm run db:migrate   # prisma migrate dev (sviluppo)
npm run db:deploy    # prisma migrate deploy (produzione)
npm run db:studio    # Prisma Studio
npx tsc --noEmit     # type check — SEMPRE prima di fare push
```

> **Importante:** eseguire sempre `tsc --noEmit` (dopo aver eliminato `.next/`) prima di committare. L'utente ha esplicitamente richiesto questo per evitare errori TypeScript su Vercel.

## Struttura cartelle

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   # Auth.js handler
│   │   ├── sessions/             # CRUD allenamenti (TrainingSession)
│   │   ├── registrations/        # CRUD iscrizioni
│   │   ├── teams/                # Generazione squadre
│   │   └── users/                # Gestione utenti + me/children
│   ├── admin/
│   │   ├── login/                # Login admin (cookie + Google)
│   │   └── (dashboard)/          # Route group protette (utenti, sessioni)
│   ├── allenamento/[sessionId]/  # Pagina allenamento pubblico
│   ├── il-baskin/                # Regole del Baskin
│   ├── la-squadra/               # Info squadra
│   ├── contatti/                 # Contatti + mappa
│   ├── sponsor/                  # Sponsor
│   ├── login/                    # Login utente Google
│   └── profilo/                  # Profilo utente + link genitore-figlio
├── components/                   # Componenti riutilizzabili (tutti PascalCase)
├── context/
│   └── ToastContext.tsx          # Toast globali
├── lib/
│   ├── auth.ts                   # Cookie HMAC admin auth
│   ├── authjs.ts                 # Config Auth.js v5
│   ├── authRoles.ts              # Gerarchia ruoli + helper hasRole()
│   ├── constants.ts              # ROLE_LABELS, ROLE_COLORS, ROLES
│   ├── db.ts                     # Prisma singleton
│   ├── teamGenerator.ts          # Mulberry32 PRNG seeded shuffle
│   └── theme.ts                  # MUI theme
├── proxy.ts                      # Middleware Edge Runtime (protezione route)
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

## Modelli Prisma principali

| Modello Prisma | Tabella DB | Scopo |
|---|---|---|
| `TrainingSession` | `TrainingSession` | Allenamenti |
| `Registration` | `Registration` | Iscrizioni (userId opzionale) |
| `User` | `User` | Utenti Auth.js |
| `Session` | `Session` | Sessioni OAuth (Auth.js) |
| `Account` | `Account` | Provider OAuth |
| `ParentChild` | `ParentChild` | Link genitore-figlio |

> **Attenzione naming:** `prisma.trainingSession` = allenamenti; `prisma.session` = sessioni Auth.js. Non confonderli.

## Sistema di autenticazione

**Doppio auth in parallelo:**
1. **Google OAuth** (Auth.js v5) → ruoli: `GUEST | ATHLETE | PARENT | COACH | ADMIN`
2. **Cookie HMAC** (legacy) → accesso diretto admin con password

Il middleware (`src/proxy.ts`) protegge le route e accetta entrambi.
Export del middleware: `export function proxy(...)` + `export const config` (Next.js 16 — non più `middleware`).

**Gerarchia ruoli** (da `authRoles.ts`):
```
GUEST(0) < ATHLETE(1) < PARENT(2) < COACH(3) < ADMIN(4)
```

## Variabili d'ambiente richieste

```
DATABASE_URL=         # Neon connection pooling URL
DIRECT_URL=           # Neon direct URL (per migrations)
ADMIN_PASSWORD=       # Password admin cookie-based
COOKIE_SECRET=        # 32 hex chars per HMAC
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
AUTH_SECRET=          # Auth.js v5 (non NEXTAUTH_SECRET)
NEXTAUTH_URL=         # URL pubblico (es. https://karibu-baskin.vercel.app)
```

## Note importanti

- **Edge Runtime:** `proxy.ts` usa `globalThis.crypto.subtle` (Web Crypto API), NON `import crypto from "crypto"` (Node.js only)
- **Generazione squadre:** deterministica con Mulberry32 PRNG seedato su `sessionId` — stesso seed = stesse squadre
- **3 squadre:** supportate (Arancioni / Neri / Bianchi), opzione nel form admin
- **Neon branch:** usare branch separati per dev e prod su Neon; le variabili Vercel devono puntare al branch corretto per environment
- **Build script:** `"build": "prisma generate && next build"` — NON usare `prisma migrate deploy` nel build (fallisce su Vercel)
- **`db push` vs migrations:** il progetto usa `prisma db push` per sviluppo e migrazioni manuali per cambi strutturali critici
- **TypeScript strict:** abilitato — nessuna eccezione; risolvere tutti gli errori prima del push
