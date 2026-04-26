# CLAUDE_CHANGES — 2026-04-28 06:00

## Cosa ho fatto e perché

**Bug fix: nav dropdown "Partite" non evidenziata su `/gironi/*`**

La condizione `partiteActive` in `SiteHeader.tsx` determinava se il pulsante
dropdown "Partite" nella navbar (desktop e mobile) dovesse essere evidenziato
(bianco/arancione con underline). Includeva correttamente:

- `/risultati` (esatto)
- `/classifiche` (esatto)
- `/partite/*` (via `startsWith`)

Ma **mancava** `/gironi/*`. Le pagine girone (es. `/gironi/abc123`) sono
raggiungibili cliccando "Girone completo" dalla pagina `/classifiche`, che è
sotto il dropdown Partite. Una volta atterrati su `/gironi/[id]`, il pulsante
"Partite" nel nav tornava non-evidenziato, creando disorientamento.

La stessa incongruenza esisteva già per `/partite/*` prima del fix delle 05:00;
quella run ha fixato i dettagli partita ma non ha incluso i gironi.

## File modificati

| File | Modifica |
|---|---|
| `src/components/SiteHeader.tsx` | riga 53: aggiunto `\|\| pathname?.startsWith("/gironi")` |

### Diff sintetico

```diff
- // [CLAUDE - 05:00] include /partite/* so the dropdown is highlighted on match detail pages
- const partiteActive = pathname === "/risultati" || pathname === "/classifiche" || (pathname?.startsWith("/partite") ?? false);
+ // [CLAUDE - 06:00] include /partite/* and /gironi/* so the dropdown is highlighted on detail pages
+ const partiteActive = pathname === "/risultati" || pathname === "/classifiche"
+   || (pathname?.startsWith("/partite") ?? false)
+   || (pathname?.startsWith("/gironi") ?? false);
```

## Come testare

1. Navigare su `/classifiche`
2. Aprire un girone con il pulsante "Girone completo" → si arriva su `/gironi/[id]`
3. ✅ Il pulsante "Partite" nella navbar desktop deve essere bianco+underline arancione
4. Su mobile: aprire il drawer → "Partite" deve avere il bordo arancione e testo evidenziato
5. Il link "Classifiche" nel dropdown deve restare l'unica voce con exact-match, non l'intera sezione gironi

## Come fare rollback

```bash
git revert HEAD --no-edit
```

## Livello di confidenza: ALTO

- Modifica di 2 righe → 4 righe, nessuna logica nuova
- `npx tsc --noEmit` → nessun errore
- Coerente con il pattern già usato per `/partite/*` (introdotto nella run 05:00)
