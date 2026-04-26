# CLAUDE_CHANGES — 2026-04-27 07:20

## Cosa ho fatto e perché

**Fix bug: `MatchStatsDialog` creava record `PlayerMatchStats` con tutti zeri per i convocati.**

### Problema

Quando il coach apriva il dialog statistiche (`MatchStatsDialog`) per una partita con convocati
ma senza statistiche ancora inserite, tutte le righe venivano pre-popolate a `0`. Se il coach
salvava senza inserire dati (o lo faceva accidentalmente), la API `PUT /api/matches/[matchId]/stats`
creava record `PlayerMatchStats` con tutti i campi a zero per ogni convocato.

Effetti collaterali:
- La colonna "Stats" nella tabella admin mostrava `"N gioc."` invece di `"—"` anche a partita
  non ancora giocata
- La pagina pubblica `/partite/[slug]` mostrava la sezione "Marcatori" con tutti i valori a zero,
  facendo sembrare che le statistiche fossero state registrate quando non lo erano

### Soluzione

In `MatchStatsDialog.tsx`:
1. Aggiunto campo `hasExistingStats: boolean` su `StatRow` — `true` se il record esiste già nel DB
2. In `handleSave`, filtro le righe prima di costruire il payload:
   - `hasExistingStats = true` → incluso sempre (permette di azzerare un valore inserito per errore)
   - `hasExistingStats = false` → incluso solo se almeno un campo è `> 0` oppure ci sono note
3. `onStatsSaved(payload.length)` usa la lunghezza del payload filtrato anziché `rows.length`

## File modificati

### `src/components/MatchStatsDialog.tsx`
- Aggiunto `hasExistingStats: boolean` a `interface StatRow`
- Aggiunto `hasExistingStats: ex !== undefined` nella costruzione dei rows (dentro `callups.map`)
- Modificato `handleSave`: `rows.map(...)` → `rows.filter(...).map(...)` con logica skip
- Corretto `onStatsSaved(rows.length)` → `onStatsSaved(payload.length)`

## Come testare

1. Crea una partita, imposta dei convocati via "Convocati"
2. Apri "Statistiche giocatori" senza inserire nulla → clicca "Salva statistiche"
3. La colonna "Stats" deve mostrare `"—"` (non "N gioc.")
4. La pagina pubblica `/partite/[slug]` non deve mostrare la sezione "Marcatori"
5. Inserisci punti per un solo giocatore → solo quel giocatore compare nelle stats
6. Riapri il dialog, azzera i punti → il record esistente viene aggiornato a 0 (corretto)

## Rollback in 1 comando

```bash
git revert HEAD --no-edit
```

## Livello di confidenza

**ALTO** — fix locale in un singolo componente client-side, nessun effetto su DB o API.
Il filtro è conservativo: include sempre i record esistenti, esclude solo i nuovi record vuoti.
`tsc --noEmit` passa senza errori.
