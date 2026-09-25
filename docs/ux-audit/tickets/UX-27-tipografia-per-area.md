# UX-27 · Migrazione tipografica per area e livelli dei titoli

**Ondata:** 3 · **Stima:** L (5-8 giorni, in PR per area) · **Dipende da:** UX-10 · **Stato:** da fare

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
