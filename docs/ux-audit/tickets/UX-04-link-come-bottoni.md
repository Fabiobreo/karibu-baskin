# UX-04 · Link come bottoni (fine di `<Link><Button>`)

**Ondata:** 0 · **Stima:** M · **Dipende da:** nessuno · **Stato:** fatto (commit su `develop`): `LinkBehavior` come link di default del tema, 42 `<Link><Button>` e 3 ancore semplici migrati a `<Button href>`/`MuiLink`, zero `a button` sulle pagine di UX-01

## Problema

CLAUDE.md impone `<Link href><Button>` nei Server Component, perché `<Button component={Link}>` lì dà errore runtime. Il risultato è `<a><button>`:

- HTML non valido (elemento interattivo dentro un altro);
- due fermate di Tab per ogni bottone (5 in home: "Cos'è il Baskin?" riceve il focus due volte di fila);
- l'ancora esterna è alta 2 px e axe la segnala come target troppo piccolo.

Conteggi: **42 occorrenze in 33 file**, 21 in Server Component (14 file, per esempio `JoinUsCta.tsx:37,42`, `app/classifiche/page.tsx` ×3, `app/profilo/page.tsx` ×2). Alcuni Server Component ripiegano già su ancore semplici, che ricaricano l'intera pagina: `app/profilo/page.tsx:507`, `app/profilo/ruolo/page.tsx:65`, `app/profilo/disponibilita/page.tsx:41`.

## Soluzione

Configurare il link una volta sola nel tema, invece di un nuovo componente. `src/theme.ts` è già `"use client"` e montato da `Providers`, quindi:

1. Creare `LinkBehavior` (client) che rende `next/link`, **tranne** nei casi in cui serve un `<a>` semplice:
   - URL esterni (`http(s)://` di altri domini), `mailto:`, `tel:`, `webcal:`;
   - percorsi `/api/*` (esportazioni, `.ics`);
   - presenza della prop `download`.
2. Nel tema: `MuiButtonBase.defaultProps.LinkComponent = LinkBehavior` e `MuiLink.defaultProps.component = LinkBehavior`.
3. Da quel momento `<Button href="/x">` funziona anche nei Server Component, perché passa solo stringhe.
4. Migrare le 42 occorrenze a `<Button href=…>` e le ancore semplici citate sopra.
5. Nelle liste admin con molte `IconButton href` (per esempio `AdminGironiClient`) valutare `prefetch={false}`: tutte le pagine sono dinamiche e il prefetch non porta benefici.
6. Aggiornare CLAUDE.md (sezione "Convenzioni" e "Regole ferree") e `src/components/CLAUDE.md` con la nuova regola: si usa `<Button href>`, mai `<Link><Button>`.

## Da sapere

- Da un Server Component restano vietati `sx={(theme) => …}` e `onClick`; `startIcon={<Icon />}` invece passa.
- Casi da verificare dopo la modifica: `SubscribeCalendarDialog` (link `.ics` e `webcal:`), link social del `Footer`, esportazioni CSV in `/admin/esporta`.

## Criteri di accettazione

- `document.querySelectorAll("a button, a [role=button]").length === 0` sulle pagine controllate da UX-01.
- Ogni CTA riceve il focus una sola volta.
- Abbonamento al calendario, link esterni ed esportazioni funzionano come prima.
- La navigazione tra pagine interne resta lato client (niente ricaricamento completo).

## Esito

- `src/components/common/LinkBehavior.tsx` + regole in `src/lib/linkTarget.ts` (con test): `next/link` per le pagine interne, `<a>` semplice per URL assoluti, `mailto:`/`tel:`/`webcal:`, `/api/*` e `download`. Montato in `theme.ts` su `MuiButtonBase.LinkComponent` e `MuiLink.component`.
- Migrate le 42 occorrenze (33 file, 14 Server Component) e le ancore di `profilo/page.tsx`, `profilo/ruolo/page.tsx`, `profilo/disponibilita/page.tsx` (ora i breadcrumb navigano lato client). Anche l'`<a download><Button>` dell'export dati in `GdprSection`.
- Tolto `clickable` ai `Chip` dentro un `<Link>` (figli nel profilo giocatore, `AdminAnonymousRegistrations`): erano `a [role=button]`. L'effetto al passaggio del mouse resta con `a:hover > &`.
- Verifica: `a button, a [role=button]` = 0 su 16 pagine (anonimo, atleta, admin; desktop e mobile), clic su un bottone di un Server Component senza ricaricamento, export dati e mailto restano `<a>` semplici. `npm run a11y`: nessuna nuova violazione, 6 voci `target-size` sparite, baseline 47 → 41.
- CLAUDE.md e `src/components/CLAUDE.md` aggiornati.

**Rimasto fuori**

- `prefetch={false}` non applicato: le liste admin con `IconButton` link (`AdminGironiClient`) hanno pochi elementi e con Next 16 il prefetch di una pagina dinamica si ferma al `loading`. Da rivedere solo se compaiono liste lunghe.
- I `component={Link}` nei Client Component (header, calendario, notifiche, admin) funzionano e non annidano nulla: lasciati com'erano, si possono semplificare in `href` quando si tocca il file.
- I bottoni in `SubscribeCalendarDialog` e i social del `Footer` usano `component="a"` esplicito, quindi non passano da `LinkBehavior`: comportamento invariato.
