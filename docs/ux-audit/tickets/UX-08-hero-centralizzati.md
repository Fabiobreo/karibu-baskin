# UX-08 · Hero: gradiente unico, meno marrone, niente cerchi

**Ondata:** 1 · **Stima:** M · **Dipende da:** UX-07 · **Stato:** fatto (commit su `develop`): fondo grafite unico da `heroStyles.ts`, bordo inferiore in tema scuro, niente cerchi, tolti 10 chip che ripetevano il titolo

## Problema

- Il gradiente degli hero (`heroGradient.dark` in `src/lib/heroStyles.ts`: `#1A1A1A → #2D1A0A → #3D2010`) si legge marrone, non nero: diluisce l'identità arancio e nero.
- È centralizzato in `PageHero` (21 pagine) ma **copiato a mano** altrove: `EntityHero.tsx:33`, `AllenamentoHero.tsx:218`, `app/giocatori/[slug]/page.tsx:504`, `app/partite/[slug]/page.tsx:47-49` e `:392-393`, più `SessionPageClient`, `NextMatchCard`, `ErrorPage`, `global-error`. Per cambiarlo oggi bisogna toccare 8-10 file.
- I cerchi decorativi di `PageHero` (`src/components/common/PageHero.tsx:54`, `:66`) sono ripetuti su ogni pagina e danno un aspetto da template.
- Molti hero hanno un chip sopra il titolo che ripete il titolo ("Eventi" sopra "Eventi", "Il Baskin" sopra "Cos'è il Baskin?").

## Cosa fare

1. Un solo token per il fondo degli hero, importato da tutti i punti sopra (inclusi i file con `#2D1A0A` / `#3D2010` letterali: `grep -rn "2D1A0A\|3D2010" src`).
2. Nuovo fondo: nero/grafite pieno, con al massimo un bagliore arancio leggero su un lato, senza virare al marrone su tutta la superficie.
3. **Dark mode:** un hero nero su fondo `#121212` si confonde con la pagina. Separarlo con un bordo inferiore o un gradino di colore.
4. Togliere i cerchi decorativi da `PageHero`.
5. Togliere il chip sopra il titolo quando ripete il titolo o la voce di menu attiva. L'orientamento lo danno breadcrumb e menu.
6. Non toccare le immagini OG (`opengraph-image.tsx`, tabellino): Satori non legge il tema, restano un lavoro separato (parcheggiato).

## Criteri di accettazione

- Nessun colore del gradiente scritto a mano fuori da `heroStyles.ts`.
- Hero visivamente neri in tema chiaro; distinguibili dalla pagina in tema scuro.
- Schermate prima/dopo di home, una lista (News), un dettaglio (partita), profilo giocatore, allenamento.

## Esito

- **Un solo punto per i colori:** `src/lib/heroStyles.ts` definisce il fondo grafite (`#141414 → #1E1E1E`) e:
  - `heroGradient.dark`, con un bagliore arancio leggero in alto a destra;
  - `heroGradient.footer`, senza bagliore, per footer e fasce scure;
  - `heroTint(colore)`: il colore di squadra, giocatore o esito affiora da un angolo invece di tingere tutto (`color-mix`, perche' il colore puo' arrivare dal database);
  - `heroImage(url)`: foto di copertina velata;
  - `heroResultColor`: vittoria e sconfitta.
- **Chi lo usa:** `PageHero`, `EntityHero`, `AllenamentoHero`, profilo giocatore, dettaglio partita (anche i gradienti vittoria/sconfitta, prima letterali), pagina squadra e `global-error.tsx`. Fuori da `heroStyles.ts` non restano `#2D1A0A` / `#3D2010` se non nelle immagini OG e nel tabellino, esclusi dal ticket.
- **Tema scuro:** `heroBottomBorder` e il nuovo campo `heroGradient.border` della palette: trasparente in chiaro, `rgba(255,255,255,0.14)` in scuro. Oltre alla linea c'e' il gradino di colore, hero `#1E1E1E` contro pagina `#121212`.
- **Cerchi:** tolti da `PageHero` (con la prop `decorativeCircles`), `EntityHero`, `AllenamentoHero`, giocatore, partita e squadra.
- **Chip che ripetevano il titolo o la voce di menu, tolti (10):** Eventi, Il Baskin, Confronto giocatori, I miei traguardi, Sponsor, Archivio squadre, Il mio profilo, Ruolo, News, Notifiche; chiavi rimosse dai dizionari. Restano quelli che aggiungono un'informazione: "Siamo qui", "Hai una domanda?", "Chi siamo", "Solo per gioco", la data dell'evento, "Partite" sulle disponibilita', "Karibu Baskin" sulla Gallery.
- **Verifica** con Playwright, prima e dopo, desktop (chiaro e scuro) e mobile: home, News, dettaglio partita, profilo giocatore, allenamento, eventi, squadra, footer. Bordo misurato: trasparente in chiaro, visibile in scuro. `npm run a11y`: nessuna nuova violazione; +1 nodo di `color-contrast` su `/marcatori` e `/risultati`, dovuto alle etichette "Stagione:"/"Ruolo:" in `text.disabled` (fuori dagli hero, e' UX-09): baseline non alzata.

**Rimasto fuori**

- Il fondo del footer e delle fasce scure (`heroGradient.footer`) e' ora grafite: cambia anche il footer, non solo gli hero.
- Occhielli e icone arancioni dentro gli hero (`primary.light`, es. `/classifiche`, `/marcatori`, `/partite`, `/risultati`) sono rimasti: su fondo grafite reggono il contrasto, ma sono arancio su elementi non toccabili (regola di UX-07). Da decidere se neutralizzarli.
- `NextMatchCard` (pagina squadra) e il banner "La tua squadra" dell'allenamento hanno gradienti propri con il colore della squadra: sono card, non hero, e non usano il marrone.
- Immagini OG e tabellino: tema parcheggiato.
