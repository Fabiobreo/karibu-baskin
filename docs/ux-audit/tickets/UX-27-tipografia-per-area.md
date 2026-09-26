# UX-27 · Migrazione tipografica per area e livelli dei titoli

**Ondata:** 3 · **Stima:** L (5-8 giorni, in PR per area) · **Dipende da:** UX-10 · **Stato:** fatto (commit su `develop`, uno per area): zero `fontSize` letterali, regola in `error`, occhielli sul tema, nessun `heading-order` nelle 84 misure di `npm run a11y`

## Problema

UX-10 ha messo la scala nel tema e portato ogni testo ad almeno 12 px, ma ha lasciato la seconda metà del lavoro:

- **582 `fontSize` letterali** (avvisi ESLint, tetto fissato a 621 e sceso da solo con i ticket successivi) al posto delle varianti del tema;
- **pesi scritti a mano** (`fontWeight` 700-900) ovunque;
- **occhielli** con un `letterSpacing` riscritto nell'`sx`, che sovrascrive quello unico del tema;
- **livelli dei titoli** sbagliati: axe segnala `heading-order` su 30 combinazioni pagina/viewport (impatto `moderate`, fuori dalla baseline grave).

Avvisi per area, 25/09/2026:

| Area                                                 | Avvisi |
| ---------------------------------------------------- | ------ |
| `components/matches`                                 | 100    |
| `components/admin` + `app/admin`                     | 92     |
| `components/training`                                | 67     |
| `components/teams`                                   | 58     |
| `app/squadre`                                        | 49     |
| `components/common`                                  | 37     |
| `app/giocatori`, `app/partite`                       | 48     |
| `components/layout`, `calendar`, `profile`, `rating` | 65     |
| resto (`app/*` pubbliche, news, notifiche, gallery)  | 66     |

## Cosa fare

1. Una PR per area, nell'ordine della tabella o partendo dalle pagine più viste (home, allenamento, partite).
2. Per ogni area: `fontSize` letterali → `variant` o `sx={{ typography: "…" }}` sul gradino più vicino; pesi → quelli della variante, tranne dove l'enfasi è voluta; occhielli → `variant="overline"` senza `letterSpacing` locale; titoli → `component="h2"`/`"h3"` secondo la struttura della pagina, indipendente dallo stile.
3. Dopo ogni PR abbassare il tetto degli avvisi in ESLint al nuovo totale.
4. A migrazione finita, la regola passa da `warn` a `error`.

## Criteri di accettazione

- Per ogni area: schermate prima/dopo desktop e mobile, nessuna regressione visibile, tetto abbassato.
- A fine ticket: zero avvisi `fontSize`, regola in `error`, nessun `heading-order` nelle pagine di UX-01.

## Esito

- **Scala:** `@/lib/typeScale` (`TYPE_SCALE`, 14 gradini da 12 a 144 px: `xs` 12, `sm` 14, `md` 16, `lg` 18, `xl` 20, `xl2` 24 … `xl10` 144). È l'unica fonte dei `fontSize`: la usa anche il tema per `body2`, `caption` e `overline`. I gradini oltre `xl` hanno nomi-identificatore perché `TYPE_SCALE["2xl"]` resterebbe un letterale per ESLint.
- **Migrazione (579 letterali, 118 file):** un codemod guidato dalle posizioni di ESLint ha portato ogni valore al gradino più vicino in scala logaritmica (per esempio `0.78rem` → `xs`, `0.85rem` → `sm`, `2.6rem` → `xl5`), toccando solo la dimensione. `typography: "…"` al posto di `fontSize` avrebbe cambiato anche peso, interlinea e spaziatura, e secondo l'ordine delle chiavi nell'`sx` avrebbe potuto annullare pesi voluti. Tre ritocchi dopo il confronto delle schermate: titolo di `PageHero` sul desktop a `xl5` (con `xl6` andava a capo in Contatti), bottoni dell'hero della home a `sm` (con `md` a 390 px andavano uno sotto l'altro), nomi delle squadre nel dettaglio partita a `xl5`.
- **Occhielli:** in 59 tag con `variant="overline"` tolti `letterSpacing` (cinque valori diversi) e `fontWeight` 700 locali: valgono quelli del tema.
- **Regola:** `no-restricted-syntax` passa da `warn` a `error` (colori esadecimali in `sx`, `text.disabled` come testo, `fontSize` letterali: tutti a zero). `fontSize: "inherit"` non è segnalato, non essendo una dimensione.
- **Livelli dei titoli:** sistemati i salti nelle 15 pagine segnalate da axe. `Typography` con `variant="subtitle1/2"` o `h6` diventava `<h6>` anche quando era un titolo di sezione o un'etichetta: ora i titoli di sezione sono `h2` (con `h3` sotto), e numeri, date delle card partita, etichette dei riquadri admin e stati vuoti sono `p`. Lo stile non cambia. `SessionCard` ha la prop `headingComponent` (h3 in home, h2 in `/allenamenti`). `EmptyState` ora rende il messaggio come paragrafo.
- **Verifica:** schermate a pagina intera di 30 pagine, desktop e mobile, confrontate con un "prima" preso da una copia dell'ultimo commit precedente (git worktree con un dev server suo sulla porta 3100), con diff di pixel e altezze; le pagine con più di 15 px di differenza di altezza viste una per una. `tsc`, `npm test`, `npm run a11y` (84 misure, nessuna violazione grave, zero `heading-order`).
- **Trovato durante le schermate e corretto a parte** (commit `fix: header che faceva cadere il sito…`): se `/api/competitive-teams` rispondeva con un errore (anche un 429 del rate limit), l'header passava l'oggetto di errore a un `.filter` e tutta la pagina finiva in "Errore critico". Nuovo `fetchJson` in `@/lib/fetchJson`.

## Rimasto fuori

- **Pesi:** tolti solo quelli degli occhielli. I `fontWeight` 700-900 scritti a mano altrove restano: spesso sono l'enfasi voluta, e cambiarli in blocco senza guardarli uno per uno era rischioso.
- **Varianti:** il ticket suggeriva `variant` o `typography` al posto dei letterali; si è usata la scala (`TYPE_SCALE`), per il motivo detto sopra. Dove un testo ha già il suo `variant` e anche un `fontSize` della scala, si può semplificare quando si tocca il file.
- Nei log del dev server compaiono avvisi di hydration mismatch su alcune pagine admin, già presenti prima: da indagare a parte.
