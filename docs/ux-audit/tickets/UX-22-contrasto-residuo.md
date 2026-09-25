# UX-22 · Contrasto residuo: baseline di `npm run a11y` a zero

**Ondata:** 3 · **Stima:** M · **Dipende da:** nessuno · **Stato:** da fare

## Problema

`e2e/a11y-baseline.json` contiene ancora **18 voci gravi**: 17 `color-contrast` e 1 `target-size`. Sono difetti veri, tollerati finora perché fuori dal perimetro dei ticket precedenti (vedi UX-09, "Rimasto fuori"). Misura del 25/09/2026:

| Dove                                                               | Nodi       | Cosa                                                                                            |
| ------------------------------------------------------------------ | ---------- | ----------------------------------------------------------------------------------------------- |
| `/admin/utenti` (mobile)                                           | 24         | chip ruolo utente "Atleta": bianco su `info` (`#0288D1`)                                        |
| `/admin/partite`                                                   | 17         | chip squadra con colore dal database (verde, arancio) e testo bianco                            |
| `/admin/allenamenti`                                               | 15         | righe degli allenamenti conclusi: testo bianco su pastello, con opacità ridotta sul contenitore |
| `/admin` (dashboard)                                               | 5          | chip `warning` ("N senza email") e chip `info`                                                  |
| `/giocatori/[slug]`                                                | 14         | un bottone e i valori delle card statistiche                                                    |
| `/calendario`, `/contatti`, dettaglio partita, allenamento passato | 1 ciascuno | un giorno del calendario, un bottone, una cella di tabella, un chip squadra                     |
| dettaglio partita (mobile)                                         | 1          | `target-size`: un link troppo piccolo                                                           |

I selettori esatti sono in `test-results/a11y/report.json` dopo `npm run a11y`.

## Cosa fare

1. **Colori dal database** (squadre): un solo helper che, dato un colore, sceglie il testo (bianco o scuro) con `contrastText` di `@/lib/colorUtils` e, se nessuno dei due arriva a 4,5:1, scurisce il fondo. Usarlo in tutti i chip squadra, pubblici e admin.
2. **Chip `info` e `warning` pieni:** nel tema, fondo scurito o testo scuro (come `primary.fill` in UX-07). Verificare in chiaro e in scuro.
3. **Righe concluse di `/admin/allenamenti`:** niente `opacity` sul contenitore; si attenuano con `text.secondary` e un'etichetta "Concluso".
4. **Profilo giocatore:** capire quali valori scendono sotto soglia e usare `primary.onLight` o `text.primary`.
5. Casi singoli: uno per uno, dal report.
6. `target-size` nel dettaglio partita: area di tocco di almeno 24×24 px.
7. `npm run a11y -- --update-baseline` e committare la baseline vuota.

## Criteri di accettazione

- `e2e/a11y-baseline.json` vuota e `npm run a11y` verde.
- Nessun colore scritto a mano: soglie e colori passano dal tema o da `colorUtils`.
- Schermate prima/dopo di admin utenti, admin partite, admin allenamenti e profilo giocatore, tema chiaro e scuro.
