# UX-01 · Controllo di accessibilità ripetibile

**Ondata:** 0 · **Stima:** S · **Dipende da:** nessuno · **Stato:** fatto (commit su `develop`): `npm run a11y` con `e2e/a11y.mjs` e baseline iniziale di 71 voci gravi in `e2e/a11y-baseline.json`

## Problema

L'audit ha misurato le violazioni con axe-core una volta sola, con uno script esterno. Senza un controllo ripetibile ogni ticket successivo non ha un modo oggettivo per dimostrare di non aver peggiorato le cose.

## Cosa fare

- Script `npm run a11y` basato su Playwright (già installato, vedi `test:e2e`) e `axe-core`. Oggi `axe-core` arriva solo come dipendenza transitiva: aggiungerlo (o `@axe-core/playwright`) alle `devDependencies`.
- Regole: tag `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`, `best-practice`.
- Pagine e profili:
  - anonimo: `/`, `/allenamenti`, un dettaglio allenamento, `/calendario`, un dettaglio partita, `/risultati`, `/marcatori`, un profilo giocatore, `/contatti`, `/login`, `/eventi`;
  - atleta: `/`, `/profilo`, `/profilo/disponibilita`, un allenamento passato, `/notifiche`;
  - admin: `/admin`, `/admin/allenamenti`, `/admin/partite`, `/admin/utenti`, statistiche di una partita.
- Due viewport: 1440×900 e 390×844 (`isMobile`).
- Login tramite `POST /api/test-login` (richiede `ENABLE_TEST_LOGIN=true`); email degli utenti di prova da variabili d'ambiente, come in `e2e/helpers.ts`.
- Prima di lanciare axe: consenso cookie già dato in `localStorage` (`kb-cookie-consent`), strumenti di sviluppo nascosti (overlay Next e pulsante React Query producono falsi `target-size`).
- Uscita: riepilogo per pagina (id regola, impatto, numero di nodi) e file JSON. Codice di uscita 1 se compaiono violazioni `critical` o `serious` non presenti in un file di baseline (`e2e/a11y-baseline.json`), così lo si può adottare subito anche se oggi ci sono violazioni.

## Da sapere

- Il link "Vai al contenuto" è nascosto finché non riceve il focus: axe lo segnala come target troppo piccolo, è un falso positivo da escludere.
- Il dev server con Turbopack a volte serve una pagina di compilazione alla prima richiesta: fare un warm-up o un retry prima di misurare.

## Criteri di accettazione

- `npm run a11y` gira in locale contro il dev server e produce il riepilogo.
- La baseline iniziale è committata; nuove violazioni gravi fanno fallire lo script.
- Documentato in CLAUDE.md nella sezione "Comandi principali".

## Esito

- Script `e2e/a11y.mjs` (Node puro, senza passo di compilazione), lanciato da `npm run a11y`. Aggiunto `@axe-core/playwright` alle `devDependencies`.
- Opzioni: `--update-baseline` (riscrive solo i profili misurati) e `--only=anon,athlete,admin`. Report completo in `test-results/a11y/report.json` (ignorato da git).
- Utenti: `E2E_ATHLETE_EMAIL`/`E2E_ADMIN_EMAIL` da `.env.test` o `.env`. Se mancano, il primo ATHLETE e il primo ADMIN del DB (esclusi `@sim.test`). URL con id (allenamento, partita, statistiche) dal DB. Il profilo giocatore è il primo link di `/marcatori`, così rispetta le regole di visibilità.
- Per avere risultati ripetibili, oltre a quanto previsto:
  - si aspetta `<main id="contenuto">` (altrimenti era una schermata intermedia del dev server), la scomparsa degli skeleton e il `<title>`, che con lo streaming arriva dopo il `load`;
  - animazioni e transizioni spente: il nastro sponsor scorre e cambiava i `target-size` da un giro all'altro;
  - immagini esterne servite con un PNG locale: l'`Avatar` MUI inserisce il suo `<img>` solo a caricamento riuscito, quindi i `image-alt` dipendevano dalla rete.
- Verifica: tre giri consecutivi con esito identico (uscita 0). Togliendo una voce dalla baseline lo script esce con 1.

### Rimasto fuori / da sapere

- La baseline contiene difetti veri per i ticket successivi: `color-contrast` (38 voci), `image-alt` (13: `Avatar` senza `alt`, da UX-03), `target-size` (9: tra cui il bottone di pausa del nastro sponsor), `aria-progressbar-name` (4: profilo), `label` (2: 42 campi senza etichetta nelle statistiche partita, da UX-03/UX-13), `aria-input-field-name` (3), `list` (2: `/notifiche`).
- Le violazioni `moderate`/`minor` (per esempio `meta-viewport`, che chiude UX-02, e `heading-order`) compaiono nel riepilogo ma non entrano nella baseline e non fanno fallire.
- Lo script non avvia il server: serve `npm run dev` con `ENABLE_TEST_LOGIN=true`. La baseline dipende dai dati del DB di sviluppo: se cambiano molto, rigenerarla.
- Nessuna modifica alla UI, quindi niente schermate prima/dopo.
