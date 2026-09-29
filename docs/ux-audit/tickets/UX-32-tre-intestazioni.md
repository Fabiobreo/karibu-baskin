# UX-32 · Tre modelli di intestazione di pagina

**Ondata:** 4 · **Stima:** L · **Dipende da:** UX-30 · **Stato:** da fare

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
