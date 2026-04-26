# CLAUDE_CHANGES — 2026-04-28 03:00

## Cosa è stato fatto e perché

**Bug fix:** La pagina `/classifiche` mostrava i punti calcolati con la formula **V×2 + P** (sistema 2-1-0), mentre la pagina `/gironi/[id]` e la route API `/api/groups/[groupId]` usano **V×3 + P** (sistema 3-1-0). Questa inconsistenza causava punti errati nella colonna "Pt" del riepilogo per girone sulla pagina classifiche.

**Cleanup:** Il loop "partite nostre" nella route GET `/api/groups/[groupId]/route.ts` conteneva un ternario morto:
```js
const [ourGF, ourGA] = m.isHome
  ? [m.ourScore, m.theirScore]
  : [m.ourScore, m.theirScore]; // entrambi i rami identici!
```
Entrambi i rami producevano lo stesso risultato (corretto) perché `ourScore` è già relativo a "noi", non al team in casa. Rimosso il ternario e usati i valori direttamente.

## File modificati

| File | Modifica |
|------|----------|
| `src/app/classifiche/page.tsx` | riga 162: `wins * 2 + draws` → `wins * 3 + draws` |
| `src/app/api/groups/[groupId]/route.ts` | righe 59-63: rimosso ternario `isHome` ridondante |

## Come testare

1. `/classifiche` — crea un girone con 1 vittoria e 0 pareggi: il campo "Pt" deve mostrare **3** (non 2)
2. `/gironi/[id]` — la classifica completa mostra già 3 punti per vittoria: deve essere coerente con `/classifiche`
3. Nessuna regressione sui calcoli classifica del girone (la logica del route è invariata funzionalmente)

## Rollback in 1 comando

```bash
git revert HEAD --no-edit
```

## Livello di confidenza

**ALTO** — il bug era chiaramente visibile dal confronto diretto tra i due file; il fix è una modifica di 1 riga. Il cleanup del dead code non cambia il comportamento (entrambi i rami erano già identici e corretti).
