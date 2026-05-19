# src/app/api — Regole API routes

Tutte le API route Next.js App Router. Una cartella per risorsa, `route.ts` per gli handler HTTP.

## Struttura di una route

Ogni `route.ts` deve seguire questo ordine:

1. **Rate limit** sulle GET pubbliche: `checkRateLimit(getClientIp(req), "key-univoca", limit, windowMs)` → return 429 se `!allowed`.
2. **Auth** sulle mutation: `if (!(await isCoachOrAdmin())) return 401`. Per route admin-only: `isAdminUser()`. Per route user-scoped: `auth()` e poi check su `session.user.id`.
3. **Parsing input** con Zod: `const parsed = XxxSchema.safeParse(raw)` → return 400 con `parsed.error.issues[0]?.message`.
4. **Operazione Prisma** in `try/catch` per intercettare `PrismaClientKnownRequestError` (P2002 = unique violation → 409).
5. **Side effects** (push, notifiche in-app, audit) **fire-and-forget** con `.catch(console.error)` — mai bloccare la risposta.
6. **Response** `NextResponse.json(...)` con status corretto (201 su create, 200 su update/get, 204 o body vuoto su delete).

## Helper obbligatori da `@/lib/`

- `prisma` da `@/lib/db` — singleton, mai re-istanziare.
- `auth` da `@/lib/authjs` — sessione corrente.
- `isCoachOrAdmin`, `isAdminUser` da `@/lib/apiAuth` — auth checks.
- `hasRole` da `@/lib/authRoles` — per check granulari.
- `checkRateLimit`, `getClientIp` da `@/lib/rateLimit` — rate limiting.
- `sendPushToAll`/`sendPushToTeam`/`sendPushToFilter` da `@/lib/webpush`.
- `createAppNotification` da `@/lib/appNotifications`.
- `logAudit` da `@/lib/audit` per azioni admin sensibili.

## Messaggi d'errore

- Tutti in italiano: `"Non autorizzato"`, `"Dati non validi"`, `"Troppe richieste"`, `"Non trovato"`, `"Duplicato"`, ecc.
- Mai esporre stack trace o messaggi Prisma raw al client.

## Validazione

- Schemi Zod **sempre** in `src/lib/schemas/<entity>.ts`, mai inline nella route.
- Uno schema `XxxCreateSchema` e uno `XxxUpdateSchema` (i campi sono `.optional()` nell'update).
- Per body JSON malformato: `await req.json().catch(() => null)` poi safeParse.

## Test

- Tutte le route con logica non banale devono avere `route.test.ts` accanto (Vitest).
- I test mockano Prisma. Esempi esistenti: `src/app/api/sessions/route.test.ts`.

## Cosa NON fare

- **Mai** controlli di ruolo ad-hoc (`if (session.user.appRole === "ADMIN")`) → usare `hasRole()` o gli helper di `apiAuth.ts`.
- **Mai** chiamare le proprie API da un Server Component — andare a Prisma direttamente.
- **Mai** restituire entità Prisma intere se contengono dati sensibili — fare `select` esplicito.
- **Mai** push/notifiche bloccanti (await) — sempre fire-and-forget.
- **Mai** mutare `Json` con `null` JS → usare `Prisma.DbNull`.
- **Mai** dimenticare il rate-limit sulle GET pubbliche (l'app è esposta in chiaro su Vercel).
