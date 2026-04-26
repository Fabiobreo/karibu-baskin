# CLAUDE_CHANGES — 2026-04-27 12:00

## Cosa è stato fatto e perché

### Bug: risposta API partite incompleta causava crash e dati mancanti

**Sintomo**: dopo aver creato una nuova partita dall'admin (`POST /api/matches`), la riga
appena aggiunta nella tabella non aveva `_count`, `color` del team e `group`. Questo
causava un `TypeError: Cannot read properties of undefined (reading 'playerStats')` nel
rendering della colonna "Stats" (`m._count.playerStats`), perché il client aggiungeva
il record allo state tramite `as Match` (type assertion) senza che la risposta API
includesse i campi richiesti.

Lo stesso problema (mancanza di `color` e `group`) affliggeva il `PUT` (modifica
partita): dopo un salvataggio, il chip colore squadra perdeva il colore e il girone
assegnato non veniva aggiornato nello stato locale.

**Root cause**: le response di `POST /api/matches` e `PUT /api/matches/[matchId]`
usavano un `include`/`select` ridotto che non includeva tutti i campi necessari al
tipo `Match` del client (`AdminPartiteClient.tsx`).

**Fix**: aggiunto a entrambi gli endpoint:
- `team: { select: { ..., color: true } }` — ripristina colore chip
- `group: { select: { id: true, name: true } }` — ripristina girone
- `_count: { select: { playerStats: true } }` — solo su POST, evita il crash

## File modificati

| File | Modifica |
|---|---|
| `src/app/api/matches/route.ts` | POST: aggiunge `color`, `group`, `_count` all'include |
| `src/app/api/matches/[matchId]/route.ts` | PUT: aggiunge `color`, `group` al select |

**Diff sintetico:**
```
src/app/api/matches/route.ts            | 5 ++++-
src/app/api/matches/[matchId]/route.ts  | 4 +++-
2 files changed, 7 insertions(+), 2 deletions(-)
```

## Come testare

1. `npm run dev`
2. Login ADMIN → `/admin/partite`
3. Clic "Nuova partita" → compila il form con squadra colorata e girone
4. Salva → la riga appena creata deve mostrare:
   - chip squadra con il colore corretto (non arancione di default)
   - girone nella colonna corrispondente (quando aggiunto)
   - colonna "Stats" deve mostrare "—" senza crash
5. Modifica una partita esistente → cambia girone o avversario
6. Salva → la riga si aggiorna immediatamente con il dato corretto (senza reload)

## Rollback in 1 comando

```bash
git revert HEAD --no-edit
```

## Livello di confidenza

**ALTO** — nessun cambio logico, nessuna modifica al DB, nessuna nuova dipendenza.
Aggiunta di campi al select/include Prisma che erano già presenti nel fetch
server-side della pagina admin. TypeScript `--noEmit` passa senza errori.
