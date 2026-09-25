# UX-24 · Rifiniture rimaste dai ticket precedenti

**Ondata:** 3 · **Stima:** S · **Dipende da:** nessuno · **Stato:** fatto (commit su `develop`): tutti e cinque i punti

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

## Esito

1. **Condivisione del profilo:** i tre testi sono in `share.playerIntro`, `share.playerPoints` e `share.playerMedals` (it/en, plurali ICU), e la media usa i decimali della lingua. Verificato in inglese: "📊 138 total points · 13.8 per game over 10 games", "🏆 1 top scorer medal".
2. **Marcatori mobile:** sotto i punti della card compare "N in prestito" (`scorers.loanDetail`), come nella tabella desktop.
3. **Card "La tua prossima cosa da fare":** una sola regola, `showsNextAction(appRole, sportRole)` in `@/lib/nextAction` (con test): atleti, genitori e staff con un ruolo Baskin. In home il ruolo Baskin non è nella sessione, quindi per lo staff (e solo per lo staff) c'è una query in più prima del render. `loadNextAction` regge uno staff senza iscrizioni: lo staff è sempre ammesso e la card mette per prime le disponibilità da dare. Allo staff con ruolo la card prende il posto del banner delle disponibilità. Verificato: admin con ruolo 5 vede la card in home e in profilo; coach senza ruolo no.
4. **`/profilo`:** la query del prossimo allenamento parte solo quando la card non c'è.
5. **Sigle:** nei gironi i chip V/P/S hanno il nome per esteso (`aria-label` e `title`), più una legenda sotto il calendario ("V = Vittoria · P = Pareggio · S = Sconfitta"); nel simulatore `RoleBadge` al posto del chip "R1".

Verifiche: `tsc`, `npm test` (1790), `npm run a11y` verde (chiaro e scuro); prove con Playwright di home e profilo (admin con ruolo e coach senza), marcatori a 360 px, `/classifiche`, `/squadre/sfida`, testo di condivisione in inglese.

## Rimasto fuori

- Nella card mobile dei marcatori "26 in prestito" va su due righe quando la colonna è stretta: leggibile, ma si potrebbe accorciare.
- Nel simulatore il bottone per togliere un giocatore ha `aria-label="remove"`, in inglese scritto nel codice.
