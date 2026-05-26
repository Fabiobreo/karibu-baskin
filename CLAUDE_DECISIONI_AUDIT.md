# CLAUDE_DECISIONI_AUDIT.md

Decisioni standard prese durante l'**audit UI/UX completo** del 2026-05-25 (Fase 1 + Fase 2). Documento di riferimento canonico per le modifiche da applicare al codice.

**Stato:** Audit Fase 1 (mappatura) + Fase 2 (coerenza UI) completati. Fase 3 (mobile) e Fase 4 (a11y/dark mode) ancora da fare. **Nessuna modifica è stata applicata al codice.**

---

## 1. Riepilogo esecutivo

Audit condotto su 42 pagine + 90+ componenti. Identificate decine di duplicazioni (4 implementazioni di MatchCard, 5 di RESULT_COLOR, 4 pattern di back button, 9 hero gradient copia-incollati, ecc.), violazioni della regola "no colori hardcoded" (centinaia di occorrenze) e bug bloccanti minori (`/news/[slug]` senza SiteHeader, errori swallow in `/notifiche`, ecc.).

Le decisioni qui sotto definiscono lo stato target. Vanno implementate in PR separate, non in un unico grande commit.

---

## 2. Componenti condivisi da estrarre

| Componente                                       | Sostituisce                                                       | Posizione                               |
| ------------------------------------------------ | ----------------------------------------------------------------- | --------------------------------------- |
| `<PageHero title chip? subtitle?>`               | Hero gradient copia-incollato in 9+ pagine pubbliche              | `src/components/PageHero.tsx`           |
| `<EntityHero color image? title chip>`           | Hero "profilo entità" dinamico (squadra/giocatore/partita)        | `src/components/EntityHero.tsx`         |
| `<EmptyState icon title message action?>`        | Pattern empty state in 10 pagine                                  | `src/components/EmptyState.tsx`         |
| `<DetailPageSkeleton>`                           | Skeleton hero + 3 blocchi (riferimento: `/allenamento/[session]`) | `src/components/DetailPageSkeleton.tsx` |
| `<MatchCard match variant="played"\|"upcoming">` | 4 implementazioni duplicate di card partita                       | `src/components/MatchCard.tsx`          |
| `<InfoRow label>{children}</InfoRow>`            | 3 helper locali in `/profilo`, `/giocatori`, `/avversarie`        | `src/components/InfoRow.tsx`            |
| `<LoginCard mode="user"\|"admin">`               | Pagine `/login` e `/admin/login` quasi identiche                  | `src/components/LoginCard.tsx`          |
| `<AdminPageHeader title subtitle? backHref?>`    | Header admin (server-side) per uniformare titoli + breadcrumb     | `src/components/AdminPageHeader.tsx`    |

---

## 3. Token tema da aggiungere in `src/theme.ts`

```ts
palette: {
  // ...esistente
  match: {
    win: "#2E7D32",
    winBg: "#E8F5E9",
    loss: "#C62828",
    lossBg: "#FFEBEE",
    draw: "#E65100",
    drawBg: "#FFF3E0",
  },
  admin: {
    allenamenti: "#00897B",
    partite: "#2E7D32",
    eventi: "#6A1B9A",
    news: "#0277BD",
    utenti: "#E65100",
    squadre: "#1565C0",
    gironi: "#00695C",
    avversarie: "#5D4037",
    esporta: "#37474F",
    audit: "#4527A0",
  },
  stats: {
    points: "#E65100",
    games: "#1565C0",
    avg: "text.primary", // o tonalità neutra
    twopt: "#2E7D32",
    threept: "#7B1FA2",
    ft: "#00838F",
    fouls: "#C62828",
    illegalFouls: "#B71C1C",
  },
}
```

Inoltre, ovunque c'è `rgba(230,81,0,X)` sostituire con `alpha(theme.palette.primary.main, X)` (import: `import { alpha } from "@mui/material/styles"`).

---

## 4. Helper lib

### `src/lib/matchResults.ts`

```ts
export type MatchResultMeta = {
  label: string;          // "Vittoria" / "Sconfitta" / "Pareggio"
  short: string;          // "V" / "S" / "P"
  color: string;          // dal tema palette.match.win/loss/draw
  bg: string;             // backdrop chip
};

export const MATCH_RESULT_META: Record<MatchResult, MatchResultMeta> = { ... };
```

Sostituisce 5 ridefinizioni locali in:

- `src/app/squadre/[season]/[slug]/page.tsx:150`
- `src/app/giocatori/[slug]/page.tsx:77`
- `src/app/avversarie/[slug]/page.tsx:23`
- `src/app/partite/[slug]/page.tsx:28`
- `src/app/risultati/page.tsx:25`

---

## 5. Convenzioni Typography

| Contesto                                                         | variant                 | fontWeight |
| ---------------------------------------------------------------- | ----------------------- | ---------- |
| Hero pagina pubblica (h3 visivo)                                 | `h3` component=`h1`     | 800        |
| `/giocatori/[slug]` nome giocatore (eccezione voluta)            | `h2`                    | 900        |
| Sezione                                                          | `h4`                    | 800        |
| Sottosezione                                                     | `h5`                    | 800        |
| Card title                                                       | `h6`                    | 700        |
| Area utente (`/profilo`, `/notifiche`, `/profilo/disponibilita`) | `h4`                    | 800        |
| Admin (TUTTE le pagine admin)                                    | `h4`                    | 800        |
| Form section heading (es. "Dati di accesso")                     | `subtitle1`/`subtitle2` | 700        |

---

## 6. Hero per categoria di pagina

| Categoria pagine                                                                                                                                                                 | Hero                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Pubbliche informative top-level (`/`, `/il-baskin`, `/contatti`, `/sponsor`, `/faq`, `/squadre`, `/partite`, `/risultati`, `/classifica`, `/classifiche`, `/marcatori`, `/news`) | `<PageHero>` standard gradient                                         |
| Privacy                                                                                                                                                                          | Adottare hero gradient standard (era outlier)                          |
| Profili entità (`/squadre/[season]/[slug]`, `/giocatori/[slug]`, `/avversarie/[slug]`, `/partite/[slug]`)                                                                        | `<EntityHero>` dinamico (team/player/result color)                     |
| `/avversarie/[slug]`                                                                                                                                                             | Allineata al pattern EntityHero (era outlier sobrio)                   |
| Allenamento dettaglio                                                                                                                                                            | `<AllenamentoHero>` (già esistente, con cerchi decorativi via `alpha`) |
| Area utente                                                                                                                                                                      | Hero gradient piccolo `py: 3-4` (Opzione B)                            |
| `/calendario`                                                                                                                                                                    | **No hero**, header inline (decisione esplicita)                       |
| `/news/[slug]`                                                                                                                                                                   | **No hero**, layout articolo blog con h3 (no h4)                       |
| Admin                                                                                                                                                                            | **No hero**, solo `<AdminPageHeader>` server-side                      |
| Login/admin login                                                                                                                                                                | `<LoginCard>` (Paper centrato, no hero)                                |
| `/la-squadra`                                                                                                                                                                    | Redirect a `/squadre` (rimane)                                         |

---

## 7. Back navigation / Breadcrumbs

Standard: `<Breadcrumbs>` MUI su tutte le pagine tranne home + top-level.

**Top-level (nessun breadcrumb):**

- `/`, `/login`, `/admin/login`
- `/allenamenti`, `/squadre`, `/partite`, `/risultati`, `/classifica`, `/classifiche`, `/marcatori`
- `/calendario`, `/news`
- `/il-baskin`, `/la-squadra`, `/contatti`, `/sponsor`, `/privacy`, `/faq`
- `/profilo`, `/notifiche`
- `/admin` (dashboard)

**Da aggiungere breadcrumb:**

- `/allenamento/[session]` → `Allenamenti › <titolo>`
- `/squadre/archivio` → `Squadre › Archivio`
- `/squadre/[season]/[slug]` → `Squadre › <team>`
- `/giocatori/[slug]` → `Squadre › <team> › <giocatore>` (o solo "Giocatori › <nome>")
- `/avversarie/[slug]` → `Avversarie › <nome>` (manca attualmente!)
- `/partite/[slug]` → `Partite › <match>` (manca!)
- `/news/[slug]` → `News › <titolo>` (sostituisce ArrowBack inline)
- `/profilo/disponibilita` → `Profilo › Disponibilità`
- `/admin/<entity>` (tutte) → `Dashboard › Gestione X`
- `/admin/<entity>/<dettaglio>` (es. nuovo, convocazioni) → `Dashboard › X › Dettaglio`

Rimuovere i 4 pattern attuali divergenti:

- `<Button startIcon=ArrowBack>` (AllenamentoHero, squadre/archivio, admin/utenti, admin/audit, ecc.)
- `<Typography variant="caption">← Squadre</Typography>` (squadre/[season]/[slug])
- `<Box component=Link>` inline con ArrowBack (news/[slug])
- ArrowBack inline in client component (gironi workspace)

---

## 8. Pattern Card / Paper

- **Canonical:** `<Paper variant="outlined">`
- **Vietato:** `<Paper elevation={0} sx={{ border: "1px solid rgba(0,0,0,0.07)" }}>` (30+ occorrenze attuali)
- **Border via:** `borderColor: "divider"` mai rgba hardcoded
- **Hover effect:** se serve evidenziare, usare `borderColor: "primary.main"` o `boxShadow: 2`

---

## 9. Colori — eliminazione hardcoded

L'utente ha confermato: scelta storica consapevole, ma vuole sostituirla con token tema dove possibile.

| Pattern attuale                               | Sostituzione                                  |
| --------------------------------------------- | --------------------------------------------- |
| `rgba(230,81,0,X)`                            | `alpha(theme.palette.primary.main, X)`        |
| `${teamColor}cc`                              | `alpha(teamColor, 0.8)`                       |
| `#2E7D32`/`#C62828`/`#E65100` (win/loss/draw) | `palette.match.win/loss/draw`                 |
| `#1565C0` (info)                              | `palette.info.main`                           |
| Dashboard NavCard colors hardcoded            | `palette.admin.*`                             |
| Stat-card palette giocatore                   | `palette.stats.*`                             |
| `#999` placeholder em                         | `color: "text.disabled"` via sx               |
| `#fff` su chip dark                           | `color: "common.white"` o lasciare se ok      |
| `border: "1px solid rgba(0,0,0,0.07)"`        | `border: "1px solid"; borderColor: "divider"` |
| `bgcolor: "rgba(0,0,0,0.02/0.025)"`           | `bgcolor: "action.hover"` o `grey.50`         |

---

## 10. Toast

**Firma corretta** (da `src/context/ToastContext.tsx`):

```ts
showToast({ message, severity, duration?, action?, progressMs? })
```

**Da fixare:** `src/components/CLAUDE.md` documenta firma errata `showToast(message, severity)`. Aggiornare.

**Pattern:**

- Tutti gli errori di fetch via toast (no `catch {}`, no `Alert` locale per form di scrittura).
- Success operazione: `severity: "success"`, messaggio breve in italiano.
- Errore validazione: `severity: "warning"` o `error` con messaggio specifico.
- Per `/admin/utenti/nuovo`: sostituire `<Alert severity="error">` con toast.

---

## 11. Empty state

Pattern standard via `<EmptyState>`:

```tsx
<EmptyState
  icon={<SomeIcon sx={{ fontSize: 56, color: "text.disabled" }} />}
  title="Titolo principale" // variant="h6" color="text.secondary"
  message="Spiegazione breve" // variant="body2" color="text.disabled"
  action={<Button>Azione opzionale</Button>}
/>
```

Sostituire in:

- `/squadre`, `/squadre/archivio`, `/squadre/[season]/[slug]`
- `/giocatori/[slug]`, `/avversarie/[slug]`
- `/partite`, `/risultati`, `/classifica`, `/classifiche`, `/marcatori`
- `/news` (attualmente solo Typography, da uniformare)
- `/notifiche` (attualmente solo Typography, da uniformare)
- `/calendario` (eventualmente, gestito dal client)

---

## 12. Loading state

Pattern standard via `<DetailPageSkeleton>`:

- Skeleton rettangolare `height: 200` per hero
- 3-4 Skeleton blocchi sotto

Applicare a pagine SWR/Client con loading vero (`/allenamento/[session]` già lo fa correttamente).
Per Server Component pure non serve (SSR).

---

## 13. Admin

### Layout pattern (Server Component padre, non Client):

```tsx
export default async function AdminXPage() {
  // auth + fetch dati
  return (
    <>
      <AdminPageHeader
        title="Gestione X"
        subtitle="Descrizione breve"
        // breadcrumb generato automaticamente dal pathname o passato esplicitamente
      />
      <AdminXClient initialItems={...} />
    </>
  );
}
```

### Convenzioni admin

- Titolo: `h4 fontWeight=800` (mai più h5 — uniformare le 4 pagine attuali in h5)
- Subtitle: sempre `body2 color="text.secondary"` sotto al titolo (uniforme con `/admin/allenamenti`)
- Breadcrumb: `Dashboard › Gestione X`
- Header SEMPRE nel Server Component, mai dentro il Client (uniformare le 7 pagine attuali)
- Bottoni "Nuovo X": `<Button variant="contained" startIcon=AddIcon>` nell'header a destra
- EditIcon in cella tabella: `<IconButton><EditIcon fontSize="small" /></IconButton>` (pattern già coerente)

### Bug da fixare

- `/admin/utenti/nuovo`: sostituire `<Alert>` errore con toast
- `/admin/audit`: pulire doppio header box, usare `<AdminPageHeader>`
- Tutti i colori category hardcoded → da `palette.admin.*`

---

## 14. Bug bloccanti (fix prioritari, indipendenti dall'audit)

1. **✅ `/news/[slug]` manca `<SiteHeader />`** — risolto in PR #8.
2. **✅ `/notifiche`**:
   - errori swallow (`catch {}`) → toast → risolto in PR #8
   - "use client" + `useSession` → refactor a Server Component (`NotificheClient.tsx`) → risolto in PR #8
3. **✅ `/admin/utenti/nuovo` Alert invece di toast** — risolto in PR #8.
4. **✅ CLAUDE.md di src/components** firma `showToast` corretta — risolto in PR #8.
5. **🟡 `/squadre/[season]/[slug]` da 1983 righe** — spezzare in `src/app/squadre/[season]/[slug]/_components/{NextMatchCard,PlayedMatchCard,LeaderCard,AthleteCard,SubLeaderRow}.tsx`.

---

## 15. Mobile friendliness (Fase 3, decisioni prese 2026-05-25)

> **Stato implementazione:** nessuna PR ancora. PR #9 = ResponsiveDialog, PR #10 = mobile alt view tabelle.

### 🔲 Componente `<ResponsiveDialog>` (nuovo) — PR #9

Wrapper su `<Dialog>` MUI che applica automaticamente `fullScreen` sotto `theme.breakpoints.down("sm")`. Da usare in **tutti** i Dialog (escluso `useConfirmDialog` che resta breve).

```tsx
// src/components/ResponsiveDialog.tsx
import { Dialog, DialogProps, useMediaQuery, useTheme } from "@mui/material";

export default function ResponsiveDialog(props: DialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  return <Dialog fullScreen={fullScreen} {...props} />;
}
```

Sostituire `<Dialog>` con `<ResponsiveDialog>` in:

- `AdminNewsClient` (Dialog crea/modifica post, maxWidth=md)
- `AdminGironeWorkspaceClient` (2 dialog: oppDialog, ourTeamDialog)
- `AdminAnonymousRegistrations` (Dialog modifica iscrizione anonima — molto lungo)
- `MatchFormDialog`, `MatchResultDialog`, `OpposingTeamEditDialog`, `PickTeamsDialog`, `TeamsModal`, `SubscribeCalendarDialog`, `GroupCsvImportDialog`
- `AdminSessionList` Dialog elimina (rivedere se ha senso fullscreen su mobile per conferma breve)

NON applicare a:

- `useConfirmDialog` (resta breve, non beneficia di fullscreen)

### Tabelle admin — mobile alt view obbligatoria

Tutte le tabelle admin devono avere una **versione card** su mobile (`< sm`). Pattern di riferimento: `AuditLogClient` (linea 539+).

Da aggiungere mobile alt view a:

- `AdminUserList` (utenti + figli)
- `AdminPartiteClient`
- `AdminEventiClient`
- `AdminNewsClient`
- `AdminAnonymousRegistrations`
- `AdminDashboardTabs`
- `ClassificaTableClient` (`/classifica`)
- `ClassificaInternaTable` (`/marcatori`)
- `MatchStatsTable`, `ConvocazioniClient` (verificare se hanno già)

### Touch target — IconButton `size="medium"` ovunque

- Sostituire `size="small"` (30px) con `size="medium"` (40px) di default per `IconButton` in cella tabella + cluster di azioni.
- Eccezione: inline accanto a testo piccolo (es. icona Tooltip "Info") può restare small.

### Submit buttons primari

- I CTA principali ("Crea", "Salva", "Conferma", "Iscriviti") usano `size="large"` (altezza ~44px+).
- Bottoni secondari/cancella restano size default o `small`.

### Bug fix critici Fase 3

- 🔴 `AdminNewsClient`: aggiungere `overflowX: "auto"` al TableContainer + colonne `display: { xs: "none", sm: "table-cell" }` per "Data" e "Autore" + mobile alt view (cards).
- 🟡 `AdminEventiClient`: verificare e aggiungere `overflowX` wrapper se manca.

### Pattern Bottom Nav — già implementato

`BottomNav.tsx` con 5 voci + safe-area iPhone. Colori hardcoded (`#1A1A1A`, `#E65100`, `rgba(255,255,255,*)`) da migrare a token tema in Fase 4.

### Non auditati in Fase 3 (da fare separatamente)

- `PollWidget` — componente sondaggio nelle news. Da auditare mobile-specifici (touch target opzioni voto, layout risultati, ecc.).
- `PostEditor` — editor news con rich text. Probabile UX subottimale su mobile (toolbar, area testo, anteprima).

---

## 16. Accessibilità + colori hardcoded + Dark mode (Fase 4, decisioni prese 2026-05-25)

### 🚨 Scoperta major: il dark mode È ATTIVO

Il progetto ha `lightTheme` + `darkTheme` in `src/theme.ts`, `ThemeContext` con `mode: light|dark|system`, persistenza localStorage, toggle in `SiteHeader` menu utente (`cycleColorMode`).

Solo 4 file adattano correttamente i colori in base a `theme.palette.mode === "dark"`:

- `AdminAllenamentiClient`, `RosterByRole`, `SessionCard`, `TrainingMatchResults`

Le ~90 altre occorrenze di colori hardcoded fanno apparire l'app **rotta** in dark mode (bordi invisibili, sfondi sbagliati, contrasti). **Bug attivo, non ipotetico.**

### Token tema da aggiungere (sia lightTheme che darkTheme)

Decisione confermata: tutte le palette estese vanno definite SIA in light che in dark, con variazioni appropriate.

```ts
palette: {
  match: { win, winBg, loss, lossBg, draw, drawBg },        // light: vivace · dark: più tenue/scuro
  admin: { allenamenti, partite, eventi, news, utenti,
           squadre, gironi, avversarie, esporta, audit },    // light: come dashboard attuale · dark: ~20-30% più tenui
  stats: { points, games, avg, twopt, threept, ft,
           fouls, illegalFouls, shotsAttempted },
  medal: { gold, silver, bronze },                           // separato da palette.match; usato sia in UI sia in lib/badges
  heroGradient: { dark: "linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, #3D2010 100%)" },
                                                             // "brand background" resta scuro in entrambe le mode
}
```

### Migrazioni colori (priorità sequenziale) — ✅ COMPLETATO (PR #1–#7)

L'utente ha scelto piano sequenziale (no fast-track dark mode). Ordine:

1. ✅ **PR #1 — Estensione tema** — palette.match, palette.admin, palette.stats, palette.medal, palette.heroGradient in lightTheme e darkTheme.
2. ✅ **PR #2 — Low-risk globale** — `border rgba(0,0,0,0.0X)` → `divider`; `rgba(230,81,0,X)` → `alpha(primary.main, X)`; hover boxShadow/borderColor.
3. ✅ **PR #3 — matchResults lib** — `src/lib/matchResults.ts` con `MATCH_RESULT_META`; 5 ridefinizioni locali rimosse; hex win/loss/draw → `palette.match.*`.
4. ✅ **PR #4 — PageHero/EntityHero** — componenti estratti; 12 pagine migrate; `heroGradient.dark` usato.
5. ✅ **PR #5 — Migrazioni per pagina** — `SessionCard`, `AllenamentoHero`, `ConvocazioniClient`, `AdminSquadreClient`, `CalendarClient`, `SiteHeader`, `partite/[slug]`, `giocatori/[slug]`.
6. ✅ **PR #6 — aria-label sweep** — `NotificationBell`, `AdminGironeWorkspaceClient`, `CalendarClient` accessibilità tastiera.
7. ✅ **PR #7 — Verifica dark mode** — fix mirati su 11 file; bordi/sfondi/colori token-izzati.

### Contrasto subtitle hero

**Decisione: alzare** opacity dei subtitle hero `rgba(255,255,255,0.4-0.55)` ad almeno `0.75` o `0.8` per rispettare WCAG AA (testo body richiede 4.5:1).

Pagine coinvolte: `/il-baskin`, `/sponsor`, `/contatti`, `/faq`, `/partite`, `/risultati`, `/classifica`, `/classifiche`, `/marcatori`, `/news` (qualunque pagina abbia subtitle in hero gradient scuro).

### Censimento IconButton senza accessibilità (puntuale)

Confronto IconButton vs Tooltip + aria-label per file: **solo 2 file con gap confermato**:

- 🔴 `src/components/notifications/NotificationBell.tsx`: 1 IconButton senza Tooltip né aria-label → aggiungere `aria-label="Notifiche"`.
- 🔴 `src/components/AdminGironeWorkspaceClient.tsx`: 2 IconButton, 1 con aria-label, 1 senza → identificare quello mancante e fixare.

La copertura globale è > 99% (la maggior parte degli IconButton è dentro `<Tooltip>` wrapper che fornisce a11y).

### Censimento accessibilità tastiera

- 🟡 `src/components/CalendarClient.tsx:839`: `<Box onClick={() => onSelectEvent(ev)} sx={rowSx}>` senza `component={Link}`, `role="button"`, `tabIndex` né `onKeyDown`. Il caso fratello (riga 835) usa `component={Link}` correttamente. Da fixare: aggiungere `role="button"`, `tabIndex={0}`, `onKeyDown` per Enter/Space.

Pattern eccellente da replicare: `CalendarClient.tsx:325-340` (cella giorno calendar) ha `tabIndex`, `onKeyDown`, `&:focus-visible` con outline.

### Avatar/Image accessibility

- La maggior parte degli `<Avatar>` ha children fallback (iniziali nome) → screen reader legge le iniziali, accettabile.
- Aggiungere `alt={user.name}` esplicito dove l'avatar mostra foto utente, per best practice MUI.
- `<Image>` Next.js: già con `alt` su sponsor e altri casi. Verifica ad hoc se servono fix.

### Categorie colori da migrare (riepilogo)

| Categoria         | Esempi                                                                                                     | Target                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Brand orange      | `#E65100`, `rgba(230,81,0,X)`, `${primaryColor}cc`                                                         | `palette.primary.*` + `alpha()`                           |
| Hero dark UI      | `#1A1A1A`, `#2D1A0A`, `#3D2010`, `#2A2A2A`                                                                 | `palette.heroGradient.dark` (token)                       |
| Result            | `#2E7D32`/`#C62828`/`#E65100` (+ bg `#E8F5E9`/`#FFEBEE`/`#FFF3E0`)                                         | `palette.match.*`                                         |
| Status badge      | `#1565C0`                                                                                                  | `palette.info.main`                                       |
| Medaglie          | `#FFC107`/`#FFD54F`/`#FFA000` (oro), `#BDBDBD`/`#9E9E9E` (argento), `#CD7F32`/`#8D6E63`/`#D7A56B` (bronzo) | `palette.medal.*`                                         |
| Social brand      | `#E1306C`, `#1877F2`, `#FF0000`                                                                            | **Lasciare hardcoded** (brand color esterni)              |
| Greys             | `#424242`, `#555`, `#666`, `#757575`, `#E0E0E0`, `#BDBDBD`, `#999`                                         | `text.disabled/secondary/primary`, `grey.*`               |
| Backdrop subtle   | `rgba(0,0,0,0.0X)`, `rgba(255,255,255,0.X)`                                                                | `alpha(common.black/white, X)`, `action.hover`, `divider` |
| Border 1px subtle | `rgba(0,0,0,0.07)` etc                                                                                     | `borderColor: "divider"`                                  |

### Top offender (file con più colori hardcoded — priorità migrazione)

1. `src/app/squadre/[season]/[slug]/page.tsx` — 63 hex + 24 rgba _(da spezzare prima)_
2. `src/app/giocatori/[slug]/page.tsx` — 48 + 13
3. `src/components/SiteHeader.tsx` — 41 + 40
4. `src/app/partite/[slug]/page.tsx` — 27 + 18
5. `src/components/CalendarClient.tsx` — 24 + 6
6. `src/components/AdminSquadreClient.tsx` — 23 + 9
7. `src/components/SessionCard.tsx` — 16 + 4
8. `src/components/ShareTeamsButton.tsx` — 16 + 3
9. `src/components/AllenamentoHero.tsx` — 15 + 9
10. `src/components/ConvocazioniClient.tsx` — 15 + 10

### Bug fix critici Fase 4 — ✅ tutti risolti in PR #6 e PR #7

1. ✅ NotificationBell — `aria-label="Notifiche"` aggiunto (PR #6)
2. ✅ AdminGironeWorkspaceClient — IconButton mancante fixato (PR #6)
3. ✅ CalendarClient.tsx — Box onClick con `role="button"`, `tabIndex={0}`, `onKeyDown` (PR #6)
4. ✅ Subtitle hero opacity — portata a `0.75` in PageHero ed EntityHero (PR #4/PR #6)
5. ✅ Bordi `rgba(0,0,0,0.07)` — migrati a `borderColor: "divider"` (PR #2 e PR #7)

---

## 17. Piano PR esteso (PR #8–#14)

Dopo il completamento del piano colori (PR #1–#7), la sequenza continua:

| PR  | Area                                      | Scope                                                                                                                                                                                    | Stato |
| --- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| #8  | Bug fix bloccanti (sez. 14)               | SiteHeader news/[slug], notifiche refactor, Alert→toast, showToast CLAUDE.md                                                                                                             | ✅    |
| #9  | ResponsiveDialog (sez. 15)                | `src/components/ResponsiveDialog.tsx` + migrazione ~10 Dialog con fullScreen mobile                                                                                                      | ✅    |
| #10 | Mobile alt view tabelle (sez. 15)         | Card view per AdminUserList, AdminPartiteClient, AdminEventiClient, AdminNewsClient, ecc.                                                                                                | ✅    |
| #11 | EmptyState + AdminPageHeader (sez. 11+13) | Estrazione componenti condivisi + migrazione pagine                                                                                                                                      | ✅    |
| #12 | Breadcrumbs (sez. 7)                      | `<Breadcrumbs>` MUI su tutte le pagine non top-level                                                                                                                                     | ✅    |
| #13 | Typography standardization (sez. 5)       | Uniformare variant per livello in tutte le pagine                                                                                                                                        | ✅    |
| #14 | Mobile touch target + ClassificaTable     | `ClassificaTableClient` mobile card view; `IconButton size="medium"` in celle tabella (AdminEventiClient, AdminNewsClient, AdminPartiteClient, AdminUserList); submit CTA `size="large"` | ✅    |

TODO fuori sequenza: `/squadre/[season]/[slug]` split in `_components/` (sez. 14.5).

---

## 16. Note di implementazione

- Le modifiche vanno fatte in PR separate per area (es. una PR per estrarre PageHero, una per i token tema, una per fix bug bloccanti, ecc.) — non un unico mega-commit.
- Quando si tocca un file per altra ragione (es. bug fix), valutare se applicare anche le migrazioni di questo audit nello stesso file (es. sostituire `border: rgba(...)` con `borderColor: divider`), ma non in modo opportunistico se richiede troppi cambiamenti collaterali.
- Prima di ogni gruppo di modifiche, rileggere questo file + le decisioni Fase 3/4 quando saranno aggiunte.
- Audit progress trackato in `~/.claude/projects/D--Projects-karibu-baskin/memory/audit-ui-progress.md`.
