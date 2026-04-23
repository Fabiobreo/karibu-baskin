# Autenticazione e Ruoli

## Provider e sessioni

L'app usa esclusivamente **Google OAuth** via Auth.js v5. Non esistono password locali.

Flusso login:
1. Utente clicca "Accedi con Google" → reindirizzato a Google
2. Al ritorno, Auth.js cerca un `Account` con `(provider, providerAccountId)` nel DB
3. Se non trovato: crea `User` + `Account` con `appRole = GUEST`
4. Se trovato: aggiorna `name` e `image` dal profilo Google (callback `signIn` in `authjs.ts`)
5. Crea una riga `Session` nel DB (strategy: `database`) valida 1 anno
6. Imposta cookie `authjs.session-token` (dev) / `__Secure-authjs.session-token` (prod)

**Account linking** (`allowDangerousEmailAccountLinking: true`): se un admin pre-crea un utente con quella email, al primo login Google si collega automaticamente senza creare un duplicato.

## Ruoli applicativi (`AppRole`)

| Ruolo | Livello | Chi è |
|-------|---------|-------|
| `GUEST` | 0 | Nuovo iscritto, in attesa di classificazione |
| `ATHLETE` | 1 | Atleta con ruolo Baskin confermato |
| `PARENT` | 2 | Genitore che gestisce figli senza account |
| `COACH` | 3 | Allenatore — accede al pannello admin |
| `ADMIN` | 4 | Amministratore completo |

La gerarchia è definita in `src/lib/authRoles.ts`. La funzione `hasRole(user, minRole)` restituisce `true` se il livello dell'utente è ≥ `minRole`.

## Protezione delle route

### API routes
```typescript
// src/lib/apiAuth.ts
isCoachOrAdmin()  // COACH o superiore
isAdminUser()     // solo ADMIN
```

### Layout / pagine (Server Component)
```typescript
const session = await auth(); // da src/lib/authjs.ts
if (!session?.user?.id) redirect("/login");
if (session.user.appRole !== "ADMIN") redirect("/");
```

### Middleware (`src/proxy.ts`)
Il middleware ha matcher vuoto — non esegue autenticazione (Edge Runtime non supporta Prisma). Tutta la protezione avviene nei layout e nelle API route.

## Ruolo sportivo vs ruolo applicativo

Sono due concetti distinti:

- **`appRole`**: gestione accessi nell'app (chi può fare cosa)
- **`sportRole` (1–5)**: ruolo nel gioco del Baskin (R1–R5)

Un `COACH` ha `appRole = COACH` ma può avere anche un `sportRole` se gioca come atleta.

Un nuovo utente ha `appRole = GUEST` e `sportRole = null`. Al primo allenamento compila il questionario → viene salvato `sportRoleSuggested`. Un admin/coach lo conferma → aggiornato `sportRole` e loggato in `SportRoleHistory`.

## Sessione nella sessione di test (solo dev)

Con `ENABLE_TEST_LOGIN=true`, l'endpoint `POST /api/test-login` crea manualmente una riga `Session` nel DB e imposta il cookie via `res.headers.set("Set-Cookie", ...)` (workaround bug Turbopack — `NextResponse.cookies.set()` non funziona in dev).
