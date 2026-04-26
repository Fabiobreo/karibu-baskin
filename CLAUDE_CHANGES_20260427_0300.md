# CLAUDE_CHANGES — 2026-04-27 03:00

## Cosa è stato fatto e perché

L'API `PUT /api/matches/[matchId]/stats` esiste e funziona, ma mancava completamente
una UI admin per usarla. La colonna "Stats" nel pannello partite mostrava solo un contatore
(es. "3 gioc.") senza alcun pulsante per inserire o modificare le statistiche.

Ho aggiunto un nuovo componente `MatchStatsDialog` e l'ho collegato ad `AdminPartiteClient`,
completando il ciclo di gestione partite: crea partita → imposta convocati → inserisci statistiche.

## File modificati

### `src/components/MatchStatsDialog.tsx` (nuovo)
Dialog modale che:
1. Carica i convocati della partita (`GET /api/matches/[matchId]/callups`)
2. Carica le statistiche esistenti (`GET /api/matches/[matchId]/stats`) per pre-compilare
3. Mostra una tabella con un giocatore per riga e input numerici per Pt/Can/Ast/Rim/Fal
4. Su salvataggio, chiama `PUT /api/matches/[matchId]/stats` con il batch completo

### `src/components/AdminPartiteClient.tsx` (modificato)
- Import `MatchStatsDialog` e `LeaderboardIcon`
- Nuovo stato `statsMatch` (stessa logica di `callupMatch`)
- Nuovo `IconButton` con `LeaderboardIcon` nella colonna azioni di ogni riga partita
- Render del dialog con callback `onStatsSaved` che aggiorna il contatore locale `_count.playerStats`

## Come testare

1. `npm run dev`
2. Login come ADMIN o COACH → `/admin/partite`
3. Scegli una partita che ha convocati impostati
4. Clicca l'icona `LeaderboardIcon` (classifica) nella colonna azioni
5. Il dialog mostra i convocati con campi numerici pre-compilati (0 se nuovi)
6. Modifica i valori e clicca "Salva statistiche"
7. Il contatore nella colonna "Stats" si aggiorna immediatamente
8. La pagina pubblica `/partite/[slug]` mostra le statistiche nella sezione "Marcatori"

**Caso senza convocati:** il dialog mostra un messaggio che invita a impostare prima i convocati.

## Rollback in 1 comando

```bash
git revert HEAD --no-edit
```

oppure per eliminare il branch:

```bash
git checkout main && git branch -D feature/claude-2026-04-27-01
```

## Livello di confidenza

**ALTO** — il componente usa lo stesso pattern di `MatchCalloupsDialog` già esistente e
funzionante, chiama API già testate, senza nuove dipendenze. TypeScript passa senza errori.
