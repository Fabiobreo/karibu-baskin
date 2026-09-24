# UX-01 · Controllo di accessibilità ripetibile

**Ondata:** 0 · **Stima:** S · **Dipende da:** nessuno · **Stato:** da fare

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
