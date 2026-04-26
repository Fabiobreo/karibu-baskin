# CLAUDE_CHANGES — 2026-04-27 07:00

## Cosa è stato fatto e perché

### 1. Note partita visibili su `MatchStatsTable` (`/partite/[slug]`)

Il campo `notes` di `PlayerMatchStats` era già:
- salvabile dall'admin tramite `MatchStatsDialog` (commit `ed2c421`)
- visibile nel profilo giocatore (`/giocatori/[slug]`) alla sezione "Statistiche per partita"

Ma **non** veniva mostrato nella pagina pubblica di dettaglio partita `/partite/[slug]`,
che usa `MatchStatsTable`. Il tipo `MatchStatRow` non includeva `notes`, quindi
Prisma passava il dato ma veniva silenziosamente ignorato.

Fix:
- Aggiunto `notes?: string | null` a `MatchStatRow`
- Aggiunto rendering condizionale nella cella "Giocatore": testo corsivo,
  color `text.disabled`, `fontSize: 0.7rem`, sotto il chip ruolo sportivo
- Stile coerente con come le note appaiono nel profilo giocatore

### 2. Sitemap: aggiunte `/risultati`, `/classifiche` e `/partite/[slug]`

Le pagine `/risultati`, `/classifiche` (aggiunte nelle ultime settimane) e tutte
le pagine dinamiche `/partite/[slug]` non erano incluse nel sitemap generato da
`src/app/sitemap.ts`. I Google bot non le avrebbero trovate tramite il sitemap.

Fix:
- Aggiunte `/risultati` e `/classifiche` alle `staticPages` (priorità 0.75, weekly)
- Aggiunto `prisma.match.findMany` al `Promise.all` esistente (parallelo agli altri)
- Generato `matchPages` con `url: /partite/${slug ?? id}` (retrocompatibile)
- Aggiunto `matchPages` al `return` finale

## File modificati

| File | Modifica |
|---|---|
| `src/components/MatchStatsTable.tsx` | `notes` in `MatchStatRow`; display corsivo nella cella giocatore |
| `src/app/sitemap.ts` | `/risultati`, `/classifiche` statiche; `/partite/[slug]` dinamiche |

**Diff sintetico:**
```
src/app/sitemap.ts                 | 18 ++++++++++++++++-
src/components/MatchStatsTable.tsx |  7 +++++++
2 files changed, 23 insertions(+), 2 deletions(-)
```

## Come testare

### Note in MatchStatsTable
1. `npm run dev`
2. Verifica che `MatchStatsDialog` abbia almeno un giocatore con note salvate
3. Vai su `/partite/[slug]` della partita → sezione "Marcatori"
4. Sotto il nome di quel giocatore deve comparire il testo delle note in corsivo/grigio
5. Giocatori senza note: nessun cambiamento visivo

### Sitemap
1. Avvia il dev server
2. Visita `http://localhost:3000/sitemap.xml`
3. Verificare che compaiano URL `/risultati`, `/classifiche` e `/partite/[slug o id]`

## Rollback in 1 comando

```bash
git revert bc03440 --no-edit
```

## Livello di confidenza

**ALTO** — nessuna modifica al DB o alle API. TypeScript `--noEmit` passa senza errori.
- `MatchStatRow.notes` è opzionale (`?`) quindi non rompe i consumer esistenti
- La fetch aggiunta in `sitemap.ts` è parallela e non modifica il comportamento esistente
- Il campo `match.notes` (campo note sulla partita, non sul giocatore) non è coinvolto
