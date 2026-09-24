# UX-09 · Niente grigio `text.disabled` come testo

**Ondata:** 1 · **Stima:** M · **Dipende da:** nessuno · **Stato:** da fare

## Problema

`text.disabled` (`#9E9E9E` in tema chiaro) è usato **293 volte in 96 file** come colore di testo normale: date, didascalie, etichette dei contatti, "(+13)" nei marcatori. Su bianco fa 2,67:1, sotto la soglia AA (4,5:1). È la causa principale delle violazioni di contrasto rilevate da axe (138 elementi in `/admin/allenamenti`, 174 in `/marcatori` su mobile). In tema scuro il token supera già la soglia: il problema è solo in chiaro.

Anche `#999795` su `#F7F4F1` (2,65:1) compare in alcune didascalie.

## Perché non è una sostituzione meccanica

Divisione degli usi (stima dall'analisi del codice):

- **circa 174 su testo:** diventano `text.secondary`;
- **circa 87 su icone:** quelle decorative degli stati vuoti (icone grandi da 56 px, per esempio `app/classifiche/page.tsx:230`) sono esenti; quelle che portano informazione hanno bisogno di almeno 3:1;
- **9 su bordi:** da valutare caso per caso;
- **157 dentro ternari** (`cond ? "text.disabled" : …`) che indicano uno **stato**: "non marcato", "zero", "passato". Passando a `text.secondary` lo stato si perde: serve un secondo segnale (icona, trattino, corsivo, etichetta).

## Cosa fare

1. Non ridefinire `palette.text.disabled`: MUI lo usa per i controlli disabilitati, che sono esenti dal requisito di contrasto.
2. Sostituire gli usi su testo con `text.secondary`.
3. Per i ternari di stato, aggiungere un secondo segnale oltre al colore e usare `text.secondary`.
4. Icone informative: almeno 3:1.
5. Correggere anche `#999795` e simili (`grep -rn "999795" src`).
6. Aggiungere una regola ESLint (nello stesso array `no-restricted-syntax` esistente in `eslint.config.mjs`, non in un nuovo blocco, che sostituirebbe la regola sui colori esadecimali) che vieti `color: "text.disabled"` fuori dai casi documentati.

## Criteri di accettazione

- axe non segnala `color-contrast` dovuti a `#9E9E9E` sulle pagine di UX-01.
- Gli stati "non marcato / zero / passato" restano distinguibili anche senza colore.
