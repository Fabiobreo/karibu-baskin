# CLAUDE_CHANGES — 2026-04-28 05:00

## Cosa ho fatto e perché

**Cleanup: eliminazione definitiva del dead code "preview ruolo"**

Il `CLAUDE.md` dichiarava già esplicitamente 4 file come "rimosso completamente":

> Preview ruolo: rimosso completamente. File eliminati: `PreviewBanner.tsx`, `PreviewRoleContext.tsx`, `effectiveSession.ts`, `api/admin/preview/route.ts`.

In realtà tutti e quattro i file erano ancora presenti nel repository, senza che nessun altro file li importasse.

**File eliminati:**

| File | Contenuto |
|---|---|
| `src/components/PreviewBanner.tsx` | Banner UI per mostrare il ruolo in preview |
| `src/context/PreviewRoleContext.tsx` | Context React + hook `usePreviewRole()` |
| `src/lib/effectiveSession.ts` | `getEffectiveSession()` che leggeva il cookie `preview_role` |
| `src/app/api/admin/preview/route.ts` | Endpoint `POST/DELETE /api/admin/preview` |

## Verifica

- `grep -rn` → **0 import** dei file eliminati nel resto del codebase
- `npx tsc --noEmit` → **nessun errore**

## Come testare

1. `npx tsc --noEmit` — nessun errore
2. `npm run dev` — app si avvia normalmente
3. Nessuna funzionalità UI cambiata (il feature era già non accessibile)

## Come fare rollback

```bash
git revert HEAD --no-edit
```

## Livello di confidenza: ALTO

- Zero import verificati con grep su tutto src/
- TypeScript passa senza errori
- Nessuna logica attiva modificata
