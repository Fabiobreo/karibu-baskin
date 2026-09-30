# UX-32 · Tre modelli di intestazione di pagina

**Ondata:** 4 · **Stima:** L · **Dipende da:** UX-30 · **Stato:** fatto (su `develop`, tre commit)

## Problema

Era parcheggiato ("migrazione sistematica su nuovi componenti di layout: il grosso del beneficio arriva dal tema"). Il riaudit del 29/09 mostra che il tema da solo non basta: oggi ci sono **8 modi** di aprire una pagina.

1. Home: foto con la scritta gigante (`HeroSection`).
2. `PageHero` allineato a sinistra con icona e occhiello: `/partite`, `/risultati`, `/classifiche`, `/marcatori`.
3. `PageHero` centrato con chip: `/squadre` ("Chi siamo"), `/gallery` ("Karibu Baskin"), `/contatti` ("Siamo qui"), `/profilo/disponibilita` ("Partite").
4. `PageHero` centrato senza chip: `/news`, `/eventi`, `/notifiche`, `/profilo`, `/il-baskin`.
5. Entity hero di allenamento ed evento (`AllenamentoHero`, `EventHero`): breadcrumb a sinistra, titolo centrato.
6. Tabellino della partita (`app/partite/[slug]/page.tsx`).
7. Hero del giocatore (`EntityHero` con avatar).
8. Nessun hero: `/allenamenti` (H1 e H2 sul crema), `/calendario` (H1 con icona arancione), admin (`AdminPageHeader`, ma `ConvocazioniClient` e le statistiche fanno a modo loro).

In più:

- `PageHero` ha un prop `align` usato senza regola (4 pagine a sinistra, le altre centrate);
- le altezze vanno da 286 a 365 px anche su pagine di servizio;
- la decisione "area utente con hero piccolo" (convenzioni del 25/05) non è applicata: `/notifiche` e `/profilo/disponibilita` hanno una fascia da circa 300 px (nel secondo caso sopra uno stato vuoto), mentre `/allenamenti`, la pagina più usata, non ne ha.

## Cosa fare

Tre modelli, e nessun altro.

1. **Hero con foto:** solo la home per chi non ha fatto l'accesso (UX-33).
2. **Page header** (`PageHero` rivisto), per tutte le liste pubbliche, compresi `/allenamenti` e `/calendario`:
   - fascia grafite di circa 160 px su desktop e 120 px su mobile, **sempre allineata a sinistra** al bordo del contenuto (UX-37);
   - titolo h1, una riga di sottotitolo facoltativa, uno slot facoltativo per la navigazione di sezione (UX-36) e uno per un'azione;
   - niente chip sopra il titolo, niente icona;
   - togliere il prop `align`.
3. **Entity hero** unico per allenamento, evento, partita, giocatore, squadra e avversaria:
   - breadcrumb, titolo, riga meta (data, ora, luogo), azioni (condividi, Gestisci per lo staff);
   - titolo allineato come il breadcrumb;
   - il tabellino della partita è il contenuto dell'entity hero della partita (UX-35).

Area utente (`/profilo`, `/profilo/*`, `/notifiche`) e admin: **nessuna fascia**, titolo h1 nel contenitore con il breadcrumb sopra, come `AdminPageHeader`. `ConvocazioniClient` e `MatchStatsClient` passano ad `AdminPageHeader`.

Aggiornare `design-conventions` in CLAUDE.md (sezione Hero) e togliere dalla lista dei parcheggiati del README la voce sulla migrazione.

## Criteri di accettazione

- Ogni pagina in `sitemap.ts` più area utente e admin usa uno dei tre modelli (elenco nella PR).
- Nessun uso di `align` su `PageHero`.
- Altezza della fascia uguale su tutte le liste.
- `npm run a11y` verde (`heading-order` compreso); schermate prima/dopo delle 8 varianti.

## Fatto (30/09/2026)

Tre commit su `develop`: area utente e admin, liste pubbliche, entity hero.

**Componenti**

- `PageHero` riscritto: fascia di 160 px su desktop e 120 su mobile (`minHeight`), testo a sinistra al bordo del contenuto (`maxWidth` uguale al Container sotto), props `title`, `subtitle`, `breadcrumb`, `nav`, `action`. Tolti `chip`, `align`, `py`, `subtitleMaxWidth` e i `children` liberi. `PageHeroFrame` (la sola fascia) lo usa anche `PageLoadingSkeleton`.
- `EntityHero` riscritto come hero unico dei dettagli: breadcrumb su una riga con le azioni dello staff (`manage`), titolo allineato al breadcrumb (o nascosto per la partita), `leading`, `subtitle`, `badges`, `meta` (voci `HeroMeta`), contenuto, `actions`. `EventHero` e `AllenamentoHero` restano come adattatori dei dati.
- `AdminPageHeader` diventa `PageHeader` in `components/common`, per admin e area utente; su mobile il titolo scende di un gradino.

**Pagine per modello**

| Modello | Pagine |
| --- | --- |
| Hero con foto | `/` |
| Page header | `/partite`, `/risultati`, `/classifiche`, `/marcatori`, `/squadre`, `/squadre/archivio`, `/squadre/sfida`, `/giocatori/confronta`, `/allenamenti`, `/calendario`, `/news`, `/eventi`, `/gallery`, `/contatti`, `/il-baskin`, `/faq`, `/sponsor`, `/privacy` |
| Entity hero | `/allenamento/[id]`, `/eventi/[slug]`, `/partite/[slug]`, `/giocatori/[slug]`, `/squadre/[season]/[slug]`, `/avversarie/[slug]` |
| Nessuna fascia (`PageHeader`) | `/profilo`, `/profilo/disponibilita`, `/profilo/ruolo`, `/profilo/traguardi`, `/notifiche`, tutto `/admin` (convocazioni e statistiche comprese) |
| Nessuna fascia (articolo) | `/news/[slug]`: breadcrumb sopra l'h1, com'era |

**Scelte fatte strada facendo**

- Contenuti che il nuovo modello non prevede: il riepilogo V/P/S per squadra dell'hero di `/risultati` è tolto (lo ripete l'intestazione di ogni squadra); i due bottoni dell'hero di `/contatti` sono tolti (li ripete la mini-nav); "Crea news" e "Gestisci tutti" degli eventi vanno nello slot azione; i link di `/classifiche` e `/marcatori` nello slot `nav` (li ripensa UX-36).
- Misure (Playwright, 1280 e 375 px): tutte le liste a 160 px su desktop; su mobile 120 px, tranne dove il contenuto va a capo: `/il-baskin` (sottotitolo su tre righe, 142), `/squadre/archivio` (breadcrumb, 150), `/classifiche` (tre link, 187).

**Rimasto fuori**

- Lo scorrimento orizzontale di `/admin/partite/[id]/convocazioni` a 375 px c'era già: lo causa la riga "Copertura" della toolbar, non l'intestazione (UX-40).
- Sulle pagine dell'avversaria la modifica resta la matita con il suo dialog, non un "Gestisci" verso l'admin.
