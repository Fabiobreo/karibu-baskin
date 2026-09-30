# UX-37 · Griglia unica e righe partita a colonne fisse

**Ondata:** 4 · **Stima:** M · **Dipende da:** UX-32 · **Stato:** fatto (su `develop`)

## Problema

**Larghezze.** Il contenuto sta a 852 px (`Container maxWidth="md"`, 54 usi) nella maggior parte delle pagine e a 1.152 px (`"lg"`, 18 usi) in `/marcatori`, `/calendario`, `/eventi` e admin. L'header occupa tutta la larghezza, con il logo a x = 24 e il contenuto a x = 294.

**Bordi sinistri.** Il breadcrumb parte a x = 20 (partita, giocatore), 64 (allenamento, evento), 144 (admin) e 168 (convocazioni). Uniformato una prima volta il 26/05, poi di nuovo divergente.

**Righe partita.** In `/partite` e nei `PlayedMatchRow` a desktop, "Squadra vs Avversaria" e il punteggio sono centrati sul contenuto e non su colonne: il "vs" e i punteggi si spostano di 6-20 px da una riga all'altra (dipende dalla lunghezza dei nomi), e la lista non si legge in verticale.

## Cosa fare

1. **Griglia unica:**
   - contenitore interno dell'header e del contenuto alla stessa larghezza (1.120-1.200 px) e agli stessi margini laterali (16 px su mobile, 24 su tablet, 32 su desktop);
   - colonna di lettura a 720-760 px per i testi lunghi (`/il-baskin`, news, privacy) dentro la griglia, non come contenitore più stretto a sé.
2. **Bordo sinistro unico:** breadcrumb, titolo del page header ed entity hero partono dal bordo del contenuto.
3. **Righe a colonne fisse** (`display: grid`) per partite e risultati da tablet in su:
   - data | nostra squadra (allineata a destra) | punteggio (larghezza fissa, cifre tabulari) | avversaria (allineata a sinistra) | esito | chevron;
   - su mobile resta l'impaginazione a due livelli di UX-18.
4. Stessa idea per le righe degli allenamenti e degli eventi: colonna data fissa, contenuto, stato o azione a destra.

## Criteri di accettazione

- Una sola larghezza di contenitore nelle pagine pubbliche (misurata dal DOM).
- Breadcrumb allo stesso x in tutte le pagine che lo hanno, a 1.440 px.
- In `/partite` e `/risultati` il separatore e i punteggi stanno alla stessa x in tutte le righe.
- `npm run a11y` verde, nessuno scroll orizzontale a 360 px.

## Fatto (30/09/2026)

- **Griglia:** `MuiContainer` nel tema con margini 16/24/32 px; tutti i `Container` pubblici `md`/`sm` diventano `lg` (1.200 px, 1.136 di contenuto). `PageHero`, `PageHeroFrame`, `EntityHero` e `PageLoadingSkeleton` non hanno più la prop `maxWidth`. L'header sta nello stesso `Container`: il logo parte dal bordo del contenuto.
- **Colonna di lettura:** `READING_WIDTH = 760` in `@/lib/layout`, allineata a sinistra dentro la griglia, per `/il-baskin`, `/faq`, `/privacy`, `/sponsor`, `/news`, `/news/[slug]`, `/notifiche` e `/profilo/ruolo`.
- **Header nella griglia:** tolta la voce "Home" (ci porta il logo), bottoni del menu senza larghezza minima e mai a capo; fra 900 e 1.200 px il nome del club accanto al logo si nasconde.
- **Righe partita:** `/partite` e `PlayedMatchRow` (risultati, pagina squadra) da `sm` in su sono una griglia: data | noi (a destra) | "vs" o punteggio (larghezza fissa, cifre tabulari) | loro (a sinistra) | casa, tipo e luogo o esito. Su mobile resta UX-18.

**Misure (Playwright, 28 pagine, admin collegato):** a 1.440 px logo, breadcrumb e titolo a x = 152 ovunque (entity hero con avatar: il titolo dopo l'avatar); a 360 px tutti a x = 16; una sola larghezza di contenitore (1.200) oltre all'hero con foto della home; nessuno scroll orizzontale a 360 px.

**Rimasto fuori**

- Punto 4 (righe di allenamenti ed eventi a colonne): le righe degli allenamenti hanno già la colonna data fissa; gli eventi sono card, non righe.
- Fra 900 e circa 1.000 px la barra dell'header sfora ancora di 26-108 px (prima di questo ticket circa 340): servirebbe il menu compatto fino a 1.024 px, che però tocca la navigazione a fondo pagina di mobile.
