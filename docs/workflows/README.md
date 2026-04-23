# Karibu Baskin — Workflow Documentation

Documentazione dei flussi principali dell'applicazione.

## Indice

| File | Argomento |
|------|-----------|
| [01-auth-ruoli.md](./01-auth-ruoli.md) | Autenticazione, ruoli applicativi, gerarchia permessi |
| [02-allenamenti.md](./02-allenamenti.md) | Ciclo di vita di un allenamento (creazione → iscrizioni → squadre) |
| [03-iscrizioni.md](./03-iscrizioni.md) | Flusso iscrizione (utente / figlio / anonimo), restrizioni |
| [04-generazione-squadre.md](./04-generazione-squadre.md) | Algoritmo di generazione squadre bilanciate |
| [05-notifiche.md](./05-notifiche.md) | Sistema notifiche push + in-app, preferenze granulari |
| [06-genitore-figlio.md](./06-genitore-figlio.md) | Gestione figli, collegamento account, rivendicazione iscrizioni anonime |
| [07-squadre-partite.md](./07-squadre-partite.md) | Squadre agonistiche, partite ufficiali, statistiche |
| [08-admin.md](./08-admin.md) | Pannello admin: utenti, allenamenti, restrizioni, partite |

## Stack di riferimento rapido

- **Framework**: Next.js 16, App Router, Server Components + Client Components
- **DB**: PostgreSQL (Neon) + Prisma ORM v6
- **Auth**: Auth.js v5, Google OAuth, sessioni DB (1 anno)
- **UI**: Material UI v6, tema arancione/nero
- **Deploy**: Vercel (branch `develop` → preview, `main` → production)
- **Push**: Web Push API + VAPID

## Ruoli (gerarchia crescente)

```
GUEST(0) < ATHLETE(1) < PARENT(2) < COACH(3) < ADMIN(4)
```

## Modelli Prisma chiave

```
User ──< Registration >── TrainingSession
User ──< Child ──< Registration
User ──< TeamMembership >── CompetitiveTeam
CompetitiveTeam ──< Match >── OpposingTeam
Match ──< PlayerMatchStats >── User | Child
User ──< PushSubscription
AppNotification ──< AppNotificationRead >── User
```
