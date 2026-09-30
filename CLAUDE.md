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
- **Rating giocatori:** sistema TrueSkill custom in `src/lib/rating/` (`trueskill.ts`, `ratingEngine.ts`, `ratingTrend.ts`) + ottimizzatore formazioni (`lineupOptimizer.ts`) + badge (`badges.ts`)
- **Analytics:** Vercel Analytics
- **Error monitoring:** Sentry (`@sentry/nextjs`) — config in `sentry.client/server/edge.config.ts`, init via `src/instrumentation.ts`, plugin in `next.config.ts` (`withSentryConfig`). Source map caricate solo in CI (`SENTRY_AUTH_TOKEN`)
- **i18n:** next-intl (it/en) **cookie-based** — vedi sezione [Internazionalizzazione](#internazionalizzazione)
- **Validazione input:** Zod v4 (schemi in `src/lib/schemas/`)
- **Data fetching client:** TanStack React Query (`useQuery`/`useMutation`); `fetch` diretto nei Server Component
- **Email transazionali:** Resend + React Email (template in `src/emails/`)
- **Storybook:** v10 (`.storybook/`, file `*.stories.tsx` accanto al componente) — `npm run storybook`
- **Linter / Formatter:** ESLint (eslint-config-next) + Prettier (`.prettierrc`: semi, double quotes, 2 spazi, printWidth 100, trailingComma es5, LF)
- **Testing:** Vitest (file `*.test.ts` accanto al sorgente — es. `src/lib/schemas/session.test.ts`, `src/app/api/sessions/route.test.ts`)
- **Date:** `date-fns` v4 con locale dinamico (`it`/`enUS`) via `src/lib/dateLocale.ts` + hook `useActiveDateLocale`
- **State management:** nessuna libreria globale di stato — solo `useState`/`useReducer` locali + Context (`ToastContext`, `NotificationContext`, `ThemeContext`, `LocaleContext`) + cache React Query

> **Data fetching client:** usare **solo** TanStack React Query. `QueryClientProvider` è in `Providers.tsx` (con `ReactQueryDevtools`). Letture con `useQuery` (polling via `refetchInterval`, `refetchOnWindowFocus`), scritture con `useMutation`; invalidare/aggiornare la cache con `queryClient.invalidateQueries`/`setQueryData`. Non reintrodurre SWR né altre librerie di fetching.

## Comandi principali

```bash
npm run dev          # dev server (Turbopack)
npm run dev:clean    # cancella .next e riavvia (fix cache Turbopack corrotta)
npm run build        # prisma migrate deploy + prisma generate + next build
npm run db:migrate   # prisma migrate dev (sviluppo — crea una nuova migration)
npm run db:deploy    # prisma migrate deploy (applica le migration pendenti)
npm run db:generate  # prisma generate
npm run db:studio    # Prisma Studio
npm run lint         # ESLint su src/
npm run format       # Prettier --write su src/
npm run format:check # Prettier --check (CI)
npm test             # Vitest run (one-shot)
npm run test:watch   # Vitest watch
npm run a11y         # axe-core su pagine fisse (anonimo/atleta/admin, desktop+mobile, tema chiaro+scuro, larghezza a 360 px) contro il dev server con ENABLE_TEST_LOGIN=true; fallisce su violazioni gravi non in e2e/a11y-baseline.json (--update-baseline per riscriverla, --only=anon,athlete,admin)
npm run email:dev    # Preview React Email (porta 3333)
npx tsc --noEmit     # type check — SEMPRE prima di fare push
```

> **Ticket UX:** audit, riaudit e ticket stanno in `docs/ux-audit/`. "Lavoriamo sul prossimo ticket" = il primo ticket disponibile secondo la tabella "Ordine di lavoro" in `docs/ux-audit/README.md` (regole di scelta e di lavoro sono lì).

> **Accessibilità:** `npm run a11y` (script `e2e/a11y.mjs`) misura con axe-core le pagine elencate nel ticket UX-01 e scrive il dettaglio in `test-results/a11y/report.json`. Utenti da `E2E_ATHLETE_EMAIL`/`E2E_ADMIN_EMAIL`, altrimenti il primo ATHLETE e il primo ADMIN del DB. Quando un ticket risolve delle violazioni, rigenerare la baseline con `npm run a11y -- --update-baseline` e committarla.

> **Importante:** eseguire sempre `tsc --noEmit` (dopo aver eliminato `.next/`) prima di committare. Il `build` script esegue `prisma migrate deploy`, che applica al DB di produzione **solo** le migration committate in `prisma/migrations/` non ancora applicate. **Non** sincronizza più lo schema automaticamente: ogni modifica a `schema.prisma` deve essere accompagnata da una migration (vedi [Workflow migrazioni](#workflow-migrazioni-db)).

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
│   │       ├── metriche/                  # Metriche d'uso dai dati del gestionale (KB-32)
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
├── components/                            # Componenti riutilizzabili — organizzati per dominio
│   ├── admin/                             # Pannello admin (Admin*Client, AuditLogClient…)
│   ├── training/                          # Allenamenti + iscrizioni + generazione squadre
│   ├── matches/                           # Partite ufficiali, stats, convocazioni
│   ├── teams/                             # Squadre agonistiche, gironi, classifiche
│   ├── news/                              # Post + sondaggi
│   ├── gallery/                           # Feed Instagram + YouTube
│   ├── rating/                            # TrueSkill, badge, sviluppo
│   ├── calendar/                          # Calendario + .ics
│   ├── profile/                           # Profilo utente, avatar, figli, prefs
│   ├── layout/                            # Header, footer, nav, providers, SW
│   ├── notifications/                     # Bell, dropdown, centro notifiche
│   └── common/                            # Componenti trasversali (hero, dialog, empty state…)
├── context/
│   ├── ToastContext.tsx                   # Toast globali
│   ├── NotificationContext.tsx            # Notifiche in-app (unread count, mark read)
│   ├── ThemeContext.tsx                   # Tema chiaro/scuro/system (persistito in localStorage)
│   └── LocaleContext.tsx                  # Lingua it/en (cookie karibu-locale) — useLocaleSwitch()
├── i18n/                                  # next-intl (cookie-based)
│   ├── locales.ts                         # LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, isValidLocale
│   ├── request.ts                         # getRequestConfig (cookie → it, niente Accept-Language)
│   └── messages/it.json, en.json          # Dizionari traduzioni
├── emails/                                # Template React Email
│   ├── ContactConfirmationEmail.tsx       # Conferma all'utente
│   └── ContactNotificationEmail.tsx       # Notifica all'admin
├── hooks/
│   ├── useRegistrationForm.ts             # Hook logica form iscrizione
│   ├── useConfirmDialog.tsx               # Dialog di conferma riutilizzabile
│   ├── useCookieConsent.ts                # Stato consenso cookie
│   ├── useEntityLabels.ts                 # Label dominio tradotte (client) — ruolo/genere/risultato
│   └── useActiveDateLocale.ts             # Locale date-fns corrente (it/enUS)
├── lib/                                   # Infra cross-cutting a root; sottosistemi di dominio in sottocartelle
│   ├── apiAuth.ts                         # Helper auth per API route (isCoachOrAdmin, isAdminUser)
│   ├── audit.ts                           # Audit logging (AuditEvent)
│   ├── authjs.ts                          # Config Auth.js v5
│   ├── authRoles.ts                       # Gerarchia ruoli + helper hasRole()
│   ├── blob.ts                            # Upload/ottimizzazione immagini (Vercel Blob + sharp)
│   ├── colorMode.ts / colorUtils.ts       # Helpers colore / contrasto tema
│   ├── constants.ts                       # ROLE_COLORS, ROLES (label tradotte via entityLabels)
│   ├── dateUtils.ts / dateLocale.ts       # Helpers date + locale date-fns (it/enUS)
│   ├── db.ts                              # Prisma singleton
│   ├── entityLabels.ts                    # Label dominio tradotte (server) — getEntityLabels()
│   ├── heroStyles.ts                      # Stili condivisi hero/PageHero
│   ├── rateLimit.ts                       # Rate limiting per API route
│   ├── registrationRestrictions.ts        # Logica restrizioni iscrizioni (shared server+client)
│   ├── slugUtils.ts                       # Generazione slug URL
│   ├── useHasMounted.ts                   # Hook anti-SSR hydration mismatch
│   ├── validators.ts                      # Validatori generici
│   ├── rating/                            # Sistema rating TrueSkill
│   │   ├── trueskill.ts                   #   Implementazione TrueSkill
│   │   ├── ratingEngine.ts / ratingTrend.ts  # Motore rating + andamento
│   │   ├── lineupOptimizer.ts             #   Ottimizzatore formazioni
│   │   ├── badges.ts                      #   Calcolo badge giocatore
│   │   └── loanDetection.ts               #   Rilevamento prestiti tra squadre
│   ├── matches/                           # Logica partite ufficiali
│   │   ├── callupContext.ts / callupStats.ts # Convocazioni
│   │   ├── matchCoverage.ts / matchQuality.ts # Copertura ruoli + qualità/bilanciamento
│   │   ├── matchResults.ts                #   Helpers risultati partite
│   │   ├── mixedTeam.ts                   #   Karibu di stagione: creazione, rose da leggere, regole
│   │   └── myAvailabilities.ts            #   Partite dell'utente/figli + disponibilità pendenti
│   ├── notifications/                     # Notifiche push + in-app
│   │   ├── webpush.ts                     #   Invio push (sendPushToAll/Team/Filter)
│   │   ├── appNotifications.ts            #   Creazione notifiche in-app
│   │   ├── notifPrefs.ts                  #   Preferenze per tipo evento
│   │   └── sessionNotify.ts               #   Notifiche legate agli allenamenti
│   ├── season/                            # Stagioni, classifiche, generazione squadre
│   │   ├── seasonUtils.ts                 #   Calcolo stagione corrente (YYYY-YY)
│   │   ├── standings.ts                   #   Calcolo classifiche gironi
│   │   └── teamGenerator.ts               #   Mulberry32 PRNG seeded shuffle
│   ├── gallery/                           # Gallery: instagram.ts (Graph API + mirror Blob) + youtube.ts (RSS)
│   ├── content/                           # Contenuti statici: faqs.ts, baskinInfo.ts, loSapevi.ts
│   └── schemas/                           # Schemi Zod per validazione input API
│       ├── child.ts, competitiveTeam.ts, event.ts, group.ts, post.ts
│       ├── match.ts, opposingTeam.ts, registration.ts, session.ts
│       └── entities.ts                    # Tipi condivisi tra schemi
├── proxy.ts                               # Middleware pass-through (matcher vuoto — auth nei layout/API)
├── theme.ts                               # MUI theme arancione/nero (lightTheme + darkTheme)
├── instrumentation.ts                     # Init Sentry per runtime (nodejs/edge)
└── types/
    └── next-auth.d.ts                     # Augmentazione tipi sessione

# (root, fuori da src/)
sentry.client.config.ts                    # Sentry browser (replay) — NEXT_PUBLIC_SENTRY_DSN
sentry.server.config.ts                    # Sentry server — SENTRY_DSN
sentry.edge.config.ts                      # Sentry edge runtime
```

## Convenzioni di codice

- **Componenti:** PascalCase (`RegistrationForm.tsx`), con `"use client"` esplicito se necessario
- **Utilities/pages/API:** lowercase (`route.ts`, `page.tsx`, `constants.ts`)
- **Costanti:** UPPER_SNAKE_CASE
- **Alias import:** `@/` → `src/` (es. `import { prisma } from "@/lib/db"`)
- **Lingua UI:** testo pubblico tradotto via next-intl (it/en) — mai stringhe hardcoded, usare `useTranslations`/`getTranslations` + dizionari `it.json`/`en.json`. Admin solo in italiano. Vedi [Internazionalizzazione](#internazionalizzazione)
- **Tipi:** interface per oggetti, type per union; mai `as any` senza commento
- **Stile MUI:** usare `sx` prop + colori dal tema (`primary.main`, `text.secondary`), mai colori hardcoded
- **Colore = significato (UX-29), palette chiusa.** Ogni tinta ha un solo significato, il resto è neutro. **Arancio** (`primary`) solo su ciò che si tocca e sullo stato attivo/selezionato (eccezioni di marchio: logo, parola "Baskin" dell'hero, bordo dell'header, OG del sito, `theme_color`). **Nero del marchio** (`secondary`) per le superfici di marchio e il neutro invertito. **Verde/ambra/rosso** (`success`/`warning`/`error`, per le partite `match.win/draw/loss`: stessi valori) solo per la valenza: positivo, a metà, negativo; mai per stati, tipi o identità. **Tinte squadra** (`palette.team`, per famiglia di maglia: Viola, Verde, Blu, Arancio, Oro, Lampone, più l'Ardesia della Karibu; stesso hex nei due temi) solo per l'identità della squadra di una stagione, come grafico o riempimento, mai come testo: sempre da `teamColor()` (hex) o `teamFill()` (fondo + etichetta bianca o scura + anello per l'Oro sulle superfici chiare) di `@/lib/teamColors`, che restituiscono `null` senza colore (nessun segno, mai l'arancio come ripiego); nel DB `CompetitiveTeam.color` è la chiave della tinta, i vecchi hex si mappano in lettura per famiglia. Verde, Arancio e Oro condividono la famiglia con vittoria, bottoni e pareggio: li separano la tonalità (ΔE ≥ 12,5) e il nome della squadra, sempre accanto al colore. **Metalli** (`medal`) solo per livelli e onori, con una forma. Ruoli Baskin: cinque tinte scure con il numero bianco (`roleColor`/`roleColorSx`, `RoleBadge`), separate dalle squadre per luminanza. `info` è neutro. Tipi, categorie, ruoli, stati temporali (`StatusPill`), KPI e statistiche sono neutri e si distinguono con icona, forma o parola. Eccezioni chiuse: casacche d'allenamento (`bib`, sempre col nome) e marchi altrui (`socialBrandColor`, `GOOGLE_BRAND`). Ogni colore ha un secondo segnale (testo, icona o forma, WCAG 1.4.1). **I valori stanno solo in `@/lib/palette`** (tema, hero, OG, email e `global-error` leggono da lì; ESLint segnala hex e `rgb()` altrove, ombre escluse; `palette.test.ts` tiene fermi i contrasti). Una tinta o un significato nuovo si discutono prima con il committente. Dettagli e numeri: [UX-29](docs/ux-audit/tickets/UX-29-palette-semantica.md)
- **Dimensioni del testo:** dalla scala del tema (`variant`, oppure `sx={{ typography: "caption" }}`), mai `fontSize` letterali nuovi: la regola ESLint li segnala. **Minimo 12 px** per qualunque testo (`caption`); `stat` per i numeri grandi. Il colore di testo secondario e' `text.secondary`, mai `text.disabled` (2,67:1)
- **Pesi del testo:** tre, dalla variante o da `FONT_WEIGHT` di `@/lib/fontWeight` (`regular` 400 testo, `semibold` 600 etichette, titoli di card, bottoni, chip, `h6`, `<strong>`; `bold` 800 per `h1`-`h5` e `stat`), mai numeri: la regola ESLint li segnala in `sx`, `style`, `*TypographyProps`, costanti e nella prop `fontWeight`. Se la variante dà già il peso giusto, niente `fontWeight` locale
- **Raggi:** dalla scala `RADIUS` di `@/lib/radius` (`sm` 6 chip e badge, `md` 8 bottoni, campi ed elementi interni, `lg` 14 card e superfici, `pill`), mai numeri negli `sx` (verrebbero moltiplicati per `shape.borderRadius`): la regola ESLint li segnala. Liberi solo `0` e `"50%"`
- **Bottoni:** tre enfasi (`contained` una per schermata, `outlined` secondaria, `text` terziaria e mai unica azione di un modulo), due taglie (40 px default, `size="large"` 48 px per CTA di pagina e invio dei moduli pubblici; `small` solo per azioni dense e admin). Niente `boxShadow` (il tema usa `disableElevation`), niente freccia "→" dentro un bottone pieno. Sugli hero scuri il bottone secondario è `variant="outlined" color="inherit"` (variante "fantasma" del tema), senza riscriverne bordo e fondo negli `sx`
- **Intestazioni di pagina (UX-32): tre modelli, nessun altro.** (1) **Hero con foto** (`HeroSection`): solo la home. (2) **Page header** (`PageHero` da `@/components/common/PageHero`) per le liste e le pagine pubbliche di contenuto: fascia di 120 px su desktop e 96 su mobile in grafite un gradino sopra l'header (`heroGradient.band`, senza bagliore), testo a sinistra, `maxWidth` uguale al Container del contenuto; props `title`, `subtitle` (una riga), `breadcrumb`, `nav` (navigazione di sezione), `action`; niente chip, icone o allineamento centrato. I `loading.tsx` usano `PageLoadingSkeleton` (stessa fascia, `PageHeroFrame`). (3) **Entity hero** (`EntityHero`) per il dettaglio di allenamento, evento, partita, giocatore, squadra e avversaria: breadcrumb su una riga con "Gestisci" dello staff (`manage`), titolo allineato al breadcrumb, `leading` (avatar), `badges`, `meta` (voci `HeroMeta`: data, ora, luogo), contenuto proprio e `actions` (condivisione); la partita ha il tabellino come contenuto e l'h1 nascosto. Area utente (`/profilo`, `/profilo/*`, `/notifiche`), admin e articolo news: **nessuna fascia**, `PageHeader` da `@/components/common/PageHeader` (breadcrumb, h1 nel contenitore, azione). Nelle intestazioni scure le azioni dello staff sono sempre `StaffManageButton` (nello slot `action` o `manage`, mai un bottone nel contenuto) e la condivisione è una riga di bottoni fantasma con etichetta (`ShareSection dark`, `PlayerShareButtons`). Titoli di sezione (h2) con `variant="h4"`: 24 px su telefono, 28 da `md`
- **Larghezze delle pagine (UX-37):** header e fasce a tutta larghezza (scelta del committente); dentro, `Container maxWidth="lg"` (1.200 px, margini 16/24/32 px dal tema) e una **colonna centrata** larga quanto serve al contenuto, la stessa per intestazione e contenuto, così la pagina resta simmetrica. Tre colonne da `@/lib/layout` (`columnSx(column)`): **piena** (1.136 px) per griglie e tabelle (marcatori, classifiche, calendario, eventi, gallery, archivio, home); **`main`** (880 px) per le pagine a colonna singola (allenamenti, partite, risultati, squadre, sfida, confronto, contatti, profilo e sottopagine, notifiche escluse, e tutti i dettagli con `EntityHero`); **`reading`** (760 px) per i testi lunghi (il Baskin, FAQ, privacy, sponsor, news, notifiche, questionario). Si passa a `PageHero column=…`, `EntityHero column=…` (default `main`), `PageLoadingSkeleton column=…`, e nel contenuto `<Box sx={columnSx("main")}>` dentro il `Container`. Le righe partita (`/partite`, `PlayedMatchRow`) da `sm` in su sono una griglia a colonne fisse (data | noi | punteggio o "vs" | loro | esito o meta): il punteggio sta alla stessa x in tutte le righe
- **Server vs Client:** le pagine in `app/` sono Server Components di default; aggiungere `"use client"` solo dove serve interattività
- **Bottoni che portano a una pagina:** `<Button href="/x">` (anche `IconButton`, `MenuItem`, `MuiLink`), in Server e Client Component. Il tema monta `LinkBehavior` (`src/components/common/LinkBehavior.tsx`) come link di default: rende `next/link` (navigazione lato client) e un `<a>` semplice per esterni, `mailto:`/`tel:`/`webcal:`, `/api/*` e `download` (regole in `@/lib/linkTarget`). Mai `<Link><Button>` (HTML non valido, due fermate di Tab) né `<Button component={Link}>` in un Server Component (errore runtime)
- **Select con valore vuoto:** usare `displayEmpty` + `InputLabel shrink` + `notched` per evitare sovrapposizione etichetta

## Modelli Prisma principali

| Modello Prisma         | Tabella DB             | Scopo                                                   |
| ---------------------- | ---------------------- | ------------------------------------------------------- |
| `TrainingSession`      | `TrainingSession`      | Allenamenti                                             |
| `Registration`         | `Registration`         | Iscrizioni (userId o childId o anonimo)                 |
| `User`                 | `User`                 | Utenti Auth.js + dati atleta                            |
| `Session`              | `Session`              | Sessioni OAuth (Auth.js)                                |
| `Account`              | `Account`              | Provider OAuth (Google)                                 |
| `Child`                | `Child`                | Figli senza account, gestiti da uno o più genitori      |
| `ChildGuardian`        | `ChildGuardian`        | Collegamento genitore ↔ figlio (più genitori paritari)  |
| `LinkRequest`          | `LinkRequest`          | Richiesta collegamento genitore-figlio                  |
| `SportRoleHistory`     | `SportRoleHistory`     | Storico cambi ruolo sportivo                            |
| `PushSubscription`     | `PushSubscription`     | Subscription Web Push                                   |
| `Season`               | `Season`               | Stagioni sportive (es. "2025-26")                       |
| `CompetitiveTeam`      | `CompetitiveTeam`      | Squadre agonistiche per stagione                        |
| `TeamMembership`       | `TeamMembership`       | Appartenenza giocatore (User o Child) a una squadra     |
| `Match`                | `OfficialMatch`        | Partite ufficiali                                       |
| `OpposingTeam`         | `OpposingTeam`         | Squadre avversarie                                      |
| `PlayerMatchStats`     | `PlayerMatchStats`     | Statistiche giocatore per partita                       |
| `Event`                | `Event`                | Eventi generici (tornei, trasferte…)                    |
| `EventAttendance`      | `EventAttendance`      | RSVP a un evento (User o Child) + note                  |
| `EventOption`          | `EventOption`          | Sotto-opzione di un evento articolato (sessione/pasto…) |
| `EventOptionSelection` | `EventOptionSelection` | Selezione di una sotto-opzione (User, Child o esterno)  |
| `EventGuest`           | `EventGuest`           | Esterno (+1) portato a un evento da chi risponde        |
| `EarnedBadge`          | `EarnedBadge`          | Badge/traguardi sbloccati (User o Child)                |
| `AppNotification`      | `AppNotification`      | Notifiche in-app                                        |
| `AppNotificationRead`  | `AppNotificationRead`  | Tracking lettura notifiche per utente                   |
| `Group`                | `Group`                | Gironi di campionato                                    |
| `GroupCompetitiveTeam` | `GroupCompetitiveTeam` | Nostre squadre iscritte a un girone                     |
| `GroupTeam`            | `GroupTeam`            | Squadre avversarie iscritte a un girone                 |
| `GroupMatch`           | `GroupMatch`           | Partite di girone                                       |
| `MatchCallup`          | `MatchCallup`          | Convocazioni giocatore per partita                      |
| `MatchAvailability`    | `MatchAvailability`    | Disponibilità giocatore a una partita                   |
| `MatchMvp`             | `MatchMvp`             | MVP votati per partita                                  |
| `RatingUpdate`         | `RatingUpdate`         | Storico aggiornamenti rating TrueSkill                  |
| `Post`                 | `Post`                 | News/post della bacheca                                 |
| `Poll`                 | `Poll`                 | Sondaggi abbinati ai post                               |
| `PollOption`           | `PollOption`           | Opzioni di un sondaggio                                 |
| `PollVote`             | `PollVote`             | Voti dei sondaggi                                       |
| `TrainingMatchResult`  | `TrainingMatchResult`  | Risultati partitelle a fine allenamento                 |
| `AuditEvent`           | `AuditEvent`           | Log azioni admin (audit trail)                          |
| `InstagramPost`        | `InstagramPost`        | Post Instagram mirrorati per la Gallery                 |
| `VerificationToken`    | `VerificationToken`    | Token verifica Auth.js                                  |

> **Genitori dei figli:** un `Child` ha uno o più genitori in `ChildGuardian`, tutti paritari. Ogni controllo "è suo genitore?" passa da `@/lib/guardians` (`guardianOf`, `isGuardian`); dettagli in [`docs/workflows/06-genitore-figlio.md`](docs/workflows/06-genitore-figlio.md).
> **Attenzione naming:** `prisma.trainingSession` = allenamenti; `prisma.session` = sessioni Auth.js. Non confonderli.
> **`Match` → `OfficialMatch`:** il modello si chiama `Match` in Prisma ma la tabella DB è `OfficialMatch` (via `@@map`).

**Campi atleta su User:** `sportRole Int?` (1-5), `sportRoleVariant String?`, `gender Gender?`, `birthDate DateTime?`, `slug String?` (URL leggibile), `sportRoleSuggested Int?` (in attesa di conferma admin)

**Campi Registration:** `role Int`, `note String?`, `anonymousEmail String?` (per riconoscimento iscrizioni anonime), `userId String?`, `childId String?` (al più uno non-null)

## Sistema di autenticazione

**Due provider** (Auth.js v5) — **nessun CredentialsProvider, nessuna password**:

1. **Google OAuth** — via principale, usata dalla maggior parte degli utenti.
2. **Magic link via Resend** (`next-auth/providers/resend`) — link monouso inviato per email. Esiste perché una parte della rosa usa indirizzi Alice/Libero/Yahoo/Hotmail, che non sono account Google e non potrebbero altrimenti accedere. Implementazione in `src/lib/authEmail.ts` (`sendMagicLinkEmail`: template React Email `MagicLinkEmail`, lingua dal cookie `karibu-locale`, rate limit 5 richieste / 15 min **per indirizzo**), template in `src/emails/MagicLinkEmail.tsx`, UI in `MagicLinkForm` + pagina `/login/verifica` (`pages.verifyRequest`). Token valido 24h, monouso, richiede `VerificationToken` (già a schema).

> **Nome di chi entra col magic link:** il magic link funziona anche per chi non è stato pre-creato dallo staff (Auth.js crea un utente GUEST), ma porta solo l'email e l'utente nasce **senza nome**. Il layout radice monta allora `MissingNameDialog` ("Come ti chiami?", non chiudibile, con "Esci") su qualunque pagina. Il nome si salva con `PUT /api/users/me { name }` → `setOwnName` in `@/lib/userName`: genera lo slug la prima volta, e per i GUEST manda allo staff la notifica "nuovo utente", che per questi utenti **non** parte da `createUser` (lì ci sarebbe solo l'email). Il nome si modifica dal profilo anche con un account Google collegato: Google lo riempie solo se manca, non lo riscrive a ogni accesso. Rete di sicurezza: il form d'iscrizione chiede il nome se manca, e la POST `/api/registrations` lo salva sul profilo.

> La pagina `/login/verifica` non conferma mai se l'indirizzo esiste: stesso testo in ogni caso, per non trasformare il form in un oracolo di enumerazione degli iscritti.

- **Ruoli:** `GUEST | ATHLETE | PARENT | COACH | ADMIN`
- **Gerarchia:** `GUEST(0) < ATHLETE(1) < PARENT(2) < COACH(3) < ADMIN(4)`
- **Accesso admin panel:** richiede ruolo `COACH` o superiore
- **Protezione API route:** usare `isCoachOrAdmin()` o `isAdminUser()` da `@/lib/apiAuth`. Per le GET di staff preferire `staffGuard()`, che distingue 401 (nessuna sessione) da 403 (sessione senza permessi)
- **Tesserato non vuol dire autenticato:** il login è aperto a qualunque account Google e un nuovo utente nasce `GUEST` (default dello schema). Per i dati nominativi dei tesserati (rose, iscritti, statistiche per nome, minori) il controllo è `isMember()` da `@/lib/apiAuth` o `isMemberRole(appRole)` da `@/lib/authRoles` (ATHLETE o superiore), **mai** la sola presenza della sessione
- **Protezione layout:** usare `auth()` da `@/lib/authjs` nei Server Component
- **`proxy.ts`:** matcher vuoto — non fa auth (Edge Runtime non supporta Prisma)
- **Account linking:** `allowDangerousEmailAccountLinking: true` sul provider Google — permette di collegare account Google a utenti pre-creati dall'admin
- **Slug al primo accesso:** la POST `/api/users` (creazione admin) non genera lo `slug`. Lo fa il callback `signIn` in `authjs.ts`, che ha **due rami**: Google (aggiorna la foto e riempie il nome solo se manca) e magic link (genera solo lo slug dal nome già a DB, non essendoci profilo OAuth). Toccando uno dei due, verificare l'altro.
- **Sessione:** database strategy, 90 giorni con rinnovo a scorrimento (`updateAge` 24h): chi usa l'app resta collegato, un dispositivo abbandonato decade da solo. "Esci da tutti i dispositivi" in `/profilo` → Privacy (`SignOutEverywhereButton`, `DELETE /api/users/me/sessions`)
- **Immagine profilo:** aggiornata ad ogni login tramite callback `signIn` in `authjs.ts` (salva `image` da Google profile; `name` solo se vuoto, così non sovrascrive il nome scritto dallo staff o dall'utente). Richiede `lh3.googleusercontent.com` in `next.config.ts` `images.remotePatterns`.

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
- **Invio:** `sendPushToAll(payload, adminOnly?, type?)` / `sendPushToTeam(teamId, ...)` / `sendPushToFilter({ sportRoles, gender }, ...)` da `@/lib/notifications/webpush.ts`
- **Niente dati nominativi in `sendPushToAll`:** raggiunge anche le iscrizioni push anonime (`PushSubscription.userId` nullo) e gli account GUEST. Nomi, compleanni e simili vanno ai soli tesserati con `sendPushToUsers` + `createTargetedAppNotifications` (vedi il cron `birthday-notifications`)
- **Trigger automatici:** nuovo allenamento (tutti), squadre generate (tutti), nuovo utente GUEST (solo admin); inoltre i cron giornalieri (vedi sotto) inviano promemoria
- **Subscribe UI:** `NotificationPrefsPanel` nella pagina profilo
- **Cron Vercel** (autorizzati via `CRON_SECRET`, in `src/app/api/cron/`):
  - `cleanup-notifications` — pulizia notifiche vecchie (domenicale)
  - `birthday-notifications` — auguri di compleanno
  - `training-open-reminder` — promemoria apertura iscrizioni allenamento
  - `match-availability-reminder` — promemoria conferma disponibilità partita
  - `match-callup-reminder` — promemoria convocazioni
  - `match-coverage-alert` — alert copertura ruoli insufficiente
  - `instagram-sync` — sincronizza il feed Instagram nella Gallery (giornaliero, 06:00 — il piano Vercel Hobby consente cron al massimo 1 volta/giorno)

## Sottosistemi recenti

- **Rating / TrueSkill:** in `src/lib/rating/` — `trueskill.ts` (implementazione), `ratingEngine.ts` (applicazione ai risultati), `ratingTrend.ts` (andamento), `RatingUpdate` (storico). Usato da `lineupOptimizer.ts` per suggerire formazioni bilanciate (UI: `LineupOptimizerSection`) e dal tracker sviluppo (`/admin/sviluppo`, `DevelopmentTracker`). Badge derivati in `badges.ts`.
- **News / bacheca:** modelli `Post` + `Poll`/`PollOption`/`PollVote`. API `posts/` (+ `posts/admin/`) e `polls/[id]/vote`. Admin: `/admin/news` (`AdminNewsClient`, `PostEditor`, `PollEditor`). Pubblico: `/news` e `/news/[slug]`. Widget: `PollWidget`, `LatestNewsHero`.
- **Disponibilità & convocazioni:** `MatchAvailability` (l'atleta dichiara la disponibilità per una partita) e `MatchCallup` (lo staff convoca). API `matches/[matchId]/availability` e `/callups`, più `users/me/availabilities`. UI utente: `/profilo/disponibilita` (`MieDisponibilitaClient`); UI staff: `/admin/partite/[matchId]/convocazioni` (`ConvocazioniClient`). Logica: `callupContext.ts`, `callupStats.ts`, `matchCoverage.ts`. Le partite per cui l'utente (e i figli) può dichiarare la disponibilità le calcola solo `loadMyAvailabilityMatches` in `myAvailabilities.ts`, condiviso da pagina, API e contatore. In un'amichevole interna un giocatore sta su un solo lato: la PUT `/callups` lo toglie dall'altro.
- **Squadra Karibu di stagione (`CompetitiveTeam.isMixed`, nome del campo storico):** ogni stagione ha una squadra "Karibu" che l'app crea da sola (`ensureClubTeam`, id fisso `karibu-<stagione>`, chiamato da `/admin/partite` per la stagione in corso). Non ha una rosa propria: gioca con **tutti i giocatori della stagione** (i tesserati delle altre squadre di quella stagione), solo amichevoli e tornei (mai `LEAGUE`, mai un girone). È **nascosta ovunque** (`/admin/squadre`, `/squadre`, archivio, sitemap, ricerca, `GET /api/competitive-teams`; il suo URL pubblico risponde 404) tranne che nel form partita dello staff, dove compare solo con tipo Amichevole o Torneo. Non si crea, modifica o elimina a mano (le API lo rifiutano: eliminarla cancellerebbe a cascata le sue partite) e non conta nel limite di 2 squadre. Nei testi per lo staff si chiama "Karibu, tutti i giocatori della stagione", mai "squadra mista". Ovunque si ricavano i giocatori di una squadra dai `TeamMembership`, passare da `@/lib/matches/mixedTeam`: `rosterTeamIds` (squadra → rose da leggere) e `withMixedTeams` (giocatore → squadre per cui può giocare). Per la Karibu nessun tesserato della stagione è "in prestito".
- **Vieni a provare + luogo (UX-15):** la sezione `TryItSection` in `/contatti#vieni-a-provare` (costante `TRY_IT_HREF` in `@/lib/clubVenue`) mette in una schermata i prossimi allenamenti veri (`GET /api/sessions?upcoming=true&limit=3`), la sede, cosa portare e il modulo contatti; tutte le CTA per chi non è tesserato puntano lì (hero anonimo con `HeroSection visitor`, `JoinUsCta`, home senza allenamenti, `/squadre`). `TrainingSession.location` è facoltativo: null = sede abituale, `trainingLocation()` e `CLUB_VENUE` in `@/lib/clubVenue`; il form staff lo precompila con la sede e l'hero dell'allenamento lo mostra con un link a Google Maps (niente embed, niente cookie). Dopo l'iscrizione `RegistrationSummary` resta in cima alla pagina: i dati vengono da `GET /api/registrations?sessionId=…&mine=1`, che per chiunque abbia fatto l'accesso (GUEST compresi) restituisce solo le iscrizioni proprie e dei figli
- **Home uguale per tutti + prossima azione (UX-16):** stesso ordine di sezioni per anonimi, GUEST e tesserati (allenamenti, partite, news, "Lo sapevi", chi siamo; "Unisciti a noi" solo senza account). Cambia solo la testa: atleti e genitori hanno la hero compatta con saluto (`HeroSection member`) e la card `NextActionCard` (dati da `loadNextAction` in `@/lib/nextAction`, una sola azione in ordine di urgenza: disponibilità da dare, allenamento aperto a cui iscriversi o iscrivere un figlio, prossimo allenamento a cui si è iscritti, "Sei a posto"); la stessa card sta in `/profilo` sotto l'identità. Lo staff tiene il banner delle disponibilità. Ai tesserati niente "Vieni a provare"
- **Accoglienza account in attesa (GUEST):** la home dei GUEST non è quella istituzionale: `HeroSection guest` (più bassa, saluto per nome, CTA allenamenti e ruolo), card "I tuoi primi passi" sovrapposta (`GuestOnboardingCard` + `GuestOnboardingSection`, dati da `loadGuestOnboarding` in `@/lib/guestOnboarding`: account, ruolo, primo allenamento, conferma staff), poi allenamenti prima di partite e news, niente `JoinUsCta`. La stessa card sta in cima a `/profilo`. Quando l'account diventa ATHLETE la card sparisce da sola. Date della card formattate con `timeZone: "Europe/Rome"` (render anche sul server)
- **Questionario del ruolo fuori dagli allenamenti:** `/profilo/ruolo` (`RoleQuizClient`, riusa `SportRoleQuestionnaire`) salva il suggerimento con `PUT /api/users/me/sport-role-suggestion` (409 se lo staff ha già confermato un ruolo). Il form d'iscrizione, con un suggerimento già salvato, parte dal riepilogo invece di rifare le domande
- **MVP partita:** `MatchMvp` + `matches/[matchId]/mvps`. La classifica marcatori (`/marcatori`) mostra anche conteggio MVP stagionale e % di realizzazione.
- **Badge / traguardi:** definizioni in `src/lib/rating/badges.ts` (`computeBadges`, `computeBadgeState` con avanzamento "prossimi traguardi"). Persistenza in `EarnedBadge` (User **o** Child, una riga per badge sbloccato). Il servizio `src/lib/rating/badgeService.ts` (`loadBadgeInput`, `reconcilePlayerBadges`) ricalcola, persiste i nuovi e notifica (in-app `BADGE_UNLOCKED` + push) il giocatore — o il **genitore** per i figli. Agganciato fire-and-forget a `matches/[matchId]/stats` e `/mvps`. UI: `BadgeShowcase` (in `components/rating/`) usato dal profilo pubblico (`/giocatori/[slug]`) e dal proprio profilo (`/profilo`, anche per i figli). **Dopo il deploy eseguire una tantum `POST /api/admin/badges/backfill`** (admin) per popolare `EarnedBadge` dallo storico **senza notifiche**: salta questo passo e la prima modifica stats di un giocatore già "decorato" gli notificherebbe in blocco tutti i badge storici.
- **Tema chiaro/scuro:** `ThemeContext` + `lightTheme`/`darkTheme` in `theme.ts`. Lo switch è nel menu utente (header) e nel drawer mobile. Usare sempre token semantici del tema (`text.primary`, `background.paper`, …): i colori hardcoded rompono il dark mode.
- **Eventi pubblici + RSVP:** il modello `Event` (con `slug` e `imageUrl`) è esposto pubblicamente su `/eventi` (lista prossimi/passati) e `/eventi/[slug]` (dettaglio con copertina, mappa, descrizione). RSVP via `EventAttendance` (status `GOING|MAYBE|NOT_GOING` + `note`, una riga per persona: User, Child o esterno). **In famiglia risponde uno per tutti:** `EventRsvp` mostra la famiglia di chi guarda (`loadFamily` in `@/lib/eventFamily`: figli, scheda figlio propria, genitori, fratelli, altro genitore, ricavati da `ChildGuardian` e `Child.userId`), e chiunque ne fa parte risponde per tutti, adulti compresi, con un solo salvataggio `PUT /api/events/[eventId]/rsvp` (`saveFamilyRsvp` in `@/lib/eventRsvp`). Ogni persona ha **una sola riga**, condivisa: per chi ha sia scheda figlio sia account la riga canonica è quella della scheda (`childId`), una vecchia riga sull'account si legge come ripiego e si cancella al salvataggio. `respondedById` dà il "Risposto da …"; si riscrivono solo le righe cambiate. **Opzioni** (`EventOption`: sessione/pasto/pernotto, dall'admin nel dialog evento): **indipendenti dalla presenza** (`EventOptionSelection`), si può venire all'evento senza il pranzo o solo al pranzo (No + Pranzo); Il modulo (`EventRsvp`) ha una scheda per persona con una domanda Sì/No per riga (presenza all'evento, poi ogni extra): **niente "Forse"** (resta nei dati per le risposte vecchie e nel riepilogo staff), e chi risponde all'evento deve rispondere anche a ogni extra, così "No al pranzo" e "non ci ho pensato" non si confondono; nei dati un extra non scelto da chi ha uno stato vale No. Il totale di un extra lo danno le risposte (niente campo "per quanti"). **Esterni** (`EventGuest`, +1 di chi non è nell'app, nome facoltativo): solo se lo staff li ammette (`Event.allowGuests`, massimo `maxGuests` per chi risponde). Li vede e modifica **solo chi li ha aggiunti** (e lo staff), non il resto della famiglia: scelta del committente, quindi due genitori possono aggiungere la stessa persona e lo si vede solo dal riepilogo staff. **Riepilogo staff:** in `/admin/eventi` la colonna "Risposte" apre `EventResponsesDialog` (totali, filtro per extra, elenco con note ed esterni sotto chi li ha portati, avviso sui possibili doppioni fra esterni, filtro "Solo chi gioca" = chi ha un ruolo Baskin anche se nell'app è un genitore, con i Ci sarò per ruolo) con "Scarica CSV"; dati da `GET /api/events/[eventId]/responses[?format=csv]` (staff, `summarizeResponses` in `@/lib/eventResponses`, CSV con `@/lib/csv`). API vecchie `PUT /api/events/[eventId]/attendance` e `/selections` restano per le pagine ancora aperte; `PUT/GET /api/events/[eventId]/options` (staff, replace in blocco). Alla creazione l'evento notifica push + in-app (`NEW_EVENT`). Gli URL risolvono `slug OR id` (eventi vecchi senza slug funzionano via id; lo slug viene generato alla creazione/modifica). Il dialog del calendario linka al dettaglio pubblico.
- **Ricerca globale:** `GET /api/search?q=` cerca su giocatori, squadre, avversarie, news, eventi (rate-limited, `q ≥ 2`). **Privacy:** esclude account `GUEST` e i minori (User: età < 18 da `birthDate`, senza data = adulto; `Child`: minore salvo una data che provi il contrario). UI `GlobalSearch` (icona nell'header, dialog con risultati raggruppati, React Query debounced).
- **Tutela dei minori sulle superfici pubbliche:** chi non è tesserato (anonimo o `GUEST`) non vede i minori su `/marcatori`, rose squadra, dettaglio partita, `/giocatori/confronta` e nelle GET di partita, statistiche, MVP, convocazioni e squadra; il profilo pubblico di un minore risponde 404 e la sua immagine OG è generica. Le immagini condivisibili con cache CDN pubblica (il tabellino `/api/matches/[matchId]/tabellino`) sono uguali per chiunque le chieda e quindi **non contengono mai minori**, nemmeno se le genera un tesserato. I tesserati vedono tutto. Gli adulti mantengono il ruolo Baskin pubblico (decisione del committente, settembre 2026). Regole in `@/lib/minors`: per le liste usare `publicSubjects(items, viewerIsMember)`, che filtra i minori e **toglie sempre `birthDate`**: la data serve solo a decidere e non deve mai arrivare al client, nemmeno per gli adulti. Ogni nuova superficie che mostra giocatori per nome deve passare di qui
- **Strumenti staff per preparare i dati (backfill):** (1) **Nuovo figlio** in `/admin/utenti/nuovo-figlio` (`AdminNuovoFiglioClient`, `POST /api/admin/children`): lo staff sceglie il genitore e crea il figlio collegato; `?parentId=` preseleziona il genitore (link "Aggiungi figlio" nella scheda utente). Un genitore GUEST può essere promosso a PARENT nello stesso passo; il consenso del genitore è una dichiarazione dello staff, senza spunta `parentalConsentAt` resta null. (2) **Gestione iscritti** (`ManageParticipantsDialog`, `POST /api/sessions/[sessionId]/registrations`), dal pulsante "Gestisci" del roster e da "Iscritti" nelle card di `/admin/allenamenti`: iscrive utenti o figli anche ad allenamenti passati o chiusi, senza finestre temporali né restrizioni, e con "Segna presente" attivo di default se l'allenamento è iniziato; si toglie con `DELETE /api/registrations/[regId]`. Ricerca persone condivisa: `GET /api/admin/people` + `usePeopleSearch`. Entrambe le azioni finiscono nell'audit (`CREATE_CHILD`, `ADD_REGISTRATION`). **`/admin/allenamenti` è l'unico posto per gestire un allenamento** (UX-14): tre schede, **Prossimi** (`AdminUpcomingList`: iscritti → iscrizioni aperte/chiuse → squadre), **Da completare** e **Conclusi** (`AdminAllenamentiClient`, con `TrainingCloseForm`), più "Nuovo allenamento" (`AdminSessionForm`) e, su ogni allenamento, Modifica/Elimina (`SessionActions`, `SessionEditDialog`). Accetta `?sezione=`, `?apri=<id>` e `?modifica=<id>`. La pagina pubblica `/allenamenti` e le card della home hanno per lo staff solo "Gestisci" verso l'admin; il vecchio `/allenamenti?edit=<id>` reindirizza. Le squadre si gestiscono con `AdminSessionTeams`: generazione automatica, composizione a mano (squadre vuote + gruppo "Da assegnare" nell'editor di `TeamDisplay`) e spostamenti. La POST `/api/teams/[sessionId]` esclude chi è segnato assente (i non segnati, `attended` NULL, restano: in SQL `NOT { attended: false }` li scarterebbe) e non notifica "Squadre pronte" se l'allenamento è già finito. **Chiusura di un allenamento** (UX-13): una riga chiusa per allenamento, se ne apre una alla volta; dentro `TrainingCloseForm` presenze con due bottoni Presente/Assente (nessuno = non segnato, niente stati ciclici), squadre, punteggi delle partitelle e un solo salvataggio ("Salva e concludi" / "Salva senza concludere"). Le presenze si salvano in blocco con `PUT /api/sessions/[sessionId]/attendance`; i risultati passano ancora dalle API `match-results` (ricalcolano il TrueSkill). Logica pura in `@/lib/trainingClose`
- **Chi ha un profilo pubblico:** regola unica in `@/lib/publicProfile`. Mai i `GUEST`; i `PARENT` solo se hanno un ruolo Baskin **e** almeno una partita ufficiale giocata (`PlayerMatchStats`); tutti gli altri sì. Vale per `/giocatori/[slug]` (404), immagine OG, confronto, ricerca e sitemap (`publicProfileUserFilter()`). Le liste che linkano i profili (rose, convocati, iscritti, compleanni) passano l'utente da `withProfileLink` (select con `PUBLIC_PROFILE_SELECT`): `slug` null = nome senza link. La data di nascita non compare su nessun profilo pubblico. Eccezione: lo staff (COACH+) apre anche i profili non pubblici (banner "non pubblico", niente condivisione, `noindex`) dal pulsante "Profilo" nel dialog di `/admin/utenti`, e su ogni profilo utente vede la sezione "Figli" con i link ai profili dei figli
- **TrueSkill visibile solo a COACH e ADMIN:** il simulatore `/squadre/sfida` è per tutti i tesserati, ma il calcolo avviene sul server (`POST /api/simulator`, `runSimulation` in `src/lib/rating/simulatorServer.ts`) e il client riceve solo probabilità e punteggio. Le formazioni sono validate lato server con le regole Baskin, così non si ricava il rating di una singola persona con un uno contro uno. Mai `ratingMu`/`ratingSigma` nelle risposte ai non-staff (`omit` nelle rotte dei figli), e `withoutRatings()` da `@/lib/season/teamGenerator` sulle squadre degli allenamenti, sia al salvataggio sia in lettura
- **Squadre degli allenamenti = dati nominativi:** il JSON `TrainingSession.teams` contiene nome, ruolo e genere di ogni atleta. `/api/sessions`, `/api/sessions/[id]`, `/api/teams/[sessionId]`, la home e `/allenamenti` lo passano solo ai tesserati; per gli altri `teams` è `null`. Lo stesso vale per `TrainingMatchResult.rostersSnapshot` (roster congelati delle partitelle, per il TrueSkill): non esce mai dalla GET dei risultati, che restituisce solo i punteggi
- **Suggerimenti:** modelli `Suggestion` + `SuggestionNote`. Gli utenti autenticati inviano un suggerimento (`POST /api/suggestions`), lo staff li gestisce da `/admin/suggerimenti` (`AdminSuggerimentiClient`, API `suggestions/[id]` e `notes/`). L'autore (`userId`) non è mai esposto in UI
- **Metriche d'uso (`/admin/metriche`):** calcolate dai dati già nel database, senza tracciamento aggiuntivo: il piano Vercel Hobby non registra eventi personalizzati (`track()`), quindi non aggiungerne. Calcoli puri e testati in `@/lib/metrics/adminMetrics`, query in `loadAdminMetrics.ts`. "Utenti attivi" si ricava dalla scadenza a scorrimento delle sessioni: la durata sta in `@/lib/sessionPolicy`, condivisa con `authjs.ts`, e se cambia lì la metrica resta coerente. I rapporti senza dati sono `null` ("n.d."), mai 0%
- **Dati strutturati (JSON-LD):** `@/lib/structuredData` + componente `JsonLd`, che serializza neutralizzando `</script>`. `SportsOrganization` in home, `NewsArticle` sulle news, `Event` sugli eventi, `SportsEvent` sulle partite, con i dati ufficiali della pagina Contatti. Mai markup `Person` per i giocatori
- **Confronto giocatori + trend:** `/giocatori/confronta?a=&b=` mette a confronto due giocatori (partite, punti, media, %, MVP, badge) con selettore `ComparePicker` (autocomplete via `/api/search`). Il profilo pubblico mostra l'andamento punti con `PointsTrendChart` (SVG puro, niente librerie) e un pulsante "Confronta".
- **Gallery:** feed Instagram automatico + video YouTube. Il cron `instagram-sync` (giornaliero alle 06:00, `vercel.json` — su piano Hobby i cron Vercel possono girare al massimo 1 volta/giorno: schedule sub-giornaliere fanno **fallire il deploy**) chiama `syncInstagram()` (`src/lib/gallery/instagram.ts`): scarica gli ultimi post via **Instagram Graph API** (account Business → `IG_ACCESS_TOKEN` + `IG_BUSINESS_ACCOUNT_ID`), **ri-carica le immagini su Vercel Blob** (gli URL CDN di IG scadono) e fa upsert in `InstagramPost`. La pagina pubblica `/gallery` legge dal DB (`GalleryGrid` con lightbox) + sezione video da `gallery/youtube.ts` (feed RSS, `YOUTUBE_CHANNEL_ID`, embed `youtube-nocookie` con click-to-load). Admin: `/admin/gallery` (`AdminGalleryClient`) per sync manuale e moderazione (`hidden`/elimina). API: `gallery/sync` (POST, staff) e `gallery/[id]` (PATCH/DELETE). Mai linkare direttamente `media_url` di IG: scadono.

## Internazionalizzazione (i18n)

Multilingua **it/en** con [next-intl](https://next-intl.dev), strategia **cookie-based** (la lingua è nel cookie `karibu-locale`, **non** nell'URL — niente prefissi `/it` `/en`). Plugin attivato in `next.config.ts` (`createNextIntlPlugin("./src/i18n/request.ts")`).

**File chiave (`src/i18n/`):**

- `locales.ts` — `LOCALES = ["it","en"]`, `DEFAULT_LOCALE = "it"`, `LOCALE_COOKIE = "karibu-locale"`, helper `isValidLocale()`
- `request.ts` — `getRequestConfig`: legge la lingua dal cookie, altrimenti `it`. Carica `messages/<locale>.json`. **Nessun fallback su `Accept-Language`**, di proposito: senza prefissi negli URL, lo stesso indirizzo cambierebbe lingua a seconda di chi lo chiede, e i motori vedrebbero contenuti inglesi con metadati italiani. Un URL senza cookie è sempre italiano; l'inglese è una preferenza esplicita (selettore di lingua). Test in `request.test.ts`
- `messages/it.json` + `messages/en.json` — dizionari delle traduzioni

**Wiring:**

- `Providers.tsx` monta `<LocaleContextProvider>` (il `NextIntlClientProvider` è fornito automaticamente dal plugin via root layout)
- `src/context/LocaleContext.tsx` — `useLocaleSwitch()` → `{ locale, setLocale, isPending }`. `setLocale` scrive il cookie e fa `router.refresh()` dentro una `startTransition`
- `src/components/layout/LanguageSwitcher.tsx` — UI di cambio lingua (header / drawer)

**Uso nei componenti:**

- Client: `useTranslations("namespace")` da `next-intl`
- Server: `getTranslations("namespace")` da `next-intl/server`
- **Label di dominio condivise** (ruolo sportivo, genere, risultato partita, colori squadra): NON hardcodare in italiano. Usare gli helper centralizzati che sostituiscono i vecchi `ROLE_LABELS`/`GENDER_LABELS`/`MATCH_RESULT_META.label`:
  - Client: `useEntityLabels()` da `@/hooks/useEntityLabels`
  - Server: `await getEntityLabels()` da `@/lib/entityLabels`
- **Date localizzate:** `useActiveDateLocale()` (client) o `getDateFnsLocale(locale)` da `@/lib/dateLocale` per ottenere il locale `date-fns` corretto (`it`/`enUS`)

**Scope:** solo UI **pubblica** tradotta; il pannello **admin resta solo in italiano**. Gli **URL non sono localizzati** (`/squadre` resta `/squadre` anche in inglese) — scelta deliberata legata al routing cookie-based.

> Regola: ogni nuovo testo UI pubblico va aggiunto a **entrambi** i dizionari (`it.json` + `en.json`) e referenziato via `useTranslations`/`getTranslations`, mai stringa hardcoded.

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
RESEND_API_KEY=                   # API key Resend per email transazionali + magic link
AUTH_EMAIL_FROM=                  # Mittente magic link (default: Karibu Baskin <noreply@karibubaskin.it>) — dominio da verificare su Resend
CONTACT_EMAIL=                    # Destinatario notifiche form contatti
BLOB_READ_WRITE_TOKEN=            # Token Vercel Blob per upload immagini (auto su Vercel)
CRON_SECRET=                      # Secret per autorizzare i cron job Vercel
IG_ACCESS_TOKEN=                  # Gallery: token long-lived Instagram Graph API
IG_BUSINESS_ACCOUNT_ID=          # Gallery: ID account Instagram Business
YOUTUBE_CHANNEL_ID=               # Gallery: ID canale YouTube (feed RSS, sezione video)
ENABLE_TEST_LOGIN=                # "true" per abilitare login fittizio (solo dev)
TEST_PASSWORD=                    # Password per il login di test (default: karibu-test)
DISABLE_NOTIFICATIONS=            # "true" spegne push e notifiche in-app (solo dev, ignorata in produzione)
SENTRY_ORG=                       # Sentry: organizzazione (build/upload source map)
SENTRY_PROJECT=                   # Sentry: progetto
SENTRY_AUTH_TOKEN=                # Sentry: token upload source map (solo CI)
NEXT_PUBLIC_SENTRY_DSN=           # Sentry: DSN client (error monitoring)
```

> `ADMIN_PASSWORD` e `COOKIE_SECRET` sono stati rimossi — non più necessari.

## Offline / PWA

Service worker (`public/sw.js`, versione `karibu-v11`), registrato **solo in produzione** da `ServiceWorkerRegistrar` (per provarlo in locale: `NEXT_PUBLIC_ENABLE_SW_IN_DEV=true`). Strategie, regole e **procedura di emergenza (kill switch)** in [`docs/workflows/service-worker.md`](docs/workflows/service-worker.md). In sintesi:

- **Rete pura, mai in cache:** `/admin`, `/profilo`, `/notifiche` (HTML con dati personali) e le API non elencate sotto
- **Cache-first:** `/_next/static/*` (hash nel nome, immutabile) e asset statici
- **Network-first + cache:** navigazioni (poi `/offline.html`) e GET su `/api/sessions`, `/api/teams/`, `/api/matches`, `/api/competitive-teams`, `/api/events`, `/api/calendar` (poi errore)
- **Script, stili, font, media:** network-first + cache, **mai** `/offline.html` (HTML consegnato al posto di JS causa ChunkLoadError)

Tre regole da non violare: il worker **non inventa risposte** (niente 503 sintetici, l'errore si propaga: una risposta finta viene scambiata per valida e rende stati vuoti falsi); le scritture in cache stanno in `event.waitUntil` e **non possono alterare la risposta**; niente `skipWaiting()` automatico, l'aggiornamento lo accetta l'utente da `SwUpdateToast`. Il logout svuota le cache di pagine e API (`purgeServiceWorkerCaches` in `@/lib/swCachePurge`). Alzare `VERSION` cancella dai dispositivi le cache delle versioni precedenti. Test in `src/lib/serviceWorker.test.ts`.

Pagine pre-cachate all'installazione: `/`, `/il-baskin`, `/squadre`, `/contatti`, `/sponsor`. (Mai precachare un redirect come `/la-squadra`: una risposta "redirected" salvata in cache non combacia più in lettura.)

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
- **Colori (UX-29):** il tipo si legge da forma e icona, non dal colore: partita = chip pieno nero del marchio, allenamento = contornato, evento = tenue; la squadra è la fascia a sinistra nella sua tinta (`decorationSx`, nessuna fascia senza tinta), "la tua squadra" è l'eco esterna. Nessun arancio sui chip: l'arancio resta su "Nuovo", giorno corrente e "Mostra tutto". Fonte unica: `eventVisual` in `@/lib/calendar/eventColors`
- `EventDetailDialog` mostra pulsante matita (modifica) per staff, con link a `/admin/partite?edit=[id]`, `/admin/eventi?edit=[id]` o `/admin/allenamenti?modifica=[id]`; per lo staff c'è anche il bottone "Nuovo" nell'intestazione del mese
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

`DELETE /api/children/[childId]`: prima di eliminare il figlio, cancella esplicitamente le sue iscrizioni e azzera il campo `teams` (JSON) degli allenamenti coinvolti con `Prisma.DbNull`. Necessario perché `Registration.child` ha `onDelete: SetNull` (non Cascade). Con più genitori, un genitore che non è l'unico toglie solo il proprio collegamento e il figlio non viene toccato; lo staff elimina per tutti con `?all=1`.

## Workflow migrazioni DB

Dal giugno 2026 il progetto usa **Prisma Migrate** (non più `db push`). Lo storico vive in `prisma/migrations/` ed è la fonte di verità: il build di produzione esegue `prisma migrate deploy`, che applica le migration committate non ancora presenti nel DB.

**Cambiare lo schema:**

1. Modificare `prisma/schema.prisma`.
2. `npm run db:migrate` → Prisma chiede un nome, crea `prisma/migrations/<timestamp>_<nome>/migration.sql` e la applica al DB di sviluppo.
3. Verificare la SQL generata (soprattutto per rename/drop: Prisma può interpretarli come drop+create con perdita dati — in quel caso editare la SQL a mano).
4. **Committare** sia `schema.prisma` sia la cartella della migration.
5. Al deploy Vercel, `migrate deploy` applica la migration alla produzione. Le change distruttive **non** vengono nascoste: se la migration droppa dati, è perché la SQL lo dice esplicitamente — leggerla prima di committare.

**Baseline (storico):** il DB di prod è stato adottato in Migrate il 2026-06-12. La migration `20260612000000_sync_db_push_drift` cattura tutto il drift accumulato nel periodo `db push` (modelli Post/Poll, RatingUpdate, InstagramPost, Suggestion, colonne rating/height/slug/imageUrl, ecc.). Su prod le migration fino a quella data erano già fisicamente applicate, quindi sono state marcate con `prisma migrate resolve --applied <nome>` invece di essere rieseguite.

> **Ambienti multipli:** ogni Neon branch (dev/prod) ha la sua tabella `_prisma_migrations`. Un branch creato/ripristinato **prima** dell'adozione di Migrate va baselinato una tantum con `migrate resolve --applied` sulle migration già presenti, altrimenti `migrate deploy` tenta di rieseguirle e fallisce.

## Note importanti

- **Rendering sempre dinamico, per scelta:** il root layout legge i cookie di lingua e tema e la sessione, quindi ogni pagina è renderizzata a richiesta. È il prezzo della lingua a cookie senza prefissi URL (vedi [Internazionalizzazione](#internazionalizzazione)) ed è accettato (audit KB-10/20, settembre 2026). Conseguenze: gli `export const revalidate` sulle pagine pubbliche non producono pagine in cache; e **mai** mettere una cache CDN sull'HTML (`Cache-Control: public`/`s-maxage`) senza `Vary: Cookie`, perché servirebbe a tutti la lingua, il tema e la sessione del primo visitatore. Le risposte con cache pubblica (es. il tabellino) devono essere identiche per chiunque
- **Streaming, `loading.tsx` e status HTTP:** appena parte lo streaming (un `loading.tsx` o un `<Suspense>` che sospende) lo status è già 200: un `notFound()` successivo diventa un soft 404 con `noindex`, un `redirect()` diventa lato client. Quindi: (1) **mai un `loading.tsx` in una cartella che ha sottopagine con `notFound()`/`redirect()`**, perché vale anche per loro; per questo le liste di `partite`, `news`, `eventi` e `squadre` stanno nel route group `(lista)/` con il loro `loading.tsx` (l'URL non cambia). (2) Nelle pagine con `notFound()`/`redirect()` il controllo va **prima** di ogni `<Suspense>`; dopo, le sezioni costose possono andare in Suspense (es. badge in `/profilo`, sezioni della home). (3) Le attese indipendenti vanno in un solo `Promise.all`: con il database Neon a freddo ogni attesa in fila si somma. Una query Prisma parte solo quando qualcuno chiama `.then()`, quindi assegnarla a una variabile e aspettarla più tardi non la anticipa. Skeleton condivisi: `PageLoadingSkeleton` (pagine con `PageHero`) e `HomeSectionSkeleton`
- **Generazione squadre:** deterministica con Mulberry32 PRNG seedato su `sessionId` — stesso seed = stesse squadre
- **3 squadre:** supportate (Arancioni / Neri / Bianchi), opzione nel form admin
- **Stagione corrente:** una sola definizione, `getCurrentSeasonLabel()` da `@/lib/season/activeSeason`: la stagione segnata "in corso" in `/admin/squadre` (`Season.isCurrent`, unico punto che la scrive) o, se nessuna lo è, quella del calendario. Le pagine server la chiedono lì (è in cache per richiesta), i componenti client la ricevono come prop (`SiteHeader` dal layout, `RegistrationForm`, `AdminUserList`, `ParentChildLinker`); le pagine con i chip stagione usano `getActiveSeason()`, che parte dalla stessa regola. `getCurrentSeason(date)` (`month >= 8 ? year : year - 1` → `YYYY-YY`) resta solo per la stagione di una data precisa: una partita, un allenamento, le presenze per stagione
- **Neon branch:** usare branch separati per dev e prod; le variabili Vercel devono puntare al branch corretto per environment
- **Build script:** `prisma migrate deploy` nel build applica al DB di produzione le migration committate non ancora applicate. **Mai più `db push` in prod** (rischio data-loss silenzioso): ogni cambiamento di schema passa da una migration. Vedi [Workflow migrazioni](#workflow-migrazioni-db)
- **TypeScript strict:** abilitato — nessuna eccezione; risolvere tutti gli errori prima del push
- **Turbopack cache corrotta:** se si vedono errori `.sst` nei log, usare `npm run dev:clean`
- **Dati per le prove UX:** `npm run db:seed-ux` / `npm run db:clean-ux` (`prisma/scripts/seed-ux-checks.ts`, idempotente): genitore con figlio senza ruolo, atleta con iscrizioni anonime, allenamento aperto, partite future con avversarie dal nome lungo, tutto `@ux.test` / "[UX]". Con `DISABLE_NOTIFICATIONS=true` si prova il ciclo di vita dell'allenamento senza avvisare nessuno
- **Mock users:** `prisma/seed.ts` crea utenti di test (es. `npx tsx prisma/seed.ts 15`) e `prisma/scripts/simulate-trueskill.ts` utenti `@sim.test` e squadre "(sim)". Prima di andare in produzione eseguire `npm run db:check-seed` con `DATABASE_URL` puntato al DB di produzione: esce con codice 1 se trova utenti di prova, figli `mock-*`, squadre di simulazione o post segnaposto (`lorem`). Contro il DB di sviluppo è normale che fallisca
- **`NextResponse.cookies.set()` bug Turbopack:** non usarlo per impostare cookie di sessione — usare `res.headers.set("Set-Cookie", ...)` con stringa manuale
- **`Prisma.DbNull`:** usare `Prisma.DbNull` (importato da `@prisma/client`) per settare a null campi JSON nullable — `null` TypeScript non funziona con Prisma per i Json field
- **`router.refresh()` e stato locale:** `router.refresh()` riesegue i Server Component ma non reinizializza lo stato React locale derivato dalle props; aggiornare direttamente lo stato locale dopo le mutazioni API quando serve reattività immediata
- **Hydration mismatch da estensioni browser:** estensioni come Grammarly iniettano attributi sul `<body>` prima che React idrati, causando warning. Fix permanente: `suppressHydrationWarning` sul tag `<body>` in `src/app/layout.tsx` (già applicato). Non rimuoverlo. Per altri mismatch legati a valori dinamici (date, `Math.random()`, `typeof window`), usare `useHasMounted` da `@/lib/useHasMounted`.

## Pattern per nuove feature

### Aggiungere una nuova entità (modello + CRUD + admin UI)

1. **Schema DB** — aggiungere il modello in `prisma/schema.prisma`, poi generare la migration con `npm run db:migrate` (chiede un nome, crea `prisma/migrations/<timestamp>_<nome>/`). **Committare la migration**: il build di prod la applica con `prisma migrate deploy`. Vedi [Workflow migrazioni](#workflow-migrazioni-db).
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
import { readError } from "@/lib/fetchJson";

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
      // Mai `res.json()` su una risposta di errore: quando il server risponde
      // con una pagina HTML (500, 502, 413, timeout del gateway) il SyntaxError
      // del parser sostituisce l'errore vero. `readError` guarda il
      // content-type e ricade sullo status.
      if (!res.ok) throw new Error(await readError(res));
      const created = await res.json();
      setItems((prev) => [created, ...prev]);
      showToast({ message: "Creato", severity: "success" });
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : "Errore", severity: "error" });
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
- **Mai colori hardcoded** (`#fff`, `#000`, `rgb(...)`) fuori da `@/lib/palette`. Usare token del tema MUI: `primary.main`, `text.secondary`, ecc.; per le squadre `teamColor()`.
- **Mai CSS in file `.css` o `.module.css`** — tutto via `sx` prop o `styled()` di Emotion.
- **Mai `<Link><Button>`** (un bottone dentro un link: HTML non valido, due fermate di Tab) e **mai `<Button component={Link}>`** in Server Component (errore runtime). Usare `<Button href="..">`: il tema lo fa diventare un `next/link`. Stesso discorso per un `Chip clickable` dentro un `<Link>`: togliere `clickable`.
- **Mai `NextResponse.cookies.set()`** per cookie di sessione → bug Turbopack. Usare `res.headers.set("Set-Cookie", ...)`.
- **Mai `null` su campo `Json` Prisma** → usare `Prisma.DbNull`. Per "field non passato" usare `Prisma.JsonNull` solo dentro update.
- **Mai chiamare Prisma dentro `proxy.ts`** (middleware) → Edge Runtime non lo supporta. L'auth va nei layout/API routes.
- **Mai stringhe UI hardcoded nella UI pubblica** — passare per i dizionari next-intl (`it.json` + `en.json`) via `useTranslations`/`getTranslations`. L'admin resta solo in italiano. Le label di dominio (ruolo/genere/risultato) vanno da `useEntityLabels`/`getEntityLabels`, non hardcodate.
- **Mai default export per componenti riutilizzabili?** → No, in questo progetto i componenti usano **default export** (es. `export default function SessionCard()`). Mantenere coerenza. Utility e hook invece sono **named export**.
- **Mai `prisma db push` verso il DB di produzione** (né `--accept-data-loss`): il drift di schema va sempre versionato come migration. `db push` è tollerato **solo** in locale per prototipare rapidamente, ma prima di committare lo schema va trasformato in una migration con `npm run db:migrate`.
- **Mai modificare `schema.prisma` senza creare la migration corrispondente** — altrimenti il build di prod (`migrate deploy`) non applica la modifica e il DB resta indietro.
- **Mai skippare `tsc --noEmit`** prima di un push: i deploy Vercel rompono silenziosamente se il type-check non è verde.
- **Mai chiamare `auth()` in un Client Component** — passare la session/dati utente come prop dal Server Component padre, oppure fetchare via `/api/users/me`.
- **Mai esporre dati sensibili in client props** (email altrui, ruoli admin di altri utenti che non dovrebbero vederli) — fare `select` esplicito in Prisma.
- **Mai `res.json()` su una risposta di errore** senza controllare il `content-type`: usare `readError(res)` da `@/lib/fetchJson`. Con una pagina HTML di errore il parser JSON solleva un `SyntaxError` che **sostituisce** l'errore reale, e l'utente legge `Unexpected token '<'` invece del motivo.
- **Mai una chiamata Prisma fuori da try/catch in una rotta di scrittura**: un'eccezione non gestita diventa un 500 con pagina HTML, che nessun client sa leggere. Gestire almeno `P2002` e ricadere su un JSON con lo stato.
- **Mai dimenticare il rate-limit** sulle API pubbliche (GET senza auth): `checkRateLimit(getClientIp(req), "key", limit, windowMs)`.
- **Mai usare `prisma.session` quando intendi `prisma.trainingSession`** — `session` = sessione Auth.js.
- **Mai aggiungere libreria di state management** (Redux, Zustand, Jotai...) senza discuterne — il pattern attuale è useState + Context + TanStack React Query (per il data fetching).
- **Mai introdurre nuovi alias di import** oltre `@/` → `src/`.
- **Mai committare file generati** (`.next/`, `node_modules/`, `prisma/migrations/` su branch develop senza review).
- **Mai bypassare `isCoachOrAdmin()` / `isAdminUser()`** in API route admin con controlli ad-hoc.
- **Mai usare `fetch` in Server Component per dati interni** — andare direttamente a Prisma. `fetch` interno è uno spreco e perde caching.
