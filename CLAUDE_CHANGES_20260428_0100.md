# CLAUDE_CHANGES — 2026-04-28 01:00

## Cosa è stato fatto e perché

### DX: Auto-calcolo esito partita + errore API leggibile nel form admin

**Problema 1 — Doppio lavoro e errore silenzioso:**
Nel dialog "Nuova/Modifica partita" di `/admin/partite`, l'admin doveva:
1. Inserire i punteggi (es. 72–68)
2. Selezionare manualmente l'esito (Vittoria / Sconfitta / Pareggio)

Se i due valori non concordavano (es. punteggio 72–68 ma esito "Sconfitta"), il server
restituiva un errore dettagliato come:
> `Il risultato LOSS non corrisponde al punteggio (72–68 → WIN)`

Ma il client lo ignorava e mostrava solo `"Errore nel salvataggio"`, senza spiegare il
perché.

**Fix 1 — Auto-derivazione client-side:**
Quando l'admin inserisce entrambi i punteggi, il campo "Esito" si aggiorna
automaticamente:
- `ourScore > theirScore` → WIN (Vittoria)
- `ourScore < theirScore` → LOSS (Sconfitta)
- `ourScore === theirScore` → DRAW (Pareggio)

L'admin può comunque sovrascrivere manualmente (il select rimane editabile).

**Fix 2 — Errore API leggibile:**
Se il server restituisce un errore (es. validazione schema, mismatch residuo),
il messaggio specifico viene ora estratto dalla response JSON e mostrato nell'Alert
invece del generico "Errore nel salvataggio".

## File modificati

| File | Modifica |
|---|---|
| `src/components/AdminPartiteClient.tsx` | Aggiunge `deriveResultFromScores()`, aggiorna i due `onChange` dei punteggi, mostra errore API specifico |

**Diff sintetico:**
```
src/components/AdminPartiteClient.tsx | 41 ++++++++++++++++++--
1 file changed, 38 insertions(+), 3 deletions(-)
```

## Come testare

1. `npm run dev`
2. Login ADMIN → `/admin/partite`
3. Clic "Nuova partita"
4. Compila data e squadre
5. Inserisci "Nostri punti": `72` → il campo Esito rimane vuoto (manca il secondo)
6. Inserisci "Punti avversario": `68` → il campo Esito si auto-imposta su **Vittoria**
7. Cambia "Nostri punti" a `60` → Esito diventa **Sconfitta**
8. Pareggio: inserisci `50` e `50` → Esito = **Pareggio**
9. Salva → nessun errore di mismatch
10. Per testare l'errore leggibile: imposta manualmente Esito = "Vittoria" con punteggio
    60-80 (solo se hai modificato il fix temporaneamente) → mostra il messaggio del server

## Rollback in 1 comando

```bash
git revert HEAD --no-edit
```

## Livello di confidenza

**ALTO** — nessun cambio logico lato server, nessuna modifica DB, nessuna nuova
dipendenza. La `deriveResultFromScores()` è identica alla logica già presente in
`src/app/api/matches/[matchId]/route.ts` (`deriveResult()`). TypeScript passa pulito.
