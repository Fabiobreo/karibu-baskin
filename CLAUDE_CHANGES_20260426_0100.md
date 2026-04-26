# CLAUDE_CHANGES_20260426_0100

## Cosa e perché

Le righe della tabella partite in `/classifiche` (componente `GironeMatchList`) non erano cliccabili, mentre **ogni altro elenco partite nell'app** (pagina `/risultati`, card in `/squadre/[season]/[slug]`) lo è diventato nelle ultime sessioni. Incoerenza evidente: l'utente si aspetta di poter aprire il dettaglio di una partita da qualsiasi lista.

## File modificati

### `src/app/classifiche/page.tsx` (riga 40)
- Aggiunto `slug: true` alla `select` delle `matches` dentro `groupsQuery`.
- **Diff**: `id: true, date: true` → `id: true, slug: true, date: true`

### `src/components/GironeMatchList.tsx`
- Aggiunto `slug: string | null` all'interfaccia `GironeMatchItem`.
- Aggiunto import `Link` da `next/link` e `ChevronRightIcon` da MUI.
- `<TableRow>` ora usa `component={Link} href={href}` (pattern identico a `ClassificaTableClient.tsx`).
- Aggiunta colonna vuota nell'intestazione + cella `ChevronRight` al fondo di ogni riga per segnalare la navigabilità.

## Come testare

1. `npm run dev`
2. Aprire `/classifiche`
3. Se ci sono partite nei gironi, le righe nella tabella "Partite del girone" sono ora cliccabili → aprono `/partite/[slug]`
4. Hover mostra background highlight (già gestito da `hover` su `TableRow`)
5. `ChevronRight` visibile a destra di ogni riga

## Rollback in 1 comando

```bash
git revert HEAD --no-edit
```

## Livello di confidenza

**ALTO** — modifica minimale (2 file), pattern già usato identicamente in `ClassificaTableClient.tsx`. TypeScript `--noEmit` passato senza errori.
