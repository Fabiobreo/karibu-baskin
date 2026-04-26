# CLAUDE_CHANGES — 2026-04-28 07:00

## Cosa ho fatto e perché

**Bug fix: click sulle righe partita non funzionava nella pagina girone (`/gironi/[groupId]`)**

In `src/app/gironi/[groupId]/page.tsx` (Server Component — nessun `"use client"`),
le righe delle "nostre" partite usavano:

```tsx
<TableRow onClick={() => { if (typeof window !== "undefined") window.location.href = href; }} sx={{ cursor: "pointer" }}>
```

Questo pattern **non funziona in React Server Components**: gli event handler
(`onClick`, `onChange`, ecc.) non vengono serializzati nell'output RSC e quindi
non vengono mai idratati/collegati al DOM sul client. Il risultato: il cursore
mostra `pointer` (effetto hover MUI attivo grazie al CSS iniettato dal server),
ma il click è silenzioso — nessuna navigazione.

La guardia `typeof window !== "undefined"` è il segnale diagnostico: è il classico
pattern "difensivo SSR", che suggerisce che l'autore sapeva che il codice poteva
girare sul server, ma non considerava la differenza tra SSR tradizionale (dove il
JS viene poi idratato) e RSC (dove il JS del Server Component non arriva al client).

**Soluzione:** estratto un piccolo componente client `GironeOurMatchRow.tsx` che usa
`useRouter()` per la navigazione. Il Server Component importa questo wrapper solo
per le righe delle proprie partite. Le righe delle partite esterne (non cliccabili)
restano come `TableRow` standard nel Server Component.

## File modificati

| File | Modifica |
|---|---|
| `src/components/GironeOurMatchRow.tsx` | **Nuovo** — client component wrapper per righe cliccabili |
| `src/app/gironi/[groupId]/page.tsx` | Import `GironeOurMatchRow`; sostituito `<TableRow onClick...>` con `<GironeOurMatchRow href={href}>` |

### Diff sintetico

**GironeOurMatchRow.tsx (nuovo):**
```tsx
"use client";
import { useRouter } from "next/navigation";
import { TableRow } from "@mui/material";
import type { ReactNode } from "react";

export default function GironeOurMatchRow({ href, children }: { href: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <TableRow hover onClick={() => router.push(href)} sx={{ cursor: "pointer" }}>
      {children}
    </TableRow>
  );
}
```

**gironi/[groupId]/page.tsx:**
```diff
+ import GironeOurMatchRow from "@/components/GironeOurMatchRow";
  ...
- <TableRow key={m.id} hover onClick={() => { if (typeof window !== "undefined") window.location.href = href; }} sx={{ cursor: "pointer" }}>
+ <GironeOurMatchRow key={m.id} href={href}>
  ...
- </TableRow>
+ </GironeOurMatchRow>
```

## Come testare

1. Navigare su `/classifiche`
2. Aprire un girone con "Girone completo" → `/gironi/[id]`
3. Sezione "Calendario" → riga con sfondo colorato (nostra partita)
4. ✅ Click sulla riga deve navigare su `/partite/[slug]`
5. ✅ Il comportamento hover (sfondo grigio chiaro) deve funzionare come prima
6. ✅ Le righe delle partite esterne (senza cursore pointer) non devono essere cliccabili — invariato

**Prima del fix:** cursor mostra puntatore, hover applica sfondo, ma il click non fa nulla.
**Dopo il fix:** click naviga correttamente alla pagina dettaglio partita.

## Come fare rollback

```bash
git revert HEAD --no-edit
# oppure
git checkout feature/claude-2026-04-28-06 -- src/app/gironi/\[groupId\]/page.tsx
rm src/components/GironeOurMatchRow.tsx
```

## Livello di confidenza: ALTO

- Pattern corretto (uguale a `GironeMatchList.tsx` che usa già `useRouter` in un client component)
- `npx tsc --noEmit` → nessun errore
- Modifica minimale: 1 file nuovo (15 righe), 2 righe cambiate nella pagina
- La distinzione RSC/Client è documentata nel Next.js docs e nel CLAUDE.md del progetto
