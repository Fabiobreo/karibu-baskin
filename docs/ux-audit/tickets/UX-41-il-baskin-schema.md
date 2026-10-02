# UX-41 · `/il-baskin` con uno schema del campo

**Ondata:** 4 · **Stima:** M · **Dipende da:** UX-21 (fatto), UX-29 · **Stato:** fatto (su `develop`), con il criterio dell'altezza raggiunto solo in parte e i testi nuovi da far rileggere al club

## Problema

`/il-baskin` (`src/app/il-baskin/page.tsx`, contenuti in `src/lib/content/baskinInfo.ts`) è la pagina che spiega uno sport che quasi nessuno conosce, ed è fatta solo di testo:

- 6 card di regole con 3-5 elementi puntati ciascuna;
- 5 card dei ruoli, ognuna con una **fascia di colore pieno** (i colori dei ruoli di UX-11 usati come fondo), elenco puntato, tre riquadri (Canestro, Punteggio, Chi lo può marcare) e "Regole complete";
- 4.093 px su desktop e 5.871 su mobile;
- righe di testo a circa 850 px (circa 120 caratteri);
- nessuna immagine: non si vede dove stanno i canestri laterali, le zone protette dei pivot, chi marca chi.

Per chi legge poco, compresi gli atleti con disabilità intellettive (vedi l'obiezione della contro-revisione in RIAUDIT.md), uno schema vale più di tutti gli elenchi.

## Cosa fare

1. **Schema SVG del campo** (niente librerie, come `PointsTrendChart`), in cima:
   - canestri grandi, canestri laterali alto (2,20 m) e basso (1,10 m), zone dei ruoli 1 e 2;
   - legenda con i numeri dei ruoli;
   - colori dal tema, leggibile in chiaro e in scuro;
   - testo alternativo che descrive lo schema.
2. **"Tre cose da sapere"** prima delle regole complete: 6 in campo, ogni ruolo ha il suo canestro e i suoi punti, i pivot non si marcano.
3. **Ruoli:**
   - 5 card compatte con numero grande, nome, frase breve (`summary` di UX-17) e pittogramma (gli stessi del questionario);
   - niente fasce di colore pieno;
   - i dettagli (canestro, punteggio, chi marca, regole complete) in un'area che si apre.
4. **Regole:** una card per argomento, massimo 3 punti visibili, il resto in "Regole complete".
5. Testi lunghi in colonna di lettura a 680-720 px (UX-37).

## Criteri di accettazione

- Schema visibile senza scorrere a 390 × 844 dopo l'intestazione, o entro il secondo schermo.
- Altezza della pagina ridotta almeno del 30% a parità di contenuti (i dettagli restano apribili).
- `npm run a11y` verde; schema con nome accessibile; testi in `it.json`/`en.json` o in `baskinInfo.ts` per entrambe le lingue.

## Decisioni (02/10/2026)

- **Fonte dello schema:** Regolamento di gioco EISI, Rev. 20, "Campo di gioco (adattato)": due canestri laterali a metà campo sul perimetro (2,20 m), con sotto il canestro basso del Ruolo 1 (1,10 m) e davanti un'area a semicerchio di 3 m; ogni squadra ha il suo canestro laterale.
- **Colore dei ruoli:** resta la fascia piena nel colore del ruolo (UX-29), con il numero in grande. Il punto "niente fasce di colore pieno" è superato.
- **Niente pittogrammi sui ruoli:** quelli del questionario descrivono la mobilità (carrozzina, cammino, corsa), non i cinque ruoli; usarli definirebbe il ruolo dalla disabilità, contro UX-17.
- **Canestro e punteggio restano visibili** nelle card dei ruoli: sono ciò che distingue un ruolo dall'altro e ciò che mostra lo schema. Si aprono solo il resto del "cosa fa in campo", chi lo può marcare e il testo tecnico.
- **Colonna di lettura a 760 px**, quella di UX-37, non 680-720.

## Cosa è stato fatto

1. **Ordine della pagina:** tre cose da sapere, campo, ruoli, regole, storia, "Lo sapevi".
2. **Schema** `BaskinCourtDiagram` (`@/components/common/BaskinCourtDiagram`): linee in SVG nel colore del testo (chiaro e scuro), lettere A e B e numeri dei ruoli (`RoleBadge`) in HTML sopra il disegno, così restano leggibili a 360 px. Descrizione nel nome accessibile, legenda in tre righe sotto (a fianco da desktop). Le zone dei pivot sono disegnate un po' più grandi del vero per farci stare i numeri. I Ruoli 3, 4 e 5 sono a triangolo davanti al canestro grande, non in fila. La didascalia dice quale canestro a lato usa ogni squadra: quello alla propria destra, guardando il canestro grande in cui segna (indicazione del committente, 02/10/2026).
3. **Ruoli:** fascia colorata con numero e nome, prima frase del "cosa fa in campo", canestro e punteggio; il resto in "Come gioca e chi lo può marcare".
4. **Regole:** cinque card (il campo lo racconta lo schema), tre punti visibili e gli altri in "Altre regole". I punti di `baskinInfo.ts` sono ordinati dal più importante: i primi tre (`RULE_VISIBLE_ITEMS`) sono quelli visibili. Scelta dei tre punti:
   - _La squadra:_ in campo in 6, la somma 23, la composizione obbligatoria (dopo: fino a 14 giocatori, una donna e un uomo);
   - _Canestri e punti:_ 2 o 3 punti, da cosa dipende, massimo 3 canestri per tempo (dopo: i 3 tiri del Ruolo 5);
   - _Regole speciali:_ passi e doppio del Ruolo 3, niente 3 secondi, falli dei Ruoli 1 e 2 (dopo: il ritorno nella propria metà campo);
   - _Durata_ e _Protezione dei pivot:_ ordine invariato.
5. `/il-baskin` è ora fra le pagine misurate da `npm run a11y`.

## Misure (02/10/2026)

| Misura                                            | Prima    | Dopo                            |
| ------------------------------------------------- | -------- | ------------------------------- |
| Altezza del contenuto a 390 px (footer escluso)   | 5.623 px | 4.658 px (-17%)                 |
| Altezza del contenuto a 1.280 px (footer escluso) | 3.791 px | 3.561 px (-6%)                  |
| Fine dello schema a 390 × 844                     | assente  | 775 px, dentro il primo schermo |

`npx tsc --noEmit`, `npm run lint`, `npm test` (1.987 test) e `npm run a11y -- --only=anon` verdi.

## Aperto

- **Il -30% non è raggiunto.** Il criterio contava di chiudere tutto; qui la pagina ha due blocchi nuovi (tre cose e schema) e tiene visibili canestro e punteggio. Per arrivarci bisognerebbe chiudere anche quelli, o chiudere del tutto le regole.
- **Testi nuovi da far rileggere al club:** la legenda e la descrizione dello schema, la scelta dei tre punti visibili per regola. Le tre cose da sapere e la didascalia le ha riviste il committente il 02/10/2026.
- **Schema da far guardare a un allenatore:** è disegnato dal testo del regolamento, non dalle sue figure.
