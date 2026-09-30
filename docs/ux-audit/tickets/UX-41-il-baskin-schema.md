# UX-41 · `/il-baskin` con uno schema del campo

**Ondata:** 4 · **Stima:** M · **Dipende da:** UX-21 (fatto), UX-29 · **Stato:** da fare

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
