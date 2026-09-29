# UX-37 · Griglia unica e righe partita a colonne fisse

**Ondata:** 4 · **Stima:** M · **Dipende da:** UX-32 · **Stato:** da fare

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
