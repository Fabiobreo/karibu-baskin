# UX-38 · Copertine tipografiche e stati vuoti compatti

**Ondata:** 4 · **Stima:** S · **Dipende da:** UX-19 · **Stato:** da fare

## Problema

UX-19 ha tolto il "documento finto", ma `CoverFallback` produce ora un'altra forma di segnaposto:

- **Eventi** (`/eventi`, `src/components/common/CoverFallback.tsx`): tutte le copertine senza foto sono identiche (fondo grafite con il campo disegnato) e riportano la data, **ripetuta** nel chip sotto la copertina. Una griglia di card uguali sembra un caricamento o un errore.
- **News in evidenza senza foto** (`FeaturedCard`, home): blocco da 380 px con il testo solo nel terzo superiore e il campo disegnato nel resto.

Altri stati vuoti che pesano più del contenuto:

- **Profilo giocatore senza partite:** tessera "3 allenamenti" affiancata a una card "non ha ancora giocato partite ufficiali", di altezze e pesi diversi.
- **`/profilo/disponibilita` senza partite:** fascia da 300 px sopra lo stato vuoto (UX-32 la toglie), più l'istruzione "Tocca Sì o No per ogni partita" mostrata anche quando non ci sono bottoni.
- **Squadre dell'allenamento non ancora fatte:** riquadro tratteggiato alto circa 160 px.
- **Gallery:** in sviluppo è vuota perché mancano le chiavi di Instagram (non è un difetto), ma in produzione una sincronizzazione fallita lascerebbe nel menu una pagina vuota.

## Cosa fare

1. **Copertina di ripiego tipografica:**
   - titolo dell'evento (non la data) in grande su fondo grafite;
   - piccolo segno del tipo (torneo, trasferta, festa…) o una delle 3-4 varianti di fondo scelta in modo stabile dall'id, così due card vicine non sono uguali;
   - la data resta solo nel chip.
2. **News in evidenza senza foto:** card alta quanto il contenuto, oppure affiancata alle altre come card normale.
3. **Profilo giocatore senza partite:** una sola card a tutta larghezza ("3 allenamenti · nessuna partita ufficiale per ora"), traguardi sotto.
4. **Istruzioni** della disponibilità solo se c'è almeno una partita.
5. **Squadre non ancora fatte:** una riga di testo nella sezione, senza riquadro.
6. **Gallery:** voce di menu nascosta quando non ci sono contenuti visibili (post Instagram non nascosti e video).

## Criteri di accettazione

- In `/eventi` due card vicine senza foto non sono identiche; la data compare una volta per card.
- Nessuno stato vuoto più alto di 120 px nelle pagine citate, salvo le pagine intere senza contenuto (`EmptyState`).
- Testi in `it.json` ed `en.json`; `npm run a11y` verde.
