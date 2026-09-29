# UX-29 · Palette semantica chiusa e colori squadra per identità

**Ondata:** 4 · **Stima:** M · **Dipende da:** nessuno · **Stato:** da fare

## Problema

UX-07 ha fissato "arancio solo su ciò che si tocca", ma il colore ha ancora più significati. Nel riaudit del 29/09 ([RIAUDIT-2026-09-29.md](../RIAUDIT-2026-09-29.md), punto 1):

- **Arancio** = azione, marchio, squadra (Kapuleti 2025-26 `#E65100`, Karibu `#FF6D00`, "Montekki (sim)") e pareggio (`match.draw`). In più è il ripiego quando una squadra non ha colore: `t.color ?? "primary.main"` in `ClassificaInternaTable.tsx:447` e `:581` e in `GironeFullView.tsx:151`.
- **Verde** = vittoria, Montekki 2025-26 (`#43A047`) e il ruolo utente "Genitore" in `/admin/utenti`.
- **Stessa squadra, due colori.** `CompetitiveTeam.color` sta sul record della stagione (`prisma/schema.prisma:358`), quindi Kapuleti è rosso `#C62828` nel 2026-27 (`/partite`, `/squadre`, `/calendario`) e arancione `#E65100` nel 2025-26 (`/risultati`, `/classifiche`, `/marcatori`). Lo stesso vale per Montekki (blu, poi verde).
- **Altre tinte:** calendario (allenamento verde acqua, evento blu, `lightCalendar`/`darkCalendar` in `theme.ts`), numeri KPI della dashboard admin (verde acqua e blu da `palette.admin`), chip del ruolo utente in admin (Atleta blu, Genitore verde, Ospite grigio).

Effetto: circa 10 tinte con significati sovrapposti. L'occhio smette di fidarsi del colore e deve leggere tutto: un chip squadra arancione sembra un bottone, uno verde sembra "ha vinto".

## Cosa fare

1. **Regola scritta in CLAUDE.md** (sezione Convenzioni): arancio (`primary`) solo per azioni e stato attivo; `match.win/loss/draw` solo per l'esito; nessun altro significato per verde, rosso e ambra.
2. **Palette squadre** in `theme.ts` (`palette.team`, 6 tinte in chiaro e in scuro) che **esclude** arancio, verde, rosso e ambra: per esempio blu, viola, verde acqua scuro, ardesia, bordeaux, senape scuro, da verificare a 3:1 sul bianco come elemento grafico. Il selettore colore di `AdminSquadreClient` propone solo queste tinte (oggi 8 costanti libere).
3. **Colore per identità, non per stagione.** Decisione da prendere (vedi sotto). Nel frattempo, alla creazione della squadra della nuova stagione, precompilare il colore con quello della squadra omonima della stagione precedente.
4. **Ripiego:** dove oggi c'è `t.color ?? "primary.main"`, usare un neutro (`text.secondary`) o la prima tinta di `palette.team`, mai l'arancio.
5. **Pareggio:** `match.draw` passa dall'arancio all'ambra/senape (resta leggibile come testo, vedi le note di UX-28 sul contrasto), così non coincide più col marchio.
6. **Ruolo utente in admin:** chip neutri con icona (Atleta, Genitore, Ospite), senza verde e blu.
7. **Calendario:** tipi distinti da icona e forma del chip (pieno o contornato), con una sola tinta di marchio per le partite; allenamento ed evento in neutri.
8. **KPI della dashboard admin:** numeri in `text.primary`; l'accento sta solo sulla card che chiede un'azione (oggi "Allenamenti da completare").

## Decisione da prendere

| Opzione                     | Cosa cambia                                                                                                                                                                        |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Precompilazione**      | Nessun cambio di modello: la nuova stagione eredita il colore dalla squadra con lo stesso nome. I dati vecchi si allineano con uno script una tantum.                              |
| **B. Colore sull'identità** | Nuovo campo (o modello `TeamIdentity`) condiviso fra le stagioni della stessa squadra; `CompetitiveTeam.color` diventa un ripiego. Richiede migration e aggiornamento delle query. |

A è sufficiente se lo staff non vuole colori diversi per stagione.

## Criteri di accettazione

- Nessuna squadra con arancio, verde o rosso come colore; nessun ripiego arancione.
- La stessa squadra ha lo stesso colore in `/partite`, `/risultati`, `/classifiche`, `/marcatori`, `/squadre` e `/calendario`.
- Nelle pagine di `npm run a11y`, in chiaro e in scuro, l'arancio compare solo su elementi toccabili e stato attivo (sonda come in UX-28).
- `npm run a11y` verde.
