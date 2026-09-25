# UX-24 · Rifiniture rimaste dai ticket precedenti

**Ondata:** 3 · **Stima:** S · **Dipende da:** nessuno · **Stato:** da fare

## Problema

Piccole cose segnalate nei "Rimasto fuori" dei ticket 06, 16 e 17, ognuna troppo piccola per un ticket a sé.

| Da    | Cosa                                                                                                                                                                                                              |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UX-06 | `src/components/common/PlayerShareButtons.tsx`: il testo di condivisione del profilo è in italiano scritto nel codice ("punti totali", "a partita", "medaglia/medaglie top scorer"), anche con la lingua inglese. |
| UX-06 | Card mobile di `/marcatori`: c'è il totale ma non la parte "N in prestito", che la legenda annuncia.                                                                                                              |
| UX-16 | Coach e admin che giocano (hanno un ruolo Baskin) non vedono la card "La tua prossima cosa da fare": la home la mostra solo ad ATHLETE e PARENT (`src/app/page.tsx`, `isAthleteOrParent`).                        |
| UX-16 | `/profilo` calcola ancora il "prossimo allenamento" anche per chi ora vede la card: query inutile.                                                                                                                |
| UX-17 | Sigle rimaste dove manca spazio: V/P/S nei cerchietti di forma dei gironi (`GironeFullView`), "R1" nei chip giocatore del simulatore (`MatchSimulator`).                                                          |

## Cosa fare

1. `PlayerShareButtons`: testi nei dizionari con plurale ICU (`{count, plural, one {# medaglia} other {# medaglie}}`), in `it.json` ed `en.json`.
2. Card mobile dei marcatori: sotto il totale "N in prestito" (chiave `scorers.loanDetail`, già esistente), come nella tabella desktop.
3. Card prossima azione anche per chi ha un ruolo Baskin, qualunque sia il ruolo utente (`sportRole != null`). Verificare che `loadNextAction` regga uno staff senza iscrizioni.
4. `/profilo`: saltare la query del prossimo allenamento quando si mostra la card.
5. Sigle: V/P/S nei gironi con `aria-label` o `title` per esteso e una legenda sotto la tabella; nel simulatore `RoleBadge` al posto di "R1".

## Criteri di accettazione

- Nessun testo italiano scritto a mano nei componenti pubblici toccati (lingua inglese verificata).
- Uno staff con ruolo Baskin vede la card in home e in profilo.
- Nessuna regressione nelle schermate di marcatori mobile, gironi e simulatore.
