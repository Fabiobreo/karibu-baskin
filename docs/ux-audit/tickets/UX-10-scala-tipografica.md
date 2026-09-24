# UX-10 · Scala tipografica, minimo 12 px, regola ESLint

**Ondata:** 1 · **Stima:** M per tema, codemod e regola, più la verifica visiva per area · **Dipende da:** UX-09 · **Stato:** da fare

## Problema

- **892 `fontSize` letterali in 193 file**; fino a 23 dimensioni di testo diverse in una pagina; pesi da 400 a 900 ovunque (489 `fontWeight` fra 700 e 900 scritti a mano).
- Circa 180 valori fra 0,6 e 0,68 rem (9,6-10,9 px): chip dei ruoli, meta dei risultati, didascalie. `/marcatori` ha 124 testi sotto 12 px su desktop e 250 su mobile.
- L'eyebrow maiuscoletto è riscritto in 36 file con 7 valori di `letterSpacing`.
- Titoli di sezione resi come `h6` o `subtitle` saltano livelli (axe: `heading-order` quasi ovunque).

Le dimensioni reali sono circa una dozzina (0,72, 0,68, 0,7, 0,65 rem…): si possono mappare su una scala.

## Cosa fare

1. **Scala nel tema** (`src/theme.ts`, `sharedTypography`): `h1`-`h4`, `body1`, `body2` (14 px), `caption` (**12 px minimo**), `overline` (eyebrow, un solo `letterSpacing`), più una variante `stat`/`display` per i numeri grandi (tabelloni, punti) e le iniziali degli `Avatar`, che altrimenti sarebbero falsi positivi.
2. **Codemod** (jscodeshift): sostituire `fontSize` letterali con la chiave `typography` di `sx` o con `variant`, mappando ogni valore al gradino più vicino, e i valori sotto 12 px a `caption`. Circa un giorno per la parte meccanica.
3. **Regola ESLint** da aggiungere all'array `no-restricted-syntax` **esistente** in `eslint.config.mjs` (un secondo blocco sostituirebbe la regola sui colori esadecimali):
   ```js
   {
     selector: "JSXOpeningElement:not([name.name=/Icon$/]) > JSXAttribute[name.name=/^(sx|InputProps|slotProps)$/] Property[key.name='fontSize'] Literal",
     message: "fontSize letterale: usa variant o sx={{ typography: '…' }}",
   }
   ```
   Le 287 icone con `fontSize` in `sx` sono escluse dal selettore; le 160 con `fontSize="small"` non sono toccate.
   Livello `warn` con un tetto di avvisi che scende nel tempo; `error` solo a migrazione finita.
4. Titoli di sezione: livello semantico corretto (`component="h2"` / `h3`) indipendente dallo stile.
5. **Verifica visiva per area** (PR separate): il minimo di 12 px cambia l'impaginazione di chip e tabelle dense (marcatori su mobile, admin). Stimare 5-8 giorni complessivi, da distribuire.

## Criteri di accettazione

- Nessun testo sotto 12 px nelle pagine di UX-01 (misurabile con lo stesso script).
- Nuovi `fontSize` letterali segnalati dal lint.
- Nessuna regressione visibile in marcatori mobile, risultati, admin utenti e admin partite (schermate prima/dopo).
