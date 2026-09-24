# UX-10 · Scala tipografica, minimo 12 px, regola ESLint

**Ondata:** 1 · **Stima:** M per tema, codemod e regola, più la verifica visiva per area · **Dipende da:** UX-09 · **Stato:** fatto per i criteri di accettazione (commit su `develop`): scala nel tema, nessun testo sotto 12 px (da 1749 a 0 sulle pagine di UX-01), regola ESLint con tetto di 621 avvisi. La migrazione dei letterali >= 12 px sulla scala resta da fare per area

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

## Esito

- **Scala nel tema** (`sharedTypography` in `theme.ts`):
  - `body2` 14 px;
  - `caption` 12 px, il minimo;
  - `overline` 12 px con un solo `letterSpacing` (`0.08em`) e peso 700;
  - nuova variante `stat` (peso 800, interlinea 1, cifre tabellari) per i numeri grandi, con l'augmentation di `TypographyVariants` e `TypographyPropsVariantOverrides`.
- **Minimo 12 px:** codemod con il parser TypeScript su tutti i `.tsx`. Porta a 12 px i `fontSize` letterali sotto i 12 px, anche dentro gli oggetti responsive: 258 valori in 74 file. Salta le icone (tag `*Icon`, selettori `svg`/`icon`, 301 valori), gli `Avatar` (36) e i file che generano immagini (OG, tabellino, `ShareTeamsButton`). Nei `Chip` ad altezza fissa sotto 20 px l'altezza passa a 20 (45 casi), perche' il testo non venga tagliato.
- **Sorgente dell'immagine delle squadre** (`ShareTeamsButton`): il nodo fuori schermo ora ha `aria-hidden`, i lettori di schermo leggevano due volte le squadre.
- **Regola ESLint** (quella del ticket, nello stesso array `no-restricted-syntax`, in `warn`): oggi **621 avvisi**, che e' il tetto: il numero deve solo scendere. Regola anche in CLAUDE.md.
- **Verifica:**
  - misura con lo stesso elenco di pagine di UX-01 (3 profili, desktop e mobile, 42 combinazioni): testi visibili sotto 12 px da **1749 a 0** (iniziali degli Avatar escluse);
  - nessun chip o cella tagliato (unici casi: due anteprime troncate di proposito e un titolo nascosto ai vedenti);
  - schermate prima/dopo di marcatori, risultati, admin utenti, admin partite, desktop e mobile, senza regressioni: righe e chip un filo piu' alti;
  - `npm run a11y` invariato.

**Rimasto fuori**

- **Migrazione dei letterali >= 12 px sulla scala** (i 621 avvisi): punto 2 del ticket oltre la soglia minima. Va fatta per area con verifica visiva, come previsto al punto 5 (5-8 giorni).
- **Pesi scritti a mano** (`fontWeight` 700-900): non toccati.
- **Livelli dei titoli** (punto 4, `heading-order`): da sistemare pagina per pagina insieme alla migrazione per area. Oggi axe li segnala come `moderate`, fuori dalla baseline grave.
- **Occhielli:** chi riscrive `letterSpacing` a mano nell'`sx` sovrascrive ancora quello unico del tema; si allineano con la migrazione per area.
