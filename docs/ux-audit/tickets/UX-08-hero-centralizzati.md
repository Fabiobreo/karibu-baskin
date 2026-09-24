# UX-08 · Hero: gradiente unico, meno marrone, niente cerchi

**Ondata:** 1 · **Stima:** M · **Dipende da:** UX-07 · **Stato:** da fare

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
