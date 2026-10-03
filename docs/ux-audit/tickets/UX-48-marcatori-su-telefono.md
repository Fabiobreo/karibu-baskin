# UX-48 · `/marcatori` su telefono: prima i nomi, poi i filtri

**Ondata:** 5 · **Stima:** S · **Dipende da:** UX-45 · **Stato:** fatto (03/10/2026)

Nato dal [riaudit del 02/10/2026](../RIAUDIT-2026-10-02.md), problema 5.

## Problema

A 390 × 844 il primo giocatore di `/marcatori` comincia a circa 590 px: quasi tutta la prima schermata è cornice. In ordine: fascia con le tab di sezione, selettore di stagione, avviso di stagione, "Filtra per ruolo o tocca un'intestazione per ordinare", ricerca, sei chip di ruolo su due righe, interruttore "Più colonne", nota "I numeri comprendono anche le partite giocate in prestito".

Inoltre "N in prestito" è scritto sotto ogni numero di ogni riga (fino a cinque volte per giocatore), su desktop e su telefono. Era già segnato nel riaudit del 29/09.

## Cosa fare

1. Su telefono ricerca, ruolo e "Più colonne" stanno in una riga sola richiudibile ("Cerca e filtra"), chiusa all'apertura della pagina; se c'è un filtro attivo la riga lo dice ("Ruolo 3").
2. L'istruzione "tocca un'intestazione per ordinare" su telefono non serve (le card non hanno intestazioni): mostrarla solo da `sm`.
3. "In prestito": una sola indicazione per giocatore (accanto al nome, o nella colonna Giocate), e il dettaglio per voce solo con "Più colonne" o nel profilo del giocatore. La nota in cima resta.
4. Punti in inchiostro, non in arancio: vedi [UX-49](UX-49-tinta-squadra-e-azioni.md), che decide il colore; qui solo la disposizione.

## Revisione (03/10/2026, designer)

Il problema è giusto, la soluzione no: nascondere la ricerca toglie su telefono l'azione principale ("come sta andando mio figlio?"). Prevale questo:

1. **Su telefono una riga sola**: ricerca a tutta larghezza, alta 44 px (`TOUCH_FIELD_ON_PHONE`), e accanto il bottone "Filtri" da 44 px (diventa "Filtri · Ruolo 3" con un filtro attivo, `aria-expanded` + `aria-controls`). Nel pannello, chiuso all'apertura, i chip di ruolo e "Più colonne". Il conteggio "N giocatori" resta fuori dal pannello. Pannello e riga si alternano con le classi di breakpoint (`display: { xs, sm }`), non con `useMediaQuery`. Da `sm` in su resta tutto com'è.
2. **Istruzione** "Filtra per ruolo o tocca un'intestazione per ordinare": nascosta tutta su telefono (`display: { xs: "none", sm: "block" }`).
3. **"In prestito" solo nella colonna Giocate** ("7 · 2 in prestito"), mai accanto al nome (si leggerebbe come lo stato del giocatore). Tolto da tutte le altre colonne e dai punti delle card. "Più colonne" non mostra il dettaglio del prestito: quello sta nel profilo del giocatore.
4. **La nota sul prestito** va in fondo, accanto a quella sui minori nascosti.
5. **Avviso di stagione** di `SeasonSelector` su una riga sola ("La 2026-27 non è ancora iniziata: vedi la 2025-26."), vale anche per `/risultati` e `/classifiche`.
6. Sottotitolo della fascia e margini del Container non si toccano (regole comuni alle quattro pagine di Partite).
7. Il colore della colonna ordinata: vedi UX-49 (A).

## Criteri di accettazione

- A 390 × 844 il primo giocatore intero (nome e numeri) sta entro 560 px dall'alto (l'area utile di Safari col la barra in basso è circa 600 px).
- Al massimo una scritta "in prestito" per riga nella vista di base.
- Ricerca e filtro per ruolo funzionano come oggi; a 1.440 px la tabella è quella di oggi, tranne "in prestito".
- Testi nuovi in `it.json` ed `en.json`; `npm run a11y` verde.

## Esito (03/10/2026)

Fatto secondo la revisione del designer. Misure da anonimo, stagione 2025-26 (ricaduta):

- **390 × 844:** primo giocatore intero (nome e numeri) da 647-827 px a 388-540 px. Ricerca e bottone "Filtri" alti 44 px, pannello chiuso all'apertura, con un ruolo scelto il bottone dice "Filtri · Ruolo 3" (`aria-expanded`, `aria-controls`). Nessuno scorrimento orizzontale.
- **"In prestito":** da cinque a una per riga, solo in Giocate ("10 · 2 in prestito"; nella card la cella occupa anche la riga sotto, così la card non si allunga). Nella prima pagina della tabella a 1.440 px: 5 scritte su 25 righe.
- **1.440 px:** stesse colonne e stessa larghezza (1.134 px), cambia solo la colonna Giocate.
- Nota sul prestito in fondo, accanto a quella sui minori; istruzione nascosta su telefono; avviso di `SeasonSelector` su una riga (chiave nuova `common.seasonFallback`: `seasonNotStarted` resta per `/squadre`, che non usa il selettore).
- Logica pura (totali, ordinamento, filtri, etichetta del bottone, nota di prestito) in `@/lib/matches/scorersTable`, con test.
- `npm run a11y` non rieseguito in questo passaggio.
- **Correzioni dopo la revisione critica (03/10/2026):** `common.seasonFallback` dice la parola "stagione" ("La stagione 2026-27 non è ancora iniziata: vedi la 2025-26.").
